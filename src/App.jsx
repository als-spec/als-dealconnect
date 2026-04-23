import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { routesForRole } from "@/lib/routes";

import Layout from "./components/Layout";
import Onboarding from "./pages/Onboarding";
import LandingPage from "./pages/LandingPage";
import PartnersPage from "./pages/PartnersPage";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Fetch the user once the auth preflight is done and there's no authError.
  // AuthContext's checkUserAuth pre-warms the react-query cache on successful
  // bootstrap (via queryClientInstance.setQueryData), so this useCurrentUser
  // call will hit the cache immediately on first render — no redundant
  // base44.auth.me() fetch. Every other page's useCurrentUser() hits the
  // same cache entry.
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

  // Role-scoped authenticated routes — see src/lib/routes.jsx for the
  // permission matrix. routesForRole returns only the entries visible to
  // the current user's role.
  const userRoutes = routesForRole(user?.role);

  return (
    <Routes>
      <Route path="/" element={<LandingPage user={user} />} />
      <Route path="/partners" element={<PartnersPage user={user} />} />
      <Route element={<Layout user={user} />}>
        {userRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
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
