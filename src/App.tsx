/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Home, Users, BookOpen, HeartHandshake, User as UserIcon, GraduationCap, AlertCircle, RefreshCw } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FeedView } from './components/FeedView';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BackgroundMusic } from './components/BackgroundMusic';
import { ensureVouchRequestFromUrlParams } from './utils/verificationService';
import { CursorSpotlight } from './components/motion/CinematicMotion';
import { NDCLogo } from './components/NDCLogo';

// Code-split route components to minimize initial bundle size and maximize performance
const DirectoryView = React.lazy(() => import('./components/DirectoryView').then(m => ({ default: m.DirectoryView })));
const AlumniDirectoryView = React.lazy(() => import('./components/AlumniDirectoryView').then(m => ({ default: m.AlumniDirectoryView })));
const BatchesView = React.lazy(() => import('./components/BatchesView').then(m => ({ default: m.BatchesView })));
const MapView = React.lazy(() => import('./components/MapView').then(m => ({ default: m.MapView })));
const ProfileView = React.lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const GalleryView = React.lazy(() => import('./components/GalleryView').then(m => ({ default: m.GalleryView })));
const UpcomingFeatureView = React.lazy(() => import('./components/UpcomingFeatureView').then(m => ({ default: m.UpcomingFeatureView })));
const CareerView = React.lazy(() => import('./components/CareerView').then(m => ({ default: m.CareerView })));
const MentorshipView = React.lazy(() => import('./components/MentorshipView').then(m => ({ default: m.MentorshipView })));
const ContactUsView = React.lazy(() => import('./components/ContactUsView').then(m => ({ default: m.ContactUsView })));
const SavedPostsView = React.lazy(() => import('./components/SavedPostsView').then(m => ({ default: m.SavedPostsView })));
const BloodNetworkView = React.lazy(() => import('./components/BloodNetworkView').then(m => ({ default: m.BloodNetworkView })));
const VerificationCenterModal = React.lazy(() => import('./components/verification/VerificationCenterModal').then(m => ({ default: m.VerificationCenterModal })));
const SettingsView = React.lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const AdminHubView = React.lazy(() => import('./components/admin/AdminHubView').then(m => ({ default: m.AdminHubView })));
const ExecutiveCouncilHubView = React.lazy(() => import('./components/admin/ExecutiveCouncilHubView').then(m => ({ default: m.ExecutiveCouncilHubView })));
const ResetPasswordView = React.lazy(() => import('./components/ResetPasswordView').then(m => ({ default: m.ResetPasswordView })));
import { isExecutiveCouncilEmail } from './services/executiveCouncilService';

const ViewLoadingFallback = () => (
  <div className="w-full py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
    <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    <span className="text-xs font-semibold tracking-wide">Loading portal view...</span>
  </div>
);

