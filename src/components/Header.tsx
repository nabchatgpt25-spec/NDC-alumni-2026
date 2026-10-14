import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  Search,
  Bell,
  Mail,
  ChevronDown,
  CheckCheck,
  User,
  LogOut,
  ShieldCheck,
  Clock,
  X,
  Settings,
  ThumbsUp,
  MessageCircle,
  Droplet,
  Heart,
  BellOff,
} from 'lucide-react';
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
  markNotificationReadInDb,
} from '../services/supabaseService';
import { loadMergedNotifications } from '../utils/notificationService';

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
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
      if (currentUser?.id) {
        loadMergedNotifications(currentUser.id)
          .then((items) => {
            if (items) {
              setNotifications(items);
            }
          })
          .catch((err) => {
            console.warn('Failed to load merged notifications:', err);
          });
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

  const markItemAsRead = (item: NotificationItem) => {
    markNotificationReadInDb(String(item.id)).catch(() => {});
    const next = notifications.map((n) => (n.id === item.id ? { ...n, unread: false } : n));
    setNotifications(next);
    savePortalNotifications(next);
    setShowNotifications(false);

    if (item.postId) {
      window.location.hash = `post-${item.postId}`;
      onNavigate('feed');
      setTimeout(() => {
        const el = document.getElementById(`post-${item.postId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-blue-500/50', 'transition-all');
          setTimeout(() => el.classList.remove('ring-4', 'ring-blue-500/50'), 2500);
        }
      }, 350);
      return;
    }

    if (item.bloodRequestId) {
      window.location.hash = `blood-req-${item.bloodRequestId}`;
      onNavigate('emergency');
      return;
    }

    if (item.photoId) {
      window.location.hash = `photo-${item.photoId}`;
      onNavigate('gallery');
      return;
    }

    if (item.targetRoute) {
      onNavigate(item.targetRoute);
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
      <div className="h-full px-3 sm:px-6 flex items-center justify-between gap-2.5 sm:gap-3 max-w-[1600px] mx-auto">
        {/* Left: Mobile Toggle, Mobile Brand & Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-2xl">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile-only logo display */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="lg:hidden shrink-0 hidden min-[360px]:flex items-center cursor-pointer"
            title="Notre Dame Alumni Home"
          >
            <NDCLogo className="w-8 h-8" />
          </button>

          {/* Global Search Bar */}
          <div className="relative w-full min-w-0">
            <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search alumni, batch..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-2.5 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all truncate"
            />
          </div>
        </div>

        {/* Right Actions: Theme Toggle, Notifications, Messages, Profile */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
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
              className="relative p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] sm:min-w-[18px] h-4 sm:h-[18px] px-1 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[420px] max-w-sm sm:max-w-none bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 mx-auto sm:mx-0">
                {/* Header */}
                <div className="px-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer py-1 px-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                          title="Mark all as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Mark all as read</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        aria-label="Close notifications"
                        title="Close notifications"
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Facebook Filter Tabs (All / Unread) */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <button
                      type="button"
                      onClick={() => setNotifFilter('all')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        notifFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter('unread')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        notifFilter === 'unread'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>Unread</span>
                      {unreadCount > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          notifFilter === 'unread' ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                        }`}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100/80 dark:divide-slate-800/60">
                  {notifications
                    .filter((n) => notifFilter === 'all' || n.unread)
                    .map((item) => {
                      const isLike = item.type === 'like';
                      const isComment = item.type === 'comment';
                      const isBlood = item.type === 'blood';

                      return (
                        <div
                          key={item.id}
                          onClick={() => markItemAsRead(item)}
                          className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors relative flex items-start gap-3 group ${
                            item.unread
                              ? 'bg-blue-50/50 dark:bg-blue-950/20'
                              : ''
                          }`}
                        >
                          {/* Facebook-style Actor Avatar with Action Badge */}
                          <div className="relative shrink-0 mt-0.5">
                            {item.actorAvatar ? (
                              <img
                                src={item.actorAvatar}
                                alt={item.actorName || 'Alumnus'}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isBlood
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 ring-2 ring-rose-200 dark:ring-rose-900'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                                }`}
                              >
                                {isBlood ? (
                                  <Droplet className="w-5 h-5 fill-current" />
                                ) : (
                                  <User className="w-5 h-5" />
                                )}
                              </div>
                            )}

                            {/* Mini Corner Badge */}
                            <div
                              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-900 shadow-xs ${
                                isLike
                                  ? 'bg-blue-600'
                                  : isComment
                                  ? 'bg-emerald-600'
                                  : isBlood
                                  ? 'bg-rose-600'
                                  : 'bg-indigo-600'
                              }`}
                            >
                              {isLike ? (
                                <ThumbsUp className="w-2.5 h-2.5 fill-current" />
                              ) : isComment ? (
                                <MessageCircle className="w-2.5 h-2.5 fill-current" />
                              ) : isBlood ? (
                                <Heart className="w-2.5 h-2.5 fill-current" />
                              ) : (
                                <ShieldCheck className="w-2.5 h-2.5" />
                              )}
                            </div>
                          </div>

                          {/* Text Information */}
                          <div className="flex-1 min-w-0 pr-6">
                            {isBlood && item.isMatchedDonorAlert && (
                              <div className="mb-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-rose-600 text-white shadow-xs">
                                  <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                  Matched Donor Alert
                                </span>
                              </div>
                            )}

                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                              {item.actorName ? (
                                <span className="font-bold text-slate-900 dark:text-slate-100 mr-1">
                                  {item.actorName}
                                </span>
                              ) : null}
                              <span className={item.actorName ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-100'}>
                                {item.actorName
                                  ? item.title.replace(item.actorName, '').trim() || item.title
                                  : item.title}
                              </span>
                            </p>

                            {item.message && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {item.message}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-1.5">
                              <span
                                className={`text-[11px] ${
                                  item.unread
                                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                                    : 'text-slate-400 dark:text-slate-500 font-medium'
                                }`}
                              >
                                {item.timeAgo}
                              </span>
                              {item.unread && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Dismiss Button */}
                          <button
                            type="button"
                            onClick={(e) => dismissNotificationItem(e, item.id)}
                            aria-label="Close notification"
                            title="Dismiss notification"
                            className="opacity-0 group-hover:opacity-100 absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                  {notifications.filter((n) => notifFilter === 'all' || n.unread).length === 0 && (
                    <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2.5">
                        <BellOff className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {notifFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        You're all caught up with your alumni network!
                      </p>
                    </div>
                  )}
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
              <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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

                  {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('admin');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Admin Hub &amp; Manager</span>
                      </span>
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                        {currentUser.role === 'admin' ? 'ADMIN' : 'MOD'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Settings
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
