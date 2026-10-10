/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Home, Users, BookOpen, HeartHandshake, User as UserIcon } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FeedView } from './components/FeedView';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { OfflineIndicator } from './components/OfflineIndicator';
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
const ContactUsView = React.lazy(() => import('./components/ContactUsView').then(m => ({ default: m.ContactUsView })));
const SavedPostsView = React.lazy(() => import('./components/SavedPostsView').then(m => ({ default: m.SavedPostsView })));
const BloodNetworkView = React.lazy(() => import('./components/BloodNetworkView').then(m => ({ default: m.BloodNetworkView })));
const VerificationCenterModal = React.lazy(() => import('./components/verification/VerificationCenterModal').then(m => ({ default: m.VerificationCenterModal })));

const ViewLoadingFallback = () => (
  <div className="w-full py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
    <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    <span className="text-xs font-semibold tracking-wide">Loading portal view...</span>
  </div>
);

function AlumniAppContent() {
  const { isLoggedIn, currentUser, isAuthInitializing, authInitializationError } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // Route state: 'landing' | 'feed' | 'alumni' | 'directory' | 'find' | 'batches' | 'map' | 'gallery' | 'profile' | `batch:${number}` | `post-${number}`
  const [route, setRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('post') || params.get('vouch_for')) {
        return 'feed';
      }
      if (window.location.hash) {
        const h = window.location.hash.replace('#', '');
        if (h.startsWith('post-') || h === 'dashboard' || h === 'feed') return 'feed';
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
  const wasLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    if (!wasLoggedInRef.current && isLoggedIn) {
      // User just logged in — clear any stale #profile/#alumni hash and always default to feed/dashboard
      setRoute('feed');
      window.location.hash = 'feed';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    wasLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number>(currentUser.id);
  const [previousRoute, setPreviousRoute] = useState<string>('alumni');
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<number | null>(null);

  // Auth modal state
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot' | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('recovery') === '1' ? 'forgot' : null;
  });

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
      if (h.startsWith('post-')) {
        setRoute('feed');
      } else if (h) {
        setRoute(h);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (newRoute: string, keepSelectedProfile = false) => {
    if (newRoute === 'profile' && !keepSelectedProfile) {
      setSelectedProfileId(currentUser.id);
    }
    setRoute(newRoute);
    window.location.hash = newRoute;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewProfile = (profileId: number) => {
    setPreviousRoute(route === 'profile' ? previousRoute : route);
    setSelectedProfileId(profileId);
    navigateTo('profile', true);
  };

  const getBackLabel = () => {
    if (previousRoute === 'map' || previousRoute === 'map-directory') return 'Back to Map';
    if (previousRoute === 'batches') return 'Back to Batches';
    if (previousRoute === 'feed' || previousRoute === 'dashboard') return 'Back to Feed';
    if (previousRoute === 'find') return 'Back to Search Results';
    if (previousRoute === 'emergency' || previousRoute === 'blood' || previousRoute === 'blood-network') return 'Back to Blood Network';
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
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        Restoring your session…
      </div>
    );
  }

  if (authInitializationError && !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center" role="alert">
        {authInitializationError}
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
            if (target === 'landing') {
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
            onClose={() => setAuthModalMode(null)}
            onSuccess={() => {
              setAuthModalMode(null);
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

                {route === 'batches' && (
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
                  <UpcomingFeatureView type="mentorship" onNavigate={navigateTo} />
                )}

                {route === 'news' && (
                  <UpcomingFeatureView type="news" onNavigate={navigateTo} />
                )}

                {route === 'events' && (
                  <UpcomingFeatureView type="events" onNavigate={navigateTo} />
                )}

                {route === 'gallery' && (
                  <GalleryView />
                )}

                {route === 'careers' && (
                  <UpcomingFeatureView type="careers" onNavigate={navigateTo} />
                )}

                {(route === 'emergency' || route === 'blood' || route === 'blood-network') && (
                  <BloodNetworkView
                    onViewProfile={handleViewProfile}
                    onNavigate={navigateTo}
                  />
                )}

                {route === 'contact' && (
                  <ContactUsView />
                )}

                {(route === 'saved' || route === 'saved-posts') && (
                  <SavedPostsView onNavigate={navigateTo} />
                )}

                {(route === 'profile' || route === 'settings' || route === 'profile-settings') && (
                  <ProfileView
                    profileId={selectedProfileId || currentUser.id}
                    initialTab={route === 'settings' || route === 'profile-settings' ? 'settings' : undefined}
                    onBack={() => navigateTo(previousRoute || 'alumni')}
                    backLabel={getBackLabel()}
                    onOpenVerificationCenter={openVerificationCenter}
                    onNavigate={navigateTo}
                  />
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
              route === 'profile' || route === 'profile-settings' || route === 'settings'
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
                    route === 'profile' || route === 'profile-settings' || route === 'settings'
                      ? 'ring-blue-600 dark:ring-blue-400 scale-110'
                      : 'ring-slate-300 dark:ring-slate-700'
                  }`}
                />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
              {(route === 'profile' || route === 'profile-settings' || route === 'settings') && (
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
          onClose={() => setAuthModalMode(null)}
          onSuccess={() => {
            setAuthModalMode(null);
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
      </AuthProvider>
    </ThemeProvider>
  );
}
