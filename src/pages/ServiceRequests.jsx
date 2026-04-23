import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

import RequestList from "@/components/service-requests/RequestList";
import RequestDetail from "@/components/service-requests/RequestDetail";
import NewRequestModal from "@/components/service-requests/NewRequestModal";

/**
 * ServiceRequests page — thin orchestrator composing three focused
 * components:
 *   - RequestList      (sidebar)
 *   - RequestDetail    (detail pane, composes DocumentsSection + CommentsSection)
 *   - NewRequestModal  (create flow)
 *
 * This component holds only the top-level coordination state:
 *   - which request is selected
 *   - whether the mobile detail pane is showing
 *   - whether the new-request modal is open
 *
 * Data flow:
 *   - Two useQuery calls (ServiceRequest list, role-scoped counterparty User list)
 *   - Children mutate via base44 SDK and invalidate ['ServiceRequest'] to
 *     refresh this list. onRequestUpdated callback from detail pane also
 *     syncs the `selected` reference so the detail view updates without
 *     waiting for the list refetch.
 */
export default function ServiceRequests() {
  const { data: user } = useCurrentUser();
  const [selected, setSelected] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // All service requests. Role-scoped filter applied client-side because
  // Base44's single-key filter can't express "tc_id = X OR investor_id = X"
  // — we have to fetch and filter.
  const { data: allRequests = [] } = useQuery({
    queryKey: ['ServiceRequest', 'list', { sort: '-created_date', limit: 200 }],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date', 200),
    enabled: !!user?.id,
  });

  const requests = useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") return allRequests;
    return allRequests.filter(r => r.tc_id === user.id || r.investor_id === user.id);
  }, [allRequests, user]);

  // Counterparties for the new-request modal. Role-scoped server-side
  // (from T2.3): TCs see investors, investors see TCs, admins see all
  // approved members.
  //
  // The queryKey includes the user's role so the cache key changes when
  // the role does (e.g., after an admin-initiated role change). Without
  // this, a role change wouldn't flip the visible counterparty list until
  // a manual invalidation.
  const counterpartyFilter = useMemo(() => {
    if (user?.role === "tc") return { role: "investor" };
    if (user?.role === "investor") return { role: "tc" };
    return { member_status: "approved" };
  }, [user?.role]);

  const { data: allCounterparties = [] } = useQuery({
    queryKey: ['User', counterpartyFilter],
    queryFn: () => base44.entities.User.filter(counterpartyFilter),
    enabled: !!user?.id,
  });

  const counterparties = useMemo(
    () => (user ? allCounterparties.filter(u => u.id !== user.id) : []),
    [allCounterparties, user]
  );

  const handleSelectRequest = (request) => {
    setSelected(request);
    setShowMobileDetail(true);
  };

  // When a child component mutates the selected request (advanceStatus,
  // addComment, uploadDocument), it returns the updated record — we sync
  // `selected` so the detail pane reflects the change immediately without
  // waiting for the list query to refetch.
  const handleRequestUpdated = (updatedRequest) => {
    setSelected(updatedRequest);
  };

  const handleRequestCreated = (request) => {
    setShowNew(false);
    setSelected(request);
    setShowMobileDetail(true);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
      <RequestList
        requests={requests}
        currentUserRole={user?.role}
        selectedRequestId={selected?.id}
        onSelectRequest={handleSelectRequest}
        onNewRequest={() => setShowNew(true)}
        className={cn(
          "w-full md:w-80 lg:w-96 border-r border-border flex-shrink-0",
          showMobileDetail && "hidden md:flex"
        )}
      />

      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        !showMobileDetail && "hidden md:flex"
      )}>
        <RequestDetail
          request={selected}
          currentUser={user}
          onBackMobile={() => setShowMobileDetail(false)}
          onRequestUpdated={handleRequestUpdated}
        />
      </div>

      <NewRequestModal
        open={showNew}
        onClose={() => setShowNew(false)}
        counterparties={counterparties}
        currentUser={user}
        onRequestCreated={handleRequestCreated}
      />
    </div>
  );
}
