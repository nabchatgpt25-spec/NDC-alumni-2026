import React, { useState } from 'react';
import {
  Home,
  Users,
  Search,
  MapPin,
  BookOpen,
  Building2,
  GraduationCap,
  Newspaper,
  Calendar,
  Image,
  Briefcase,
  HeartHandshake,
  Mail,
  User,
  X,
  BookmarkCheck,
  Sun,
  Moon,
  ShieldCheck,
  Settings,
  Sparkles,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { NDCLogo } from './NDCLogo';
import { loadVouchRequests } from '../utils/verificationService';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeType?: 'soon' | 'hot' | 'count';
}

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  customNavItems?: NavItemConfig[];
  onOpenVerificationCenter?: (tab?: 'status' | 'vouch_classmates' | 'upload_id' | 'policy') => void;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  customNavItems,
  onOpenVerificationCenter,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const isVerified = (currentUser.verificationStatus || 'verified') === 'verified';
  const pendingCount = loadVouchRequests().filter((r) => r.status === 'pending').length;

  // Segment 1: MAIN Navigation
  const mainNavItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'alumni', label: 'Alumni Directory', icon: Users },
    { id: 'find', label: 'Find Alumni', icon: Search },
    { id: 'map', label: 'Alumni Map', icon: MapPin },
  ];

  // Segment 2: COMMUNITY Navigation
  const communityNavItems: NavItemConfig[] = [
    { id: 'batches', label: 'Batch Directory', icon: BookOpen },
    { id: 'news', label: 'News & Blog', icon: Newspaper, badge: 'SOON', badgeType: 'soon' },
    { id: 'events', label: 'Events', icon: Calendar, badge: 'SOON', badgeType: 'soon' },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'institutions', label: 'Institutions', icon: Building2, badge: 'SOON', badgeType: 'soon' },
  ];

  // Segment 3: SERVICES Navigation
  const servicesNavItems: NavItemConfig[] = [
    { id: 'emergency', label: 'Blood Network', icon: HeartHandshake, badge: 'LIVE', badgeType: 'hot' },
    { id: 'mentorship', label: 'Mentorship', icon: GraduationCap, badge: 'SOON', badgeType: 'soon' },
    { id: 'careers', label: 'Career Portal', icon: Briefcase, badge: 'SOON', badgeType: 'soon' },
    { id: 'contact', label: 'Contact Us', icon: Mail },
  ];

  const sections: NavSection[] = customNavItems
    ? [{ id: 'custom', title: 'MAIN', items: customNavItems }]
    : [
        { id: 'main', title: 'MAIN', items: mainNavItems },
        { id: 'community', title: 'COMMUNITY', items: communityNavItems },
        { id: 'services', title: 'SERVICES', items: servicesNavItems },
      ];

  const isItemActive = (id: string) => {
    if (activeTab === id) return true;
    if (id === 'dashboard' && activeTab === 'feed') return true;
    if (id === 'alumni' && activeTab === 'directory') return true;
    if (id === 'batches' && activeTab.startsWith('batch:')) return true;
    if (id === 'emergency' && (activeTab === 'blood' || activeTab === 'blood-network')) return true;
    return false;
  };

  const renderNavButton = (item: NavItemConfig) => {
    const Icon = item.icon;
    const active = isItemActive(item.id);
    const isLive = item.badge === 'LIVE';

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onSelectTab(item.id);
          onClose();
        }}
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all text-left cursor-pointer group ${
          active
            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-blue-100/50 dark:hover:bg-blue-900/30'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              active
                ? 'text-white'
                : 'text-slate-400 dark:text-blue-300/60 group-hover:text-blue-600 dark:group-hover:text-blue-300'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>

        {item.badge && (
          isLive ? (
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider transition-all animate-pulse ${
                active
                  ? 'bg-rose-500 text-white border-white/40'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-ping shrink-0" />
              <span>LIVE</span>
            </span>
          ) : (
            <span
              className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border tracking-wider transition-colors ${
                active
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300 border-blue-500/20'
              }`}
            >
              {item.badge}
            </span>
          )
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Subtle Premium Bluish Liquid-Glass Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-gradient-to-b from-blue-50/90 via-slate-50/90 to-blue-50/85 dark:from-[#081226]/92 dark:via-[#0b172e]/90 dark:to-[#091428]/92 backdrop-blur-2xl border-r border-blue-200/60 dark:border-blue-500/20 shadow-xl shadow-blue-950/5 dark:shadow-2xl dark:shadow-black/60 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand Header */}
        <div className="h-18 px-5 flex items-center justify-between border-b border-blue-100/70 dark:border-blue-500/15 bg-white/40 dark:bg-blue-950/20 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectTab('dashboard');
              onClose();
            }}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 p-1 border border-blue-200/70 dark:border-blue-500/25 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <div className="font-black text-sm text-slate-900 dark:text-white tracking-tight leading-tight">
                Notre Dame Alumni
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold tracking-wide">
                Diligite Lumen Sapientiae
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 cursor-pointer transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Content: 4 Clear Segments (MAIN, COMMUNITY, SERVICES, ACCOUNT) */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 scrollbar-thin">
          {sections.map((section) => (
            <div key={section.id} className="space-y-1">
              <div className="px-2.5 pt-1 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900/65 dark:text-blue-300/70">
                  {section.title}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-blue-200/60 dark:from-blue-500/20 to-transparent ml-2.5" />
              </div>
              <div className="space-y-0.5">
                {section.items.map(renderNavButton)}
              </div>
            </div>
          ))}

          {/* Segment 4: ACCOUNT */}
          <div className="space-y-1 pt-1">
            <div className="px-2.5 pt-1 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900/65 dark:text-blue-300/70">
                ACCOUNT
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-blue-200/60 dark:from-blue-500/20 to-transparent ml-2.5" />
            </div>

            <div className="space-y-0.5">
              {/* My Profile */}
              <button
                type="button"
                onClick={() => {
                  onSelectTab('profile');
                  onClose();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium text-xs sm:text-[13px] transition-all text-left cursor-pointer group ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-blue-100/50 dark:hover:bg-blue-900/30'
                }`}
              >
                <User
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    activeTab === 'profile'
                      ? 'text-white'
                      : 'text-slate-400 dark:text-blue-300/60 group-hover:text-blue-600 dark:group-hover:text-blue-300'
                  }`}
                />
                <span className="truncate">My Profile</span>
              </button>

              {/* Account Settings */}
              <button
                type="button"
                onClick={() => {
                  onSelectTab('profile-settings');
                  onClose();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium text-xs sm:text-[13px] transition-all text-left cursor-pointer group ${
                  activeTab === 'profile-settings' || activeTab === 'settings'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-blue-100/50 dark:hover:bg-blue-900/30'
                }`}
              >
                <Settings
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    activeTab === 'profile-settings' || activeTab === 'settings'
                      ? 'text-white'
                      : 'text-slate-400 dark:text-blue-300/60 group-hover:text-blue-600 dark:group-hover:text-blue-300'
                  }`}
                />
                <span className="truncate">Account Settings</span>
              </button>

              {/* Verification Center */}
              {onOpenVerificationCenter && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenVerificationCenter(isVerified ? 'vouch_classmates' : 'status');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl font-medium text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">Verification Center</span>
                  </div>
                  <span
                    className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border tracking-wider ${
                      isVerified
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {isVerified ? (pendingCount > 0 ? `${pendingCount} Vouch` : 'Verified') : 'Pending'}
                  </span>
                </button>
              )}

              {/* Quick Light / Dark Mode Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  )}
                  <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/40">
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Eternal Brotherhood Heritage Seal */}
        <div className="px-3.5 pt-2 pb-1 shrink-0">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-blue-900/15 to-amber-500/5 dark:from-amber-400/10 dark:via-blue-950/40 dark:to-amber-400/5 border border-amber-300/40 dark:border-amber-400/25 shadow-xs backdrop-blur-sm relative overflow-hidden group transition-all hover:border-amber-400/60 dark:hover:border-amber-400/40">
            {/* Subtle warm ambient highlight */}
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-amber-400/20 dark:bg-amber-300/15 blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-amber-500/20 dark:bg-amber-400/20 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                <Sparkles className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 font-mono">
                Eternal Motto
              </span>
            </div>

            <p className="font-serif italic text-xs font-semibold leading-relaxed text-slate-800 dark:text-amber-100 tracking-wide">
              &ldquo;Once a Notre Damian, Always a Notre Damian.&rdquo;
            </p>

            <div className="mt-2 pt-1.5 border-t border-amber-300/30 dark:border-amber-400/15 flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="italic">Diligite Lumen Sapientiae</span>
              <span className="text-amber-700 dark:text-amber-300 font-bold">Est. 1949</span>
            </div>
          </div>
        </div>

        {/* Bottom Card */}
        <div className="p-3.5 border-t border-blue-100/70 dark:border-blue-500/15 bg-white/30 dark:bg-blue-950/20 shrink-0 space-y-2.5">
          <PWAInstallButton variant="sidebar" className="w-full justify-center" />
          <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <a
              href="http://nurulanambashir.gt.tc/?i=1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Designed &amp; Developed by Bashir
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