function AlumniAppContent() {
  const {
    isLoggedIn,
    currentUser,
    isAuthInitializing,
    authInitializationError,
    isPasswordRecovery,
    recoveryError,
    recoveryEmail,
    cancelPasswordRecovery,
    isProfileIncomplete,
  } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [loginSuccessNotice, setLoginSuccessNotice] = useState<string | null>(null);

  // Route state: 'landing' | 'feed' | 'alumni' | 'directory' | 'find' | 'batches' | 'map' | 'gallery' | 'profile' | 'reset-password' | `batch:${number}` | `post-${number}`
  const [route, setRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/reset-password' || pathname === '/recovery') {
        return 'reset-password';
      }
      if (pathname === '/admin' || pathname === '/dashboard/admin') {
        return 'admin';
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('post') || params.get('vouch_for')) {
        return 'feed';
      }
      if (window.location.hash) {
        const h = window.location.hash.replace('#', '').toLowerCase();
        if (h === 'reset-password' || h === 'recovery') return 'reset-password';
        if (h === 'council' || h === 'executive-council' || h === 'council-admin') return 'council';
        if (h === 'admin' || h === 'dashboard/admin' || h === 'dashboard-admin') return 'admin';
        if (h.startsWith('post-') || h === 'dashboard' || h === 'feed') return 'feed';
        if (h.startsWith('blood-req-')) return 'emergency';
        if (h.startsWith('photo-')) return 'gallery';
        // When logged in, always prioritize social media feed over stale profile/directory hash
        if (isLoggedIn && (h === 'profile' || h === 'alumni' || h === 'directory')) {
          return 'feed';
        }
        if (h) return h;
      }
    }
    return isLoggedIn ? 'feed' : 'landing';
  });

  // Whenever user logs in, ALWAYS take them to the central social media feed / dashboard
  // (unless currently in password recovery flow) and track login timestamp for delayed notifications
  const wasLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    if (!wasLoggedInRef.current && isLoggedIn && !isPasswordRecovery) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ndc_login_timestamp', String(Date.now()));
      }
      // User just logged in — clear any stale #profile/#alumni hash and default to feed/dashboard
      setRoute('feed');
      window.location.hash = 'feed';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (isLoggedIn && typeof window !== 'undefined' && !sessionStorage.getItem('ndc_login_timestamp')) {
      // Initialize login timestamp if session is active but timestamp was not recorded yet
      sessionStorage.setItem('ndc_login_timestamp', String(Date.now()));
    }
    wasLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn, isPasswordRecovery]);

  // STRICT SECURITY RULES 1 & 2: Access to Admin Hub is restricted strictly to users
  // where alumni_profiles.role IN ('admin', 'moderator').
  // If a non-admin tries to access /dashboard/admin (or /admin), redirect them immediately to /dashboard.
  useEffect(() => {
    if (!isAuthInitializing) {
      const isAdminOrMod = currentUser.role === 'admin' || currentUser.role === 'moderator';
      const isTryingAdmin =
        route === 'admin' ||
        route === 'dashboard/admin' ||
        route === 'dashboard-admin';

      if (isTryingAdmin && (!isLoggedIn || !isAdminOrMod)) {
        setRoute('feed');
        if (typeof window !== 'undefined') {
          window.location.hash = 'dashboard';
          if (
            window.location.pathname.toLowerCase() === '/admin' ||
            window.location.pathname.toLowerCase() === '/dashboard/admin'
          ) {
            window.history.replaceState({}, '', '/#dashboard');
          }
        }
      }
    }
  }, [route, isLoggedIn, isAuthInitializing, currentUser.role]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number>(currentUser.id);
  const [previousRoute, setPreviousRoute] = useState<string>('alumni');
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<number | null>(null);

  // Auth modal state
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot' | null>(null);

  // Verification Center Modal state
  const [verificationModalState, setVerificationModalState] = useState<{
    isOpen: boolean;
    initialTab: 'status' | 'vouch_classmates' | 'vouch_others' | 'upload_id' | 'policy';
  }>({
    isOpen: false,
    initialTab: 'status',
  });

  const openVerificationCenter = (
    initialTab: 'status' | 'vouch_classmates' | 'vouch_others' | 'upload_id' | 'policy' = 'status'
  ) => {
    setVerificationModalState({ isOpen: true, initialTab });
  };

  // Handle ?vouch_for=... shared peer vouch link
  useEffect(() => {
    let isMounted = true;
    ensureVouchRequestFromUrlParams().then((req) => {
      if (isMounted && req) {
        if (isLoggedIn) {
          setVerificationModalState({ isOpen: true, initialTab: 'vouch_others' });
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.delete('vouch_for');
            window.history.replaceState({}, '', url.pathname + (url.search || '') + (url.hash || ''));
          }
        } else {
          setAuthModalMode('login');
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  // Sync route with window location hash
  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash.replace('#', '');
      if (h === 'council' || h === 'executive-council' || h === 'council-admin') {
        const isCouncil = isExecutiveCouncilEmail(currentUser.email);
        if (isCouncil) {
          setRoute('council');
        } else {
          setRoute('feed');
          window.location.hash = 'dashboard';
        }
      } else if (h === 'admin' || h === 'dashboard/admin' || h === 'dashboard-admin') {
        const isAdminOrMod = currentUser.role === 'admin' || currentUser.role === 'moderator';
        if (isAdminOrMod) {
          setRoute('admin');
        } else {
          setRoute('feed');
          window.location.hash = 'dashboard';
        }
      } else if (h.startsWith('post-')) {
        setRoute('feed');
      } else if (h.startsWith('blood-req-')) {
        setRoute('emergency');
      } else if (h.startsWith('photo-') || h.startsWith('album-') || h.startsWith('gallery-album-')) {
        setRoute('gallery');
      } else if (h) {
        setRoute(h);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser.role, currentUser.email]);

  // Strict Security Route Guard: Immediate redirection if non-admin lands on admin/council route
  useEffect(() => {
    const isCouncilRoute = route === 'council' || route === 'executive-council' || route === 'council-admin';
    if (isCouncilRoute && !isAuthInitializing && isLoggedIn) {
      if (!isExecutiveCouncilEmail(currentUser.email)) {
        setRoute('feed');
        window.location.hash = 'dashboard';
      }
    }

    const isAdminRoute = route === 'admin' || route === 'dashboard/admin' || route === 'dashboard-admin';
    if (isAdminRoute && !isAuthInitializing && isLoggedIn) {
      const hasPrivileges = currentUser.role === 'admin' || currentUser.role === 'moderator';
      if (!hasPrivileges) {
        setRoute('feed');
        window.location.hash = 'dashboard';
      }
    }
  }, [route, currentUser.role, currentUser.email, isAuthInitializing, isLoggedIn]);

  const navigateTo = (newRoute: string, keepSelectedProfile = false) => {
    let target = newRoute;
    if (target === 'council' || target === 'executive-council' || target === 'council-admin') {
      if (!isExecutiveCouncilEmail(currentUser.email)) {
        target = 'feed';
      }
    }
    if (target === 'admin' || target === 'dashboard/admin' || target === 'dashboard-admin') {
      const hasPrivileges = currentUser.role === 'admin' || currentUser.role === 'moderator';
      if (!hasPrivileges) {
        target = 'feed';
      }
    }
    if (target === 'profile' && !keepSelectedProfile) {
      setSelectedProfileId(currentUser.id);
    }
    if (target.startsWith('album-') || target.startsWith('gallery-album-')) {
      const albumId = target.replace(/^(album-|gallery-album-)/, '');
      setRoute('gallery');
      window.location.hash = `album-${albumId}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setRoute(target);
    if (!target.startsWith('gallery') || !window.location.hash.startsWith('#album-')) {
      window.location.hash = target === 'feed' ? 'dashboard' : target;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewProfile = (profileId: number) => {
    setPreviousRoute(route === 'profile' ? previousRoute : route);
    setSelectedProfileId(profileId);
    navigateTo('profile', true);
  };

  const getBackLabel = () => {
    if (previousRoute === 'admin' || previousRoute === 'dashboard/admin') return 'Back to Admin Hub';
    if (previousRoute === 'map' || previousRoute === 'map-directory') return 'Back to Map';
    if (previousRoute === 'batches') return 'Back to Batches';
    if (previousRoute === 'feed' || previousRoute === 'dashboard') return 'Back to Feed';
    if (previousRoute === 'find') return 'Back to Search Results';
    if (previousRoute === 'settings' || previousRoute === 'profile-settings') return 'Back to Settings';
    if (previousRoute === 'emergency' || previousRoute === 'blood' || previousRoute === 'blood-network') return 'Back to Blood Network';
    if (previousRoute === 'careers') return 'Back to Career Portal';
    return 'Back to Directory';
  };

  const handleGlobalSearchChange = (query: string) => {
    setGlobalSearch(query);
    if (query.trim() && route !== 'directory' && route !== 'find') {
      navigateTo('directory');
    }
  };

  if (isAuthInitializing) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-white px-6 relative overflow-hidden"
        role="status"
        aria-live="polite"
      >
        {/* Subtle Ambient Collegiate Radiance */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto space-y-5 animate-fade-in">
          {/* Official NDC Emblem with Glowing Halo */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-blue-500/30 to-amber-500/20 blur-lg animate-pulse" />
            <div className="relative p-3.5 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-md shadow-2xl">
              <NDCLogo className="w-20 h-20 sm:w-24 sm:h-24 object-contain filter drop-shadow-md" />
            </div>
          </div>

          {/* Authentic College Motto */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-white tracking-wide leading-snug drop-shadow-sm">
              &ldquo;Once a Notre Damian, Always a Notre Damian&rdquo;
            </h2>
            <p className="text-xs sm:text-sm font-medium text-blue-200/80 tracking-wider uppercase">
              Notre Dame College, Dhaka
            </p>
          </div>

          {/* Elegant Loading Pulse Line */}
          <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-gradient-to-r from-blue-500 via-amber-400 to-blue-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (authInitializationError && !isLoggedIn && !isPasswordRecovery) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Connecting to Notre Dame Alumni Portal</h2>
            <p className="text-xs text-slate-400 mt-1">{authInitializationError}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
            >
              <span>Back Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STRICT SECURITY GUARD: If in password recovery mode, immediately render the dedicated
  // ResetPasswordView. NEVER render the dashboard, and BLOCK all other routes until saved.
  if (isPasswordRecovery || route === 'reset-password') {
    return (
      <React.Suspense fallback={<ViewLoadingFallback />}>
        <ResetPasswordView
          errorMessage={recoveryError}
          userEmail={recoveryEmail}
          onSuccess={() => {
            cancelPasswordRecovery();
            setLoginSuccessNotice(
              'Your password has been reset successfully. Please sign in with your new password.'
            );
            setAuthModalMode('login');
          }}
          onCancel={() => {
            cancelPasswordRecovery();
            setAuthModalMode('login');
          }}
          onRequestNewLink={() => {
            cancelPasswordRecovery();
            setAuthModalMode('forgot');
          }}
        />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            initialSuccessMessage={loginSuccessNotice || undefined}
            onClose={() => {
              setAuthModalMode(null);
              setLoginSuccessNotice(null);
            }}
            onSuccess={() => {
              setAuthModalMode(null);
              setLoginSuccessNotice(null);
              navigateTo('feed');
            }}
          />
        )}
      </React.Suspense>
    );
  }

  // If user is logged out and visiting Contact Us, render ContactUsView with guest header
  if (!isLoggedIn && route === 'contact') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigateTo('landing')}
          >
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white font-serif">
                নটর ডেম কলেজ অ্যালামনাই
              </div>
              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                NDC Alumni Association
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo('landing')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={() => setAuthModalMode('login')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#c81e1e] hover:bg-[#b01818] text-white cursor-pointer shadow-xs"
            >
              Sign In
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-8 max-w-5xl w-full mx-auto">
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <ContactUsView onBack={() => navigateTo('landing')} />
          </React.Suspense>
        </main>

        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            initialSuccessMessage={loginSuccessNotice || undefined}
            onClose={() => {
              setAuthModalMode(null);
              setLoginSuccessNotice(null);
            }}
            onSuccess={() => {
              setAuthModalMode(null);
              setLoginSuccessNotice(null);
              navigateTo('feed');
            }}
          />
        )}
      </div>
    );
  }

  // If user is logged out and on the landing page, display the full Public Landing Page
  if (!isLoggedIn || route === 'landing') {
    return (
      <>
        <LandingPage
          onOpenLogin={() => setAuthModalMode('login')}
          onOpenRegister={() => setAuthModalMode('register')}
          onNavigate={(target) => {
            if (target === 'landing' || target === 'contact') {
              navigateTo(target);
            } else if (!isLoggedIn) {
              // Guest browsing prompt to log in/register to access portal
              setAuthModalMode('login');
            } else {
              navigateTo(target);
            }
          }}
        />

        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            initialSuccessMessage={loginSuccessNotice || undefined}
            onClose={() => {
              setAuthModalMode(null);
              setLoginSuccessNotice(null);
            }}
            onSuccess={() => {
              setAuthModalMode(null);
              setLoginSuccessNotice(null);
              navigateTo('feed');
            }}
          />
        )}
      </>
    );
  }

  // Logged-in application shell (Notre Dame Alumni Network portal)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200 font-sans antialiased selection:bg-blue-500 selection:text-white relative overflow-x-hidden w-full max-w-full">
      {/* Smooth Liquid Transparent Glass Ambient Canvas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none max-w-full">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-500/20 via-indigo-500/18 to-teal-400/20 blur-[120px] animate-liquid-blob-1 dark:from-blue-600/22 dark:via-cyan-500/15 dark:to-teal-500/15" />
        <div className="absolute top-1/4 -right-28 w-[460px] h-[460px] rounded-full bg-gradient-to-br from-purple-500/18 via-rose-500/16 to-blue-500/20 blur-[130px] animate-liquid-blob-2 dark:from-purple-600/15 dark:via-rose-600/12 dark:to-blue-600/18" />
        <div className="absolute -bottom-36 left-1/3 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-teal-500/16 via-emerald-500/14 to-indigo-500/18 blur-[130px] animate-liquid-blob-3 dark:from-cyan-600/12 dark:via-emerald-600/10 dark:to-indigo-600/15" />
        {/* Liquid glass light sheen */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.16),rgba(0,0,0,0))] pointer-events-none" />
      </div>

      {/* Global Cursor-Following Institutional Spotlight */}
      <CursorSpotlight />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={route.startsWith('batch:') ? 'batches' : route}
        onSelectTab={navigateTo}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenVerificationCenter={openVerificationCenter}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
        {/* Header with Theme Toggle */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={(r) => {
            if (r === 'profile') {
              setSelectedProfileId(currentUser.id);
            }
            navigateTo(r);
          }}
          searchQuery={globalSearch}
          onSearchChange={handleGlobalSearchChange}
          onOpenVerificationCenter={openVerificationCenter}
        />

        {/* View Router with Smooth Cinematic Page Transitions */}
        <main className="flex-1 px-2.5 sm:px-5 lg:px-8 py-3 sm:py-6 lg:py-8 max-w-[1500px] w-full mx-auto pb-24 lg:pb-8 min-w-0">
          {isLoggedIn && isProfileIncomplete && route !== 'profile' && (
            <div className="mb-4 sm:mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-blue-500/30 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <p className="font-bold text-sm sm:text-base">Complete Your Alumnus Profile</p>
                  <p className="text-xs text-blue-100">Confirm your Notre Dame HSC Batch Year and Roll to connect with batchmates and request verified status.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProfileId(currentUser.id);
                  navigateTo('profile');
                }}
                className="px-4 py-2 rounded-xl bg-white text-blue-900 font-extrabold text-xs hover:bg-blue-50 transition-all shrink-0 cursor-pointer shadow-md"
              >
                Complete Profile
              </button>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${route}-${route === 'profile' ? selectedProfileId : ''}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <React.Suspense fallback={<ViewLoadingFallback />}>
                {(route === 'feed' || route === 'dashboard') && (
                  <FeedView
                    onViewProfile={handleViewProfile}
                    onOpenVerificationCenter={openVerificationCenter}
                    onNavigate={navigateTo}
                  />
                )}

                {(route === 'alumni' || (route === 'directory' && !globalSearch)) && (
                  <AlumniDirectoryView
                    onViewProfile={handleViewProfile}
                    onNavigateToFind={() => navigateTo('find')}
                    onOpenVerificationCenter={openVerificationCenter}
                  />
                )}

                {(route === 'find' || (route === 'directory' && !!globalSearch)) && (
                  <DirectoryView
                    onViewProfile={handleViewProfile}
                    initialSearch={globalSearch}
                    initialBatch={selectedBatchFilter}
                    onOpenVerificationCenter={openVerificationCenter}
                  />
                )}

                {(route === 'batches' || route === 'leaderboard') && (
                  <BatchesView
                    onSelectBatch={(batchYear) => {
                      setSelectedBatchFilter(batchYear);
                      setGlobalSearch('');
                      navigateTo('find');
                    }}
                    onViewProfile={handleViewProfile}
                  />
                )}

                {(route === 'map' || route === 'map-directory') && (
                  <MapView onViewProfile={handleViewProfile} />
                )}

                {route === 'institutions' && (
                  <UpcomingFeatureView type="institutions" onNavigate={navigateTo} />
                )}

                {route === 'mentorship' && (
                  <MentorshipView
                    onViewProfile={handleViewProfile}
                    onNavigate={navigateTo}
                  />
                )}

                {route === 'news' && (
                  <UpcomingFeatureView type="news" onNavigate={navigateTo} />
                )}

                {route === 'events' && (
                  <UpcomingFeatureView type="events" onNavigate={navigateTo} />
                )}

                {(route === 'gallery' || route.startsWith('album-') || route.startsWith('gallery-album-')) && (
                  <GalleryView onNavigate={navigateTo} />
                )}

                {route === 'careers' && (
                  <CareerView
                    onViewProfile={handleViewProfile}
                    onNavigate={navigateTo}
                  />
                )}

                {(route === 'emergency' || route === 'blood' || route === 'blood-network') && (
                  <BloodNetworkView
                    onViewProfile={handleViewProfile}
                    onNavigate={navigateTo}
                  />
                )}

                {route === 'contact' && (
                  <ContactUsView onBack={() => navigateTo('feed')} />
                )}

                {(route === 'saved' || route === 'saved-posts') && (
                  <SavedPostsView onNavigate={navigateTo} />
                )}

                {route === 'profile' && (
                  <ProfileView
                    profileId={selectedProfileId || currentUser.id}
                    onBack={() => navigateTo(previousRoute || 'alumni')}
                    backLabel={getBackLabel()}
                    onOpenVerificationCenter={openVerificationCenter}
                    onNavigate={navigateTo}
                    onSelectProfile={(id) => {
                      setSelectedProfileId(id);
                      setRoute('profile');
                      window.location.hash = 'profile';
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                )}

                {(route === 'settings' || route === 'profile-settings') && (
                  <SettingsView
                    onOpenVerificationCenter={openVerificationCenter}
                    onNavigate={navigateTo}
                  />
                )}

                {(route === 'admin' || route === 'dashboard/admin' || route === 'dashboard-admin') && (
                  currentUser.role === 'admin' || currentUser.role === 'moderator' ? (
                    <AdminHubView
                      onNavigate={navigateTo}
                      onViewProfile={handleViewProfile}
                    />
                  ) : null
                )}

                {(route === 'council' || route === 'executive-council' || route === 'council-admin') && (
                  isExecutiveCouncilEmail(currentUser.email) ? (
                    <ExecutiveCouncilHubView
                      onNavigate={navigateTo}
                      onViewProfile={handleViewProfile}
                    />
                  ) : null
                )}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Heritage Monument Portal Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 pt-8 pb-28 lg:pb-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white/40 via-white/70 to-slate-100/60 dark:from-slate-900/40 dark:via-slate-900/80 dark:to-slate-950/90 backdrop-blur-md">
          <div className="max-w-[1500px] mx-auto">
            {/* Centerpiece Emotional Tribute */}
            <div className="flex flex-col items-center justify-center text-center mb-6">
              {/* Dual engraved hairline divider with emblem */}
              <div className="w-full flex items-center justify-center gap-3 sm:gap-4 max-w-xl mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300/40 dark:via-amber-400/30 to-amber-400/70" />
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-400/30 p-1 flex items-center justify-center shadow-xs">
                  <NDCLogo className="w-full h-full" />
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-300/40 dark:via-amber-400/30 to-amber-400/70" />
              </div>

              {/* Outstanding Emotional Motto */}
              <blockquote className="font-serif italic text-base sm:text-lg md:text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 dark:from-amber-200 dark:via-yellow-300 dark:to-amber-200 drop-shadow-xs">
                &ldquo;Once a Notre Damian, Always a Notre Damian.&rdquo;
              </blockquote>

              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-1">
                75+ Batches • One Lifelong Brotherhood • Motijheel, Dhaka
              </p>
            </div>

            {/* Bottom Row: Centered Copyright, Latin Motto & Developer Credit */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center justify-center text-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span>© {new Date().getFullYear()} Notre Dame College Alumni Network. All rights reserved.</span>
                <span className="inline text-slate-300 dark:text-slate-700">•</span>
                <span className="font-serif italic font-semibold text-amber-700 dark:text-amber-300/90">
                  Diligite Lumen Sapientiae
                </span>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                <a
                  href="http://nurulanambashir.gt.tc/?i=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                >
                  Designed &amp; Developed by Bashir
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (Active on screens < 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.35)] pb-safe transition-colors duration-200 touch-manipulation"
      >
        <div className="h-14 sm:h-16 px-1 flex items-center justify-around max-w-lg mx-auto">
          {/* 1. Feed / Quad */}
          <button
            type="button"
            onClick={() => navigateTo('feed')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              route === 'feed' || route === 'dashboard'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Home className={`w-5 h-5 transition-transform ${route === 'feed' || route === 'dashboard' ? 'scale-110' : ''}`} />
              {(route === 'feed' || route === 'dashboard') && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 truncate max-w-[64px]">The Quad</span>
          </button>

          {/* 2. Directory */}
          <button
            type="button"
            onClick={() => navigateTo('alumni')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              route === 'alumni' || route === 'directory' || route === 'find'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Users className={`w-5 h-5 transition-transform ${route === 'alumni' || route === 'directory' || route === 'find' ? 'scale-110' : ''}`} />
              {(route === 'alumni' || route === 'directory' || route === 'find') && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 truncate max-w-[64px]">Directory</span>
          </button>

          {/* 3. Batches */}
          <button
            type="button"
            onClick={() => navigateTo('batches')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              route === 'batches' || route.startsWith('batch:')
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <BookOpen className={`w-5 h-5 transition-transform ${route === 'batches' || route.startsWith('batch:') ? 'scale-110' : ''}`} />
              {(route === 'batches' || route.startsWith('batch:')) && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 truncate max-w-[64px]">Batches</span>
          </button>

          {/* 4. Blood Lifeline */}
          <button
            type="button"
            onClick={() => navigateTo('emergency')}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              route === 'emergency' || route === 'blood' || route === 'blood-network'
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            <div className="relative">
              <HeartHandshake className={`w-5 h-5 transition-transform ${route === 'emergency' || route === 'blood' || route === 'blood-network' ? 'scale-110 text-rose-600' : ''}`} />
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {(route === 'emergency' || route === 'blood' || route === 'blood-network') && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 truncate max-w-[64px]">Blood</span>
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={() => {
              setSelectedProfileId(currentUser.id);
              navigateTo('profile');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              route === 'profile'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className={`w-5 h-5 rounded-full object-cover ring-1 transition-all ${
                    route === 'profile'
                      ? 'ring-blue-600 dark:ring-blue-400 scale-110'
                      : 'ring-slate-300 dark:ring-slate-700'
                  }`}
                />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
              {route === 'profile' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 truncate max-w-[64px]">Profile</span>
          </button>
        </div>
      </nav>

      {/* Global Offline Mode Status Indicator */}
      <OfflineIndicator onNavigate={navigateTo} />

      {/* Active Notredamian Verification & Peer Vouch Center Modal */}
      {verificationModalState.isOpen && (
        <React.Suspense fallback={null}>
          <VerificationCenterModal
            isOpen={verificationModalState.isOpen}
            onClose={() => setVerificationModalState((prev) => ({ ...prev, isOpen: false }))}
            initialTab={verificationModalState.initialTab}
          />
        </React.Suspense>
      )}

      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          initialSuccessMessage={loginSuccessNotice || undefined}
          onClose={() => {
            setAuthModalMode(null);
            setLoginSuccessNotice(null);
          }}
          onSuccess={() => {
            setAuthModalMode(null);
            setLoginSuccessNotice(null);
            navigateTo('feed');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlumniAppContent />
        <BackgroundMusic />
      </AuthProvider>
    </ThemeProvider>
  );
}
