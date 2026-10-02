/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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
import { AdminCommandCenterView } from './components/admin/AdminCommandCenterView';
import { ensureVouchRequestFromUrlParams } from './utils/verificationService';
import { CursorSpotlight } from './components/motion/CinematicMotion';

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
        if (h.startsWith('post-')) return 'feed';
        if (h) return h;
      }
    }
    return isLoggedIn ? 'feed' : 'landing';
  });

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
    if (previousRoute === 'admin') return 'Back to Admin Command Center';
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

  // If user is logged out and on the landing page (unless viewing Admin Command Center), display the full Public Landing Page
  if ((!isLoggedIn || route === 'landing') && route !== 'admin') {
    return (
      <>
        <LandingPage
          onOpenLogin={() => setAuthModalMode('login')}
          onOpenRegister={() => setAuthModalMode('register')}
          onNavigate={(target) => {
            if (target === 'landing' || target === 'admin') {
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
            onSuccess={(completedMode) => {
              setAuthModalMode(null);
              navigateTo(completedMode === 'register' ? 'profile' : 'feed');
            }}
          />
        )}
      </>
    );
  }

  // Logged-in application shell (Notre Dame Alumni Network portal)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200 font-sans antialiased selection:bg-blue-500 selection:text-white relative">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">
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

              {route === 'admin' && (
                <AdminCommandCenterView onViewProfile={handleViewProfile} />
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

              {route === 'profile' && (
                <ProfileView
                  profileId={selectedProfileId}
                  onBack={() => navigateTo(previousRoute || 'alumni')}
                  backLabel={getBackLabel()}
                  onOpenVerificationCenter={openVerificationCenter}
                  onNavigate={navigateTo}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Portal Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8 text-[11px] text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50">
          <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span>© {new Date().getFullYear()} Notre Dame College Alumni Network. All rights reserved.</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
              <span className="font-serif italic text-amber-700 dark:text-amber-300/90 font-medium">
                &ldquo;Once a Notre Damian, Always a Notre Damian.&rdquo;
              </span>
            </div>
            <div>
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
