import React, { lazy, Suspense, useEffect, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserDataProvider } from './contexts/UserDataContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { useRoleAuth } from './hooks/useRoleAuth';
import { initPageVisibilityHandling, cleanupPageVisibilityHandling } from './utils/pageVisibility';

// Eagerly load only the most critical components
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import DashboardRedirect from './pages/DashboardRedirect';

// Lazy load non-critical components
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage'));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'));
const DeveloperDashboardPage = lazy(() => import('./pages/DeveloperDashboardPage'));
const AddPropertyPage = lazy(() => import('./pages/AddPropertyPage'));
const DeveloperPublicPage = lazy(() => import('./pages/DeveloperPublicPage'));

// Loading component
const PageLoader = memo(() => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-300"></div>
  </div>
));

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: 'developer' | 'any';
}

function PrivateRoute({ children, requiredRole = 'any' }: PrivateRouteProps) {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useRoleAuth();

  if (loading || roleLoading) {
    return <PageLoader />;
  }

  if (!user) {
    sessionStorage.setItem('intentional_navigation', 'true');
    return <Navigate to="/signin" />;
  }

  // Check if user has the required role
  if (requiredRole !== 'any' && role !== requiredRole) {
    return <Navigate to="/dashboard" />;
  }

  return <UserDataProvider>{children}</UserDataProvider>;
}


const App = memo(function App() {
  // Initialize page visibility handling at the app level
  useEffect(() => {
    initPageVisibilityHandling();
    return () => cleanupPageVisibilityHandling();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <CurrencyProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={
              <Suspense fallback={<PageLoader />}>
                <SignUpPage />
              </Suspense>
            } />
            <Route path="/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <PasswordResetPage />
              </Suspense>
            } />
            <Route path="/update-password" element={
              <Suspense fallback={<PageLoader />}>
                <UpdatePasswordPage />
              </Suspense>
            } />
            <Route path="/developers/:slug" element={
              <Suspense fallback={<PageLoader />}>
                <DeveloperPublicPage />
              </Suspense>
            } />

            {/* Developer Dashboard Routes */}
            <Route
              path="/developer-dashboard/*"
              element={
                <PrivateRoute requiredRole="developer">
                  <Suspense fallback={<PageLoader />}>
                    <DeveloperDashboardPage />
                  </Suspense>
                </PrivateRoute>
              }
            />

            {/* Dashboard Redirect Route */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardRedirect />
                </PrivateRoute>
              }
            />

            {/* Protected Shared Routes */}
            <Route
              path="/dashboard/add-property"
              element={
                <PrivateRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AddPropertyPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
          </Routes>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
});

export default App;
