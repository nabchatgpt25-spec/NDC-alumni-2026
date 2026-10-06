import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, Mail, ChevronDown, CheckCheck, User, LogOut, ShieldCheck, Clock, X, Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NDCLogo } from './NDCLogo';
import { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { loadVouchRequests } from '../utils/verificationService';
import {
  loadPortalNotifications,
  savePortalNotifications,
} from '../utils/bloodDonationService';
import {
  fetchNotificationsFromDb,
  markNotificationReadInDb,
} from '../services/supabaseService';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (route: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenVerificationCenter?: (tab?: 'status' | 'vouch_classmates' | 'upload_id' | 'policy') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onNavigate,
  searchQuery,
  onSearchChange,
  onOpenVerificationCenter,
}) => {
  const { currentUser, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadPortalNotifications()
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pendingVouchRequestsCount, setPendingVouchRequestsCount] = useState<number>(() =>
    loadVouchRequests().filter((r) => r.status === 'pending').length
  );

  const isUserVerified = (currentUser.verificationStatus || 'verified') === 'verified';
  const userVouchesCount = currentUser.vouchesCount ?? (currentUser.verifiedBy?.length ?? (isUserVerified ? 2 : 0));

  useEffect(() => {
    const syncVouches = () => {
      setPendingVouchRequestsCount(
        loadVouchRequests().filter((r) => r.status === 'pending').length
      );
    };
    const syncNotifications = () => {
      const local = loadPortalNotifications();
      setNotifications(local);
      if (currentUser?.id) {
        fetchNotificationsFromDb(currentUser.id)
          .then((dbNotifs) => {
            if (dbNotifs && dbNotifs.length > 0) {
              setNotifications((prev) => {
                const map = new Map<string | number, NotificationItem>();
                dbNotifs.forEach((n) => map.set(n.id, n));
                prev.forEach((n) => {
                  if (!map.has(n.id)) map.set(n.id, n);
                });
                return Array.from(map.values());
              });
            }
          })
          .catch(() => {});
      }
    };
    syncNotifications();
    window.addEventListener('ndc_vouch_requests_updated', syncVouches);
    window.addEventListener('ndc_notifications_updated', syncNotifications);
    window.addEventListener('storage', syncNotifications);
    return () => {
      window.removeEventListener('ndc_vouch_requests_updated', syncVouches);
      window.removeEventListener('ndc_notifications_updated', syncNotifications);
      window.removeEventListener('storage', syncNotifications);
    };
  }, [currentUser?.id]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    const next = notifications.map((n) => {
      markNotificationReadInDb(String(n.id)).catch(() => {});
      return { ...n, unread: false };
    });
    setNotifications(next);
    savePortalNotifications(next);
  };

  const markItemAsRead = (id: number, targetRoute?: string) => {
    markNotificationReadInDb(String(id)).catch(() => {});
    const next = notifications.map((n) => (n.id === id ? { ...n, unread: false } : n));
    setNotifications(next);
    savePortalNotifications(next);
    if (targetRoute) {
      setShowNotifications(false);
      onNavigate(targetRoute);
    }
  };

  const dismissNotificationItem = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const next = notifications.filter((n) => n.id !== id);
    setNotifications(next);
    savePortalNotifications(next);
  };

  return (
    <header className="sticky top-0 z-40 h-18 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/10 shadow-xs transition-colors duration-200">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3 max-w-[1600px] mx-auto">
        {/* Left: Mobile Toggle, Mobile Brand & Search */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 max-w-2xl">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile-only logo display */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="lg:hidden shrink-0 flex items-center"
            title="Notre Dame Alumni Home"
          >
            <NDCLogo className="w-8 h-8" />
          </button>

          {/* Global Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Notredamians, batch, profession, company..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        {/* Right Actions: Theme Toggle, Notifications, Messages, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex items-center">
            <ThemeToggle />
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all as read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      aria-label="Close notifications"
                      title="Close notifications"
                      className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => markItemAsRead(item.id, item.targetRoute)}
                      className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors relative group ${
                        item.unread
                          ? 'bg-blue-50/50 dark:bg-blue-950/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 pr-6">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {item.unread ? item.timeAgo : `Seen · ${item.timeAgo}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed pr-5">
                        {item.message}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => dismissNotificationItem(e, item.id)}
                        aria-label="Close notification"
                        title="Dismiss notification"
                        className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Messages Button (Placeholder / Teaser) */}
          <button
            type="button"
            onClick={() => onNavigate('feed')}
            className="hidden sm:flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Messages"
            aria-label="Messages"
          >
            <Mail className="w-5 h-5" />
          </button>

          {/* User Profile Trigger & Dropdown */}
          <div className="relative pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="relative">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20 dark:ring-blue-400/30"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900 rounded-full" />
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1">
                  <span>{currentUser.fullName.split(' ')[0]} {currentUser.fullName.split(' ')[1] || ''}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Batch {currentUser.batchYear} · {currentUser.profession}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email || 'alumni@notredamecollege.edu'}
                  </div>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('profile-settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Account Settings
                  </button>

                  {onOpenVerificationCenter && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenVerificationCenter('status');
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Verification Center</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isUserVerified
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {isUserVerified ? 'Verified' : `${userVouchesCount}/2`}
                      </span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      onNavigate('landing');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
