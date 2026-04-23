import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { queryClientInstance } from '@/lib/query-client';

/**
 * Bootstrap context for the app's authentication/public-settings preflight.
 *
 * This provider runs a two-step sequence on mount:
 *   1. Fetch app public_settings (with token header if one is available).
 *      This tells us whether auth is required, whether the user is
 *      registered, etc.
 *   2. If step 1 succeeded AND a token is present, validate the current
 *      user via base44.auth.me(). On success, prime the react-query cache
 *      so the rest of the app's useCurrentUser() calls hit the cache
 *      instead of re-fetching.
 *
 * The provider exposes only what App.jsx actually consumes:
 *   - isLoadingPublicSettings, isLoadingAuth — gating flags for the shell
 *   - authError — routes to UserNotRegisteredError / login redirect
 *   - navigateToLogin — explicit redirect helper
 *
 * Everything else the old version exposed (user, isAuthenticated, logout,
 * checkAppState, appPublicSettings) had zero external consumers and is
 * intentionally omitted. The one caller of logout (Sidebar.jsx) uses
 * base44.auth.logout() directly.
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAppState();
    // Bootstrap runs once on mount. checkAppState doesn't depend on props
    // or state, so an empty dep array is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    // Step 1: app public settings.
    try {
      const headers = { 'X-App-Id': appParams.appId };
      if (appParams.token) headers['Authorization'] = `Bearer ${appParams.token}`;
      const res = await fetch(
        `/api/apps/public/prod/public-settings/by-id/${appParams.appId}`,
        { headers }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data?.message || 'Failed to load app');
        err.status = res.status;
        err.data = data;
        throw err;
      }
      // public_settings response itself is not consumed downstream in this
      // codebase; we only needed to confirm the app is reachable and that
      // the token (if any) is valid for it. Drop the body on the floor.
      await res.json();
      setIsLoadingPublicSettings(false);
    } catch (appError) {
      console.error('App state check failed:', appError);
      if (appError.status === 403 && appError.data?.extra_data?.reason) {
        const reason = appError.data.extra_data.reason;
        if (reason === 'auth_required') {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        } else if (reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
        } else {
          setAuthError({ type: reason, message: appError.message });
        }
      } else {
        setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      return; // No point trying checkUserAuth if the app check failed.
    }

    // Step 2: user auth (only if there's a token; unauthenticated public
    // pages are handled by App.jsx's auth_required branch).
    if (!appParams.token) {
      setIsLoadingAuth(false);
      return;
    }
    await checkUserAuth();
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await base44.auth.me();
      // Prime the react-query cache. useCurrentUser() everywhere else in
      // the app uses the same queryKey — this eliminates the redundant
      // second fetch that happened before this refactor (once here, once
      // in App.jsx's useCurrentUser).
      queryClientInstance.setQueryData(['currentUser'], currentUser);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
