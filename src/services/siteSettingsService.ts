/**
 * Site Settings & Institutional Branding Service
 * Provides full no-code administrative management for portal branding, logos,
 * backgrounds, reunion details, official notices, and emergency broadcasts.
 */

import { OFFICIAL_NOTICES, OfficialNotice, BANK_DONATION_INFO } from '../data/noticesData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SiteBrandingSettings {
  logoUrl: string;
  logoAlt: string;
  faviconUrl: string;
  siteTitle: string;
  shortTagline: string;
  collegeMotto: string;
  establishedYear: number;
  totalBatchesCount: number;
  crestBadgeLabel: string;
}

export interface HeroAndBackgroundSettings {
  heroBackgroundUrl: string;
  heroHeadlinePrefix: string;
  heroHeadlineHighlight: string;
  heroHeadlineSuffix: string;
  heroMottoQuote: string;
  heroSubtitle: string;
  bgTexture: 'clean' | 'mesh' | 'aurora' | 'campus-photo' | 'vignette';
  bgOverlayOpacity: number; // 0 to 1
  showLiveOnlinePill: boolean;
  liveOnlinePillText: string;
}

export interface AnnouncementSettings {
  enabled: boolean;
  badgeText: string;
  customTickerOverride: string;
  urgency: 'standard' | 'urgent' | 'emergency';
}

export interface ReunionEventSettings {
  eventTitle: string;
  targetDate: string; // ISO date string e.g. "2026-12-25T09:00:00"
  venue: string;
  registrationStatus: 'open' | 'closing_soon' | 'closed';
  ticketFee: string;
  registrationUrl: string;
  bannerImageUrl: string;
  description: string;
  specialGuestsNote: string;
}

export interface ContactAndBankSettings {
  bankName: string;
  branch: string;
  accountTitle: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  bKashMerchant: string;
  nagadMerchant: string;
  rocketAccount: string;
  secretariatAddress: string;
  helpline: string;
  email: string;
  facebookUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
}

export interface AudioSettings {
  autoPlayMusicDefault: boolean;
  themeAudioUrl: string;
  audioTitle: string;
}

export interface SystemControlsSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowPublicRegistration: boolean;
  requirePhoneVerification: boolean;
  allowGuestFeedBrowsing: boolean;
}

export interface PortalSiteSettings {
  branding: SiteBrandingSettings;
  heroAndBackground: HeroAndBackgroundSettings;
  announcement: AnnouncementSettings;
  reunion: ReunionEventSettings;
  notices: OfficialNotice[];
  contactAndBank: ContactAndBankSettings;
  audio: AudioSettings;
  systemControls: SystemControlsSettings;
  lastUpdated: string;
  updatedByProfileId?: number | null;
}

export const PRESET_LOGOS = [
  {
    id: 'official-svg',
    name: 'Official Notre Dame College Crest (SVG Vector)',
    url: '/ndc-logo.svg',
    description: 'High-definition vector crest with Latin motto and heraldic blue shield',
  },
  {
    id: 'official-png',
    name: 'Official Crest (PNG)',
    url: '/ndc-logo.png',
    description: 'Standard transparent PNG crest for general display',
  },
  {
    id: 'golden-crest',
    name: 'Historic Gold Crest Artwork',
    url: '/src/assets/images/ndc_official_crest_1790240048868.jpg',
    description: 'Original ceremonial gold embossed crest emblem',
  },
  {
    id: 'szmc-joint',
    name: 'SZMC & NDC Collaboration Emblem',
    url: '/szmc-logo.png',
    description: 'Joint institutional emblem for health & alumni programs',
  },
];

export const PRESET_HERO_BACKGROUNDS = [
  {
    id: 'mosaic-monument',
    name: 'NDC Historic Mosaic Monument',
    url: '/src/assets/images/ndc_mosaic_monument_1791118817180.jpg',
    description: 'The iconic mosaic mural monument facing the campus entrance',
  },
  {
    id: 'campus-hero',
    name: 'Campus Quad & Main Academic Building',
    url: '/src/assets/images/ndc_campus_hero_1790233370828.jpg',
    description: 'Panoramic view of the green courtyard and Fr. Timm Building',
  },
  {
    id: 'main-gate',
    name: 'Arambagh Campus Main Gate',
    url: '/src/assets/images/ndc_main_gate_1790748632254.jpg',
    description: 'The welcoming historic gate on Arambagh road',
  },
  {
    id: 'reunion-celebration',
    name: 'Reunion Grand Celebration Stage',
    url: '/src/assets/images/ndc_reunion_celebration_1790233384454.jpg',
    description: 'Golden jubilee evening illumination with alumni gathering',
  },
  {
    id: 'badminton-court',
    name: 'Badminton Court & Sports Ground',
    url: '/src/assets/images/ndc_badminton_court_1790748659189.jpg',
    description: 'Sports pavilion and outdoor court memories',
  },
  {
    id: 'campus-artwork',
    name: 'Notre Dame Watercolor Artwork',
    url: '/src/assets/images/ndc_campus_artwork_1790748644859.jpg',
    description: 'Artistic painterly rendering of the college quadrangle',
  },
];

