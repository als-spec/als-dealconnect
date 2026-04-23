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

  // Paths accessible to unauthenticated visitors when the app's auth
  // preflight returns auth_required.
  //
  // /onboarding is NOT in this list. Even though it's the destination
  // of every landing-page CTA, unauthenticated users can't complete
  // the flow — every step handler (handleMemberTypeNext,
  // handlePlanNext, handleNDAAccept, etc.) calls base44.auth.updateMe
  // which requires a valid session. Letting unauthenticated users
  // reach /onboarding results in cascading 403s and a page that
  // renders but can't advance.
  //
  // The correct flow for new users:
  //   1. Click 'I'm a TC' → navigates to /onboarding?type=tc
  //   2. App hits this branch: /onboarding not in publicPaths
  //   3. navigateToLogin() redirects to Base44's login page
  //   4. Base44's login page has 'Continue with Google' + email/password
  //      + 'Need an account? Sign up' link
  //   5. User signs up or signs in; Base44 preserves ?type=tc via from_url
  //   6. User returns authenticated → /onboarding renders → step handlers
  //      work because user is now authenticated.
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
