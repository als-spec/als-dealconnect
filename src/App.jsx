import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import Layout from "./components/Layout";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/admin/Applications";
import Members from "./pages/admin/Members";
import ComingSoon from "./pages/ComingSoon";
import TCProfilePage from "./pages/TCProfilePage";
import InvestorProfilePage from "./pages/InvestorProfilePage";
import TCDirectory from "./pages/TCDirectory";
import PMLProfilePage from "./pages/PMLProfilePage";
import PMLDirectory from "./pages/PMLDirectory";
import DealBoard from "./pages/DealBoard";
import Messages from "./pages/Messages";
import ServiceRequests from "./pages/ServiceRequests";
import LandingPage from "./pages/LandingPage";
import PartnersPage from "./pages/PartnersPage";
import AdminPartners from "./pages/admin/Partners";
import InvestorDirectory from "./pages/InvestorDirectory";
import SupportTickets from "./pages/SupportTickets";
import AdminSupportTickets from "./pages/admin/SupportTickets";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Only fetch the user once the auth preflight is done and there's no authError.
  // react-query dedupes this across the app — every other page/useCurrentUser()
  // call will hit the same cache entry.
  const { data: user, isLoading: loadingUser } = useCurrentUser({
    enabled: !isLoadingAuth && !isLoadingPublicSettings && !authError,
  });

  if (isLoadingPublicSettings || isLoadingAuth || loadingUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  const publicPaths = ["/", "/partners"];
  const currentPath = window.location.pathname;

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      if (publicPaths.includes(currentPath)) {
        return (
          <Routes>
            <Route path="/" element={<LandingPage user={null} />} />
            <Route path="/partners" element={<PartnersPage user={null} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        );
      }
      navigateToLogin();
      return null;
    }
  }

  // Only admin users or fully approved members (valid role + onboarding complete) can access the app
  const validMemberRoles = ["tc", "investor", "pml", "admin"];
  const hasValidRole = validMemberRoles.includes(user?.role);
  const needsOnboarding = !hasValidRole || (user?.role !== "admin" && user?.onboarding_step !== "approved");

  if (needsOnboarding) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage user={user} />} />
        <Route path="/partners" element={<PartnersPage user={user} />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage user={user} />} />
      <Route path="/partners" element={<PartnersPage user={user} />} />
      <Route element={<Layout user={user} />}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Admin routes */}
        {user?.role === "admin" && (
          <>
            <Route path="/admin/applications" element={<Applications />} />
            <Route path="/admin/members" element={<Members />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
            <Route path="/admin/support" element={<AdminSupportTickets />} />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/settings" element={<ComingSoon title="Platform Settings" />} />
            <Route path="/profile/tc" element={<TCProfilePage />} />
            <Route path="/profile/pml" element={<PMLProfilePage />} />
            <Route path="/tc-directory" element={<TCDirectory />} />
            <Route path="/investor-directory" element={<InvestorDirectory />} />
            <Route path="/pml-directory" element={<PMLDirectory />} />
          </>
        )}

        {/* TC routes */}
        {user?.role === "tc" && (
          <>
            <Route path="/deal-board" element={<DealBoard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/analytics" element={<ComingSoon title="Analytics" />} />
            <Route path="/support" element={<SupportTickets />} />
            <Route path="/profile" element={<TCProfilePage />} />
            <Route path="/tc-directory" element={<TCDirectory />} />
            <Route path="/investor-directory" element={<InvestorDirectory />} />
            <Route path="/pml-directory" element={<PMLDirectory />} />
            <Route path="/profile/pml" element={<PMLProfilePage />} />
          </>
        )}

        {/* Investor routes */}
        {user?.role === "investor" && (
          <>
            <Route path="/deal-board" element={<DealBoard />} />
            <Route path="/tc-directory" element={<TCDirectory />} />
            <Route path="/investor-directory" element={<InvestorDirectory />} />
            <Route path="/pml-directory" element={<PMLDirectory />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/support" element={<SupportTickets />} />
            <Route path="/profile" element={<InvestorProfilePage />} />
            <Route path="/profile/tc" element={<TCProfilePage />} />
            <Route path="/profile/pml" element={<PMLProfilePage />} />
          </>
        )}

        {/* PML routes */}
        {user?.role === "pml" && (
          <>
            <Route path="/pipeline" element={<ComingSoon title="Pipeline" />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/analytics" element={<ComingSoon title="Analytics" />} />
            <Route path="/support" element={<SupportTickets />} />
            <Route path="/profile" element={<PMLProfilePage />} />
            <Route path="/tc-directory" element={<TCDirectory />} />
            <Route path="/investor-directory" element={<InvestorDirectory />} />
            <Route path="/pml-directory" element={<PMLDirectory />} />
            <Route path="/profile/tc" element={<TCProfilePage />} />
            <Route path="/profile/pml" element={<PMLProfilePage />} />
          </>
        )}

        <Route path="*" element={<PageNotFound />} />
      </Route>
      <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ErrorBoundary>
            <AuthenticatedApp />
          </ErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;