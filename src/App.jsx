import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings) {
      if (authError) {
        setLoadingUser(false);
      } else {
        base44.auth.me()
          .then((u) => { setUser(u); setLoadingUser(false); })
          .catch(() => { setLoadingUser(false); });
      }
    }
  }, [isLoadingAuth, isLoadingPublicSettings, authError]);

  if (isLoadingPublicSettings || isLoadingAuth || loadingUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  // Check if user needs onboarding
  const needsOnboarding = !user?.role || user.role === "pending" ||
    (user.onboarding_step && user.onboarding_step !== "approved" && user.role !== "admin");

  if (needsOnboarding) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/partners" element={<PartnersPage />} />
      <Route element={<Layout user={user} />}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Admin routes */}
        {user?.role === "admin" && (
          <>
            <Route path="/admin/applications" element={<Applications />} />
            <Route path="/admin/members" element={<Members />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;