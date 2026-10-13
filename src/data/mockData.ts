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
  avatarUrl: '/ndc-logo.png',
  coverUrl: campusHeroImg,
  batchYear: undefined,
  session: undefined,
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

// Notre Dame College Generational Batches (Est. 1949, HSC 1949 to current year + 1)
const START_HSC_YEAR = 1949;
const END_HSC_YEAR = new Date().getFullYear() + 1;

export const BATCH_LIST: BatchSummary[] = Array.from(
  { length: END_HSC_YEAR - START_HSC_YEAR + 1 },
  (_, idx) => {
    const hscYear = START_HSC_YEAR + idx;
    const startYear = hscYear - 2;
    const sessionEndYear = hscYear - 1;
    const sessionEndShort = String(sessionEndYear).slice(-2);
    const hscYearShort = String(hscYear).slice(-2);

    let note: string | undefined = undefined;
    if (hscYear === START_HSC_YEAR) note = '1st Pioneer';
    else if (hscYear === END_HSC_YEAR) note = 'Latest Cohort';

    return {
      batchYear: hscYear,
      session: `(${startYear}-${sessionEndShort}), HSC ${hscYearShort}`,
      total: null,
      specialNote: note,
    };
  }
);

export const NOTIFICATIONS_LIST: NotificationItem[] = [];
