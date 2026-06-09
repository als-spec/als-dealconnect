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
import ProtectedRoute from "@/components/ProtectedRoute";
import { base44 } from "@/api/base44Client";

import Layout from "./components/Layout";
import Onboarding from "./pages/Onboarding";
import LandingPage from "./pages/LandingPage";
import PartnersPage from "./pages/PartnersPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  const { data: user, isLoading: loadingUser } = useCurrentUser({
    enabled: !isLoadingAuth && !isLoadingPublicSettings && !authError && isAuthenticated,
  });

  if (isLoadingPublicSettings || isLoadingAuth || (isAuthenticated && loadingUser)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  // Only admin users or fully approved members can access the app
  const validMemberRoles = ["tc", "investor", "pml", "admin"];
  const hasValidRole = validMemberRoles.includes(user?.role);
  const isSuspended = isAuthenticated && user?.member_status === "suspended";
  const needsOnboarding = isAuthenticated && !isSuspended && (!hasValidRole || (user?.role !== "admin" && user?.onboarding_step !== "approved"));

  // Role-scoped authenticated routes
  const userRoutes = user ? routesForRole(user.role) : [];

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public marketing routes */}
      <Route path="/" element={<LandingPage user={user} />} />
      <Route path="/partners" element={<PartnersPage user={user} />} />

      {/* Suspended users — show a simple blocked message */}
      {isSuspended && (
        <Route path="*" element={
          <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
            <div className="max-w-md text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">🚫</span>
              </div>
              <h1 className="text-2xl font-bold text-navy">Account Suspended</h1>
              <p className="text-muted-foreground">Your account has been suspended. Please contact <a href="mailto:support@alsdealflow.com" className="text-teal underline">support@alsdealflow.com</a> for assistance.</p>
              <button onClick={() => base44.auth.logout()} className="text-sm text-muted-foreground underline">Sign out</button>
            </div>
          </div>
        } />
      )}

      {/* Onboarding — requires auth but not full approval */}
      {!isSuspended && (
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route
          path="/onboarding"
          element={needsOnboarding ? <Onboarding /> : <Navigate to="/dashboard" replace />}
        />
      </Route>
      )}

      {/* App routes — requires auth + approved */}
      {!isSuspended && (
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {needsOnboarding ? (
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        ) : (
          <Route element={<Layout user={user} />}>
            {userRoutes.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
            <Route path="*" element={<PageNotFound />} />
          </Route>
        )}
      </Route>
      )}
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