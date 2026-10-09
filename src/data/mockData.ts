import { AlumniProfile, PostItem, NotificationItem, BatchSummary } from '../types';
import campusHeroImg from '../assets/images/ndc_campus_hero_1790233370828.jpg';

export const PROFILES_STORAGE_KEY = 'ndc_alumni_profiles';
export const POSTS_STORAGE_KEY = 'ndc_alumni_posts';

export const SEED_ALUMNI_PROFILES: AlumniProfile[] = [];

/**
 * Load persisted alumni profiles from local storage.
 * Filters out legacy demo records (id 101 to 116) so only real user registrations appear.
 */
export const loadStoredAlumniProfiles = (): AlumniProfile[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (p) =>
            p &&
            p.id &&
            !(p.id >= 101 && p.id <= 120) &&
            !(p.id >= 1001 && p.id <= 1006) &&
            !(p.id >= 800000 && p.id <= 999999)
        );
      }
    }
  } catch (e) {
    console.warn("Failed to load alumni profiles from storage", e);
  }
  return [];
};

/**
 * Save registered alumni profiles into persistent storage.
 */
export const saveStoredAlumniProfiles = (profiles: AlumniProfile[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Failed to save alumni profiles to storage', e);
  }
};

/**
 * Fallback empty user structure used when no user is signed in yet.
 */
export const DEFAULT_BLANK_USER: AlumniProfile = {
  id: 0,
  userId: 0,
  fullName: 'Notredamian Alumnus',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  coverUrl: campusHeroImg,
  batchYear: 68,
  session: '2016-18 (HSC 2018)',
  group: 'Science',
  collegeRoll: '118042',
  profession: 'Engineer / Tech',
  position: 'Senior Software Engineer',
  institution: 'Tech & AI Systems',
  specialty: ['Computer Science & Software', 'Artificial Intelligence & Data'],
  degree: ['HSC', 'BSc Engineering'],
  city: 'Dhaka',
  country: 'Bangladesh',
  isPublic: true,
  online: true,
  lastSeen: 'Now',
  postsCount: 0,
  badges: ['Verified Notredamian', 'NDSC Alumnus'],
  bio: 'Proud Notredamian. Diligite Lumen Sapientiae. Connected with alumni worldwide.',
};

// Aliased for backward compatibility in imports
export const CURRENT_USER: AlumniProfile = DEFAULT_BLANK_USER;

/**
 * Active alumni profiles list.
 * Initialized from storage (starts empty [] so real users can add real data).
 */
export const ALUMNI_PROFILES: AlumniProfile[] = loadStoredAlumniProfiles();

export const INITIAL_POSTS: PostItem[] = [];

// Notre Dame College Dhaka Generational Batches (Est. 1949, Batches 1 to 78)
const SPECIAL_BATCH_NOTES: Record<number, { note: string }> = {
  1: { note: 'Pioneer' },
  22: { note: 'Liberation Era' },
  25: { note: 'Silver Jubilee' },
  50: { note: 'Golden Jubilee' },
  70: { note: '70 Years' },
  74: { note: 'Platinum' },
  75: { note: '75th Diamond' },
  78: { note: 'Latest Cohort' },
};

export const BATCH_LIST: BatchSummary[] = Array.from({ length: 78 }, (_, idx) => {
  const batchNum = idx + 1;
  const startYear = 1948 + batchNum;
  const sessionEndYear = startYear + 1;
  const hscYear = startYear + 2;
  const sessionEndShort = String(sessionEndYear).slice(-2);
  const hscYearShort = String(hscYear).slice(-2);
  const special = SPECIAL_BATCH_NOTES[batchNum];

  return {
    batchYear: batchNum,
    session: `(${startYear}-${sessionEndShort}), HSC ${hscYearShort}`,
    total: null,
    specialNote: special?.note,
  };
});

export const NOTIFICATIONS_LIST: NotificationItem[] = [];
