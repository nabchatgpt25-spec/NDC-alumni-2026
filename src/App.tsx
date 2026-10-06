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
import { DirectoryView } from './components/DirectoryView';
import { AlumniDirectoryView } from './components/AlumniDirectoryView';
import { BatchesView } from './components/BatchesView';
import { MapView } from './components/MapView';
import { ProfileView } from './components/ProfileView';
import { GalleryView } from './components/GalleryView';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { UpcomingFeatureView } from './components/UpcomingFeatureView';
import { ContactUsView } from './components/ContactUsView';
import { SavedPostsView } from './components/SavedPostsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { VerificationCenterModal } from './components/verification/VerificationCenterModal';
import { BloodNetworkView } from './components/BloodNetworkView';
import { ensureVouchRequestFromUrlParams } from './utils/verificationService';
import { CursorSpotlight } from './components/motion/CinematicMotion';
import { NDCLogo } from './components/NDCLogo';

function AlumniAppContent() {
  const { isLoggedIn, currentUser } = useAuth();
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
    const req = ensureVouchRequestFromUrlParams();
    if (req) {
      if (isLoggedIn) {
        setVerificationModalState({ isOpen: true, initialTab: 'vouch_others' });
      } else {
        setAuthModalMode('login');
      }
    }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200 font-sans antialiased selection:bg-blue-500 selection:text-white relative overflow-hidden">
      {/* Smooth Liquid Transparent Glass Ambient Canvas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
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
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
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
        <main className="flex-1 px-2.5 sm:px-5 lg:px-8 py-3 sm:py-6 lg:py-8 max-w-[1500px] w-full mx-auto pb-24 lg:pb-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${route}-${route === 'profile' ? selectedProfileId : ''}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
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
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Heritage Monument Portal Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 pt-8 pb-5 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white/40 via-white/70 to-slate-100/60 dark:from-slate-900/40 dark:via-slate-900/80 dark:to-slate-950/90 backdrop-blur-md">
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

      {/* Global Offline Mode Status Indicator */}
      <OfflineIndicator onNavigate={navigateTo} />

      {/* Active Notredamian Verification & Peer Vouch Center Modal */}
      <VerificationCenterModal
        isOpen={verificationModalState.isOpen}
        onClose={() => setVerificationModalState((prev) => ({ ...prev, isOpen: false }))}
        initialTab={verificationModalState.initialTab}
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
