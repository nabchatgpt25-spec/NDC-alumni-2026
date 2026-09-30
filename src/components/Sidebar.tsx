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
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useTheme } from '../context/ThemeContext';
import { NDCLogo } from './NDCLogo';

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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  customNavItems,
}) => {
  const { isDark, toggleTheme } = useTheme();

  // Navigation items defined strictly according to project specifications
  const defaultNavItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'alumni', label: 'Alumni Directory', icon: Users },
    { id: 'find', label: 'Find Alumni', icon: Search },
    { id: 'saved-posts', label: 'Saved Posts', icon: BookmarkCheck, badge: 'OFFLINE', badgeType: 'count' },
    { id: 'map', label: 'Alumni Map', icon: MapPin },
    { id: 'batches', label: 'Batch Directory', icon: BookOpen },
    { id: 'institutions', label: 'Institutions', icon: Building2, badge: 'SOON', badgeType: 'soon' },
    { id: 'mentorship', label: 'Mentorship', icon: GraduationCap, badge: 'SOON', badgeType: 'soon' },
    { id: 'news', label: 'News & Blog', icon: Newspaper, badge: 'SOON', badgeType: 'soon' },
    { id: 'events', label: 'Events', icon: Calendar, badge: 'SOON', badgeType: 'soon' },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'careers', label: 'Career Portal', icon: Briefcase, badge: 'SOON', badgeType: 'soon' },
    { id: 'emergency', label: 'Emergency Help', icon: HeartHandshake, badge: 'SOON', badgeType: 'soon' },
    { id: 'contact', label: 'Contact Us', icon: Mail },
  ];

  const navItems = customNavItems || defaultNavItems;

  const isItemActive = (id: string) => {
    if (activeTab === id) return true;
    if (id === 'dashboard' && activeTab === 'feed') return true;
    if (id === 'alumni' && activeTab === 'directory') return true;
    if (id === 'batches' && activeTab.startsWith('batch:')) return true;
    return false;
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

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand Header */}
        <div className="h-18 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              onSelectTab('dashboard');
              onClose();
            }}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              <NDCLogo className="w-full h-full" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
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
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all text-left cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-white' : 'text-slate-400 dark:text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`shrink-0 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border tracking-wider transition-colors ${
                      active
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* User Account / Profile Navigation item */}
          <div className="pt-3 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>Account & Themes</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectTab('profile');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all text-left cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User
              className={`w-4 h-4 ${
                activeTab === 'profile' ? 'text-white' : 'text-slate-400 dark:text-slate-400'
              }`}
            />
            <span>My Profile</span>
          </button>

          {/* Quick Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition-all text-left cursor-pointer mt-1"
          >
            <div className="flex items-center gap-3">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              )}
              <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>
        </div>

        {/* Bottom Card */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
          <PWAInstallButton className="w-full justify-center mb-3" />
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/60 border border-blue-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                NDC Reunion 2026
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">
              Connecting Notredamians from Batch 01 (1949) to HSC 2026. Forever brothers.
            </p>
            <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
              Motijheel, Dhaka, Bangladesh
            </div>
          </div>
          <div className="mt-2.5 text-center text-[10px] text-slate-400 dark:text-slate-500">
            Designed & Developed by{' '}
            <a
              href="http://nurulanambashir.gt.tc/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Only Bashir-34
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
