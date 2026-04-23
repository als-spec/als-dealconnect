import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import DealCard from "@/components/deals/DealCard";
import DealFilters from "@/components/deals/DealFilters";
import DealDetailModal from "@/components/deals/DealDetailModal";
import PostDealForm from "@/components/deals/PostDealForm";
import MatchCard from "@/components/deals/MatchCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Briefcase, Layers } from "lucide-react";

const EMPTY_FILTERS = { search: "", property_type: "all", deal_type: "all", state: "all", status: "all" };

export default function DealBoard() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [activeTab, setActiveTab] = useState("board"); // board | matches (investor only)

  // All deals (newest first). Used by every role for the main board.
  const { data: deals = [], isLoading: loadingDeals } = useQuery({
    queryKey: ['Deal', 'list', { sort: '-created_date', limit: 100 }],
    queryFn: () => base44.entities.Deal.list("-created_date", 100),
    enabled: !!user,
  });

  // Investor-only: their own deals' applications. Derived myDeals gates the fetch.
  const myDeals = useMemo(
    () => (user?.role === "investor" ? deals.filter(d => d.investor_id === user.id) : []),
    [deals, user]
  );

  const { data: allApplications = [] } = useQuery({
    queryKey: ['DealApplication', 'list', { sort: '-created_date', limit: 200 }],
    queryFn: () => base44.entities.DealApplication.list("-created_date", 200),
    enabled: user?.role === "investor" && myDeals.length > 0,
  });

  const applications = useMemo(() => {
    if (user?.role !== "investor") return [];
    const dealIds = new Set(myDeals.map(d => d.id));
    return allApplications.filter(a => dealIds.has(a.deal_id));
  }, [allApplications, myDeals, user]);

  // TC profiles used for match-card display. Shape differs by role:
  //   - TC: just their own profile, keyed by user.id
  //   - Investor: one profile per unique tc_id across their pending applications
  // Combined into a single query with role-aware fetching so consumers just
  // index into tcProfiles by either user.id (TC) or tc_profile_id (investor).
  const { data: tcProfiles = {} } = useQuery({
    queryKey: [
      'TCProfile',
      'dealboard',
      user?.role,
      user?.role === "tc" ? user.id : applications.map(a => a.tc_id).filter(Boolean).sort(),
    ],
    queryFn: async () => {
      if (user?.role === "tc") {
        const profiles = await base44.entities.TCProfile.filter({ user_id: user.id });
        return profiles[0] ? { [user.id]: profiles[0] } : {};
      }
      // Investor path: fetch one profile per unique tc_id from their applications.
      const seen = new Set();
      const map = {};
      for (const app of applications) {
        if (app.tc_profile_id && app.tc_id && !seen.has(app.tc_id)) {
          seen.add(app.tc_id);
          const profiles = await base44.entities.TCProfile.filter({ user_id: app.tc_id });
          if (profiles[0]) map[app.tc_profile_id] = profiles[0];
        }
      }
      return map;
    },
    enabled: !!user && (user.role === "tc" || (user.role === "investor" && applications.length > 0)),
  });

  const loading = !user || loadingDeals;

  // After any deal mutation (close, apply, create/edit), refresh the deal cache.
  // Invalidating the broad ['Deal'] / ['DealApplication'] keys catches list and
  // filter queries alike.
  const refreshDealBoard = () => {
    queryClient.invalidateQueries({ queryKey: ['Deal'] });
    queryClient.invalidateQueries({ queryKey: ['DealApplication'] });
  };

  const filteredDeals = deals.filter(d => {
    if (user?.role === "tc" && (d.status === "closed")) return false;
    const { search, property_type, deal_type, state, status } = filters;
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase()) && !d.property_address?.toLowerCase().includes(search.toLowerCase())) return false;
    if (property_type && property_type !== "all" && d.property_type !== property_type) return false;
    if (deal_type && deal_type !== "all" && d.deal_type !== deal_type) return false;
    if (state && state !== "all" && d.state !== state) return false;
    if (status && status !== "all" && d.status !== status) return false;
    return true;
  });

  const pendingApps = applications.filter(a => a.status === "pending");

  const handleClosePost = async (deal) => {
    await base44.entities.Deal.update(deal.id, { status: "closed" });
    refreshDealBoard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  const isInvestor = user?.role === "investor";
  const isTC = user?.role === "tc";

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-teal" />
            Deal Board
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isInvestor ? "Post deal coordination requests and review TC applications." : "Browse open deals and submit your interest."}
          </p>
        </div>
        {isInvestor && (
          <Button onClick={() => setShowPostForm(true)} className="gradient-primary text-white hover:opacity-90 gap-2">
            <Plus className="w-4 h-4" /> Post a Deal
          </Button>
        )}
      </div>

      {/* Investor tabs */}
      {isInvestor && (
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {[
            { key: "board", label: "Deal Board" },
            { key: "matches", label: `My Matches${pendingApps.length > 0 ? ` (${pendingApps.length})` : ""}` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Matches tab */}
      {isInvestor && activeTab === "matches" && (
        <div className="space-y-4">
          {myDeals.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Post a deal to start receiving TC applications.</div>
          ) : (
            myDeals.map(deal => {
              const dealApps = applications.filter(a => a.deal_id === deal.id);
              if (dealApps.length === 0) return null;
              return (
                <div key={deal.id}>
                  <h3 className="font-semibold text-foreground mb-3 text-sm">{deal.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dealApps.map(app => (
                      <MatchCard
                        key={app.id}
                        application={app}
                        tcProfile={tcProfiles[app.tc_profile_id] || tcProfiles[app.tc_id]}
                        onUpdate={refreshDealBoard}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
          {applications.length === 0 && myDeals.length > 0 && (
            <div className="text-center py-16 text-muted-foreground">No TC applications yet. Check back soon!</div>
          )}
        </div>
      )}

      {/* Board tab */}
      {(!isInvestor || activeTab === "board") && (
        <>
          <DealFilters filters={filters} onChange={setFilters} onClear={() => setFilters(EMPTY_FILTERS)} />

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""}</span>
            {isInvestor && myDeals.length > 0 && (
              <span className="text-teal font-medium">{myDeals.length} posted by you</span>
            )}
          </div>

          {filteredDeals.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No deals found</p>
              <p className="text-sm mt-1">Try adjusting your filters{isInvestor ? " or post the first deal" : ""}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredDeals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  userRole={user?.role}
                  onView={setSelectedDeal}
                  onEdit={d => { setEditDeal(d); setShowPostForm(true); }}
                  onClose={handleClosePost}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Deal detail modal */}
      <DealDetailModal
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        userRole={user?.role}
        userId={user?.id}
        userName={user?.full_name}
        tcProfileId={user?.id}
        onApplied={() => { setSelectedDeal(null); refreshDealBoard(); }}
      />

      {/* Post/Edit deal dialog */}
      <Dialog open={showPostForm} onOpenChange={v => { if (!v) { setShowPostForm(false); setEditDeal(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDeal ? "Edit Deal" : "Post a New Deal"}</DialogTitle>
          </DialogHeader>
          <PostDealForm
            user={user}
            editDeal={editDeal}
            onSave={() => { setShowPostForm(false); setEditDeal(null); refreshDealBoard(); }}
            onCancel={() => { setShowPostForm(false); setEditDeal(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}