export const DEFAULT_SITE_SETTINGS: PortalSiteSettings = {
  branding: {
    logoUrl: '/ndc-logo.svg',
    logoAlt: 'Notre Dame College Dhaka Crest',
    faviconUrl: '/ndc-logo.svg',
    siteTitle: 'Notre Dame College Alumni',
    shortTagline: 'NDC Dhaka • Diligite Lumen Sapientiae',
    collegeMotto: 'Once a Notre Damian, Always a Notre Damian.',
    establishedYear: 1949,
    totalBatchesCount: 76,
    crestBadgeLabel: 'Established 1949 • Dhaka',
  },
  heroAndBackground: {
    heroBackgroundUrl: '/src/assets/images/ndc_campus_hero_1790233370828.jpg',
    heroHeadlinePrefix: 'The Private Social Network for',
    heroHeadlineHighlight: 'Notre Dame College Alumni.',
    heroHeadlineSuffix: '',
    heroMottoQuote: '“Once a Notre Damian, Always a Notre Damian.”',
    heroSubtitle:
      'Where Notredamians from Batch 01 to HSC 2026 connect, reminisce campus memories, seek career mentorship, and chat in private batch lounges — away from public social media noise.',
    bgTexture: 'clean',
    bgOverlayOpacity: 0.35,
    showLiveOnlinePill: true,
    liveOnlinePillText: '340+ Online • 76 Batches • 42 Countries',
  },
  announcement: {
    enabled: true,
    badgeText: 'OFFICIAL NOTICE',
    customTickerOverride: '',
    urgency: 'urgent',
  },
  reunion: {
    eventTitle: 'Notre Dame Grand Reunion & Platinum Jubilee Gala',
    targetDate: '2026-12-25T09:00:00',
    venue: 'Notre Dame College Campus Quad & Fr. Timm Building, Arambagh, Motijheel, Dhaka-1000',
    registrationStatus: 'open',
    ticketFee: 'BDT 2,500 / $30 (Includes Souvenir Crest & Gala Banquet)',
    registrationUrl: '#',
    bannerImageUrl: '/src/assets/images/ndc_always_notredamian_reunion_1791119708714.jpg',
    description:
      'The grandest congregation of Notre Dame College graduates. Rekindle cherished memories with mentors, Holy Cross fathers, seniors, batchmates, and juniors under the historic campus sky of Motijheel.',
    specialGuestsNote: 'Chief Patron: Rev. Fr. Dr. Hemanto Rozario, CSC, Principal',
  },
  notices: OFFICIAL_NOTICES,
  contactAndBank: {
    bankName: BANK_DONATION_INFO.bankName,
    branch: BANK_DONATION_INFO.branch,
    accountTitle: BANK_DONATION_INFO.accountTitle,
    accountNumber: BANK_DONATION_INFO.accountNumber,
    routingNumber: BANK_DONATION_INFO.routingNumber,
    swiftCode: BANK_DONATION_INFO.swiftCode,
    bKashMerchant: BANK_DONATION_INFO.bKashMerchant,
    nagadMerchant: BANK_DONATION_INFO.nagadMerchant,
    rocketAccount: BANK_DONATION_INFO.rocketAccount,
    secretariatAddress: BANK_DONATION_INFO.secretariatAddress,
    helpline: BANK_DONATION_INFO.helpline,
    email: BANK_DONATION_INFO.email,
    facebookUrl: 'https://facebook.com/ndc.alumni.official',
    linkedinUrl: 'https://linkedin.com/school/notredamecollege-dhaka',
    youtubeUrl: 'https://youtube.com/@notredamecollegedhaka',
  },
  audio: {
    autoPlayMusicDefault: false,
    themeAudioUrl: '/audio/ndc-theme.mp3',
    audioTitle: 'Notre Dame College College Anthem & Theme',
  },
  systemControls: {
    maintenanceMode: false,
    maintenanceMessage:
      'The Alumni Portal is undergoing brief scheduled maintenance. All member records and verifications are preserved.',
    allowPublicRegistration: true,
    requirePhoneVerification: false,
    allowGuestFeedBrowsing: true,
  },
  lastUpdated: new Date().toISOString(),
};

const STORAGE_KEY = 'ndc_portal_site_settings_v2';
const EVENT_NAME = 'ndc_site_settings_updated';

/**
 * Load persisted site settings from storage or defaults
 */
export function getSiteSettings(): PortalSiteSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SITE_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...parsed,
      branding: { ...DEFAULT_SITE_SETTINGS.branding, ...(parsed.branding || {}) },
      heroAndBackground: { ...DEFAULT_SITE_SETTINGS.heroAndBackground, ...(parsed.heroAndBackground || {}) },
      announcement: { ...DEFAULT_SITE_SETTINGS.announcement, ...(parsed.announcement || {}) },
      reunion: { ...DEFAULT_SITE_SETTINGS.reunion, ...(parsed.reunion || {}) },
      notices: Array.isArray(parsed.notices) && parsed.notices.length > 0 ? parsed.notices : OFFICIAL_NOTICES,
      contactAndBank: { ...DEFAULT_SITE_SETTINGS.contactAndBank, ...(parsed.contactAndBank || {}) },
      audio: { ...DEFAULT_SITE_SETTINGS.audio, ...(parsed.audio || {}) },
      systemControls: { ...DEFAULT_SITE_SETTINGS.systemControls, ...(parsed.systemControls || {}) },
    };
  } catch (err) {
    console.warn('Error reading portal site settings:', err);
    return DEFAULT_SITE_SETTINGS;
  }
}

/**
 * Save site settings and broadcast change event to entire app
 */
export function saveSiteSettings(newSettings: Partial<PortalSiteSettings>): PortalSiteSettings {
  const current = getSiteSettings();
  const merged: PortalSiteSettings = {
    ...current,
    ...newSettings,
    branding: { ...current.branding, ...(newSettings.branding || {}) },
    heroAndBackground: { ...current.heroAndBackground, ...(newSettings.heroAndBackground || {}) },
    announcement: { ...current.announcement, ...(newSettings.announcement || {}) },
    reunion: { ...current.reunion, ...(newSettings.reunion || {}) },
    notices: newSettings.notices || current.notices,
    contactAndBank: { ...current.contactAndBank, ...(newSettings.contactAndBank || {}) },
    audio: { ...current.audio, ...(newSettings.audio || {}) },
    systemControls: { ...current.systemControls, ...(newSettings.systemControls || {}) },
    lastUpdated: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: merged }));
    } catch (err) {
      console.warn('Failed to save portal site settings:', err);
    }
  }

  // Non-blocking optional sync to Supabase if configured & table exists
  if (isSupabaseConfigured) {
    (async () => {
      try {
        const { error } = await supabase
          .from('portal_site_settings')
          .upsert({
            id: 'current',
            settings: merged,
            updated_at: new Date().toISOString(),
          });
        if (error && error.code !== '42P01') {
          // 42P01 is table does not exist - safe to ignore
          console.warn('Supabase site settings cloud sync:', error.message);
        }
      } catch {
        // Safe fallback
      }
    })();
  }

  return merged;
}

/**
 * Attempt to pull latest cloud site settings from Supabase if table exists
 */
export async function syncCloudSiteSettings(): Promise<PortalSiteSettings | null> {
  if (!isSupabaseConfigured || typeof window === 'undefined') return null;
  try {
    const { data, error } = await supabase
      .from('portal_site_settings')
      .select('settings')
      .eq('id', 'current')
      .maybeSingle();

    if (error || !data || !data.settings) {
      return null;
    }

    const cloud = data.settings as Partial<PortalSiteSettings>;
    const local = getSiteSettings();
    const merged: PortalSiteSettings = {
      ...local,
      ...cloud,
      branding: { ...local.branding, ...(cloud.branding || {}) },
      heroAndBackground: { ...local.heroAndBackground, ...(cloud.heroAndBackground || {}) },
      announcement: { ...local.announcement, ...(cloud.announcement || {}) },
      reunion: { ...local.reunion, ...(cloud.reunion || {}) },
      notices: cloud.notices || local.notices,
      contactAndBank: { ...local.contactAndBank, ...(cloud.contactAndBank || {}) },
      audio: { ...local.audio, ...(cloud.audio || {}) },
      systemControls: { ...local.systemControls, ...(cloud.systemControls || {}) },
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: merged }));
    return merged;
  } catch {
    return null;
  }
}

// Automatically initiate passive background sync on module load if in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncCloudSiteSettings().catch(() => {});
  }, 1000);
}

/**
 * Reset all site settings to official college defaults
 */
export function resetSiteSettingsToDefault(): PortalSiteSettings {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: DEFAULT_SITE_SETTINGS }));
    } catch {}
  }
  return DEFAULT_SITE_SETTINGS;
}

/**
 * Export portal configuration as clean JSON for backup
 */
export function exportSiteSettingsAsJson(): string {
  const settings = getSiteSettings();
  return JSON.stringify(settings, null, 2);
}

/**
 * Import portal configuration from JSON string
 */
export function importSiteSettingsFromJson(jsonStr: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file format.' };
    }
    saveSiteSettings(parsed);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to parse configuration JSON.' };
  }
}
