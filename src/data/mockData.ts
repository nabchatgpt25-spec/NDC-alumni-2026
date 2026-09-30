import { AlumniProfile, PostItem, NotificationItem, BatchSummary } from '../types';

export const PROFILES_STORAGE_KEY = 'ndc_alumni_profiles';
export const POSTS_STORAGE_KEY = 'ndc_alumni_posts';

/**
 * Load persisted alumni profiles from local storage.
 * Starts completely empty by default so real alumni can register and populate their real data.
 */
export const loadStoredAlumniProfiles = (): AlumniProfile[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load alumni profiles from storage', e);
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
  coverUrl: '/src/assets/images/ndc_campus_hero_1790233370828.jpg',
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

// Notre Dame College Dhaka Generational Batches (Est. 1949, 75+ Batches)
export const BATCH_LIST: BatchSummary[] = [
  { batchYear: 1, session: '1949-51 (Pioneer)', total: 64, representative: 'Founding Holy Cross Class' },
  { batchYear: 10, session: '1958-60', total: 112, representative: 'Batch Secretariat' },
  { batchYear: 20, session: '1968-70', total: 240, representative: 'Pre-Liberation Cohort' },
  { batchYear: 25, session: '1973-75 (Silver)', total: 310, representative: 'Silver Jubilee Batch' },
  { batchYear: 30, session: '1978-80', total: 390, representative: 'Batch Rep Committee' },
  { batchYear: 35, session: '1983-85', total: 460, representative: 'Dr. Tariqul Islam' },
  { batchYear: 40, session: '1988-90', total: 540, representative: 'Engr. Masud Alam' },
  { batchYear: 45, session: '1993-95', total: 620, representative: 'Tanvir Hossain' },
  { batchYear: 50, session: '1998-00 (Golden)', total: 780, representative: 'Golden Jubilee Core' },
  { batchYear: 55, session: '2003-05', total: 850, representative: 'Dr. K. M. Rahman' },
  { batchYear: 60, session: '2008-10', total: 980, representative: 'Syed Farhan' },
  { batchYear: 61, session: '2009-11', total: 1010, representative: 'Asifur Rahman' },
  { batchYear: 62, session: '2010-12', total: 1045, representative: 'Mehedi Hasan' },
  { batchYear: 63, session: '2011-13', total: 1090, representative: 'Shuvro Dev' },
  { batchYear: 64, session: '2012-14', total: 1120, representative: 'Abrar Zahin' },
  { batchYear: 65, session: '2013-15', total: 1160, representative: 'Sajid Al Mahbub' },
  { batchYear: 66, session: '2014-16', total: 1205, representative: 'Rashedul Karim' },
  { batchYear: 67, session: '2015-17', total: 1250, representative: 'Tanmoy Paul' },
  { batchYear: 68, session: '2016-18', total: 1290, representative: 'Tahmidur Rahman' },
  { batchYear: 69, session: '2017-19', total: 1330, representative: 'Nafis Sadik' },
  { batchYear: 70, session: '2018-20 (70 Years)', total: 1380, representative: 'Zubair Hossain' },
  { batchYear: 71, session: '2019-21', total: 1420, representative: 'Fahim Shahriar' },
  { batchYear: 72, session: '2020-22', total: 1470, representative: 'Shafayat Jamil' },
  { batchYear: 73, session: '2021-23', total: 1510, representative: 'Mahir Faysal' },
  { batchYear: 74, session: '2022-24 (Platinum)', total: 1560, representative: 'Arib Ahsan' },
  { batchYear: 75, session: '2023-25', total: 1600, representative: 'Adib Chowdhury' },
  { batchYear: 76, session: '2024-26 (HSC 2026)', total: 1650, representative: 'Batch Council 76' },
];

export const NOTIFICATIONS_LIST: NotificationItem[] = [
  {
    id: 1,
    title: 'Welcome to Notre Dame Alumni Connect',
    message: 'Register your verified Notredamian profile and connect with batchmates across the world.',
    timeAgo: 'Just now',
    unread: true,
    type: 'system',
  },
  {
    id: 2,
    title: 'NDC Platinum Jubilee & Grand Reunion 2026',
    message: 'Registration is open for the Grand Reunion on the historic Motijheel campus grounds.',
    timeAgo: '1h ago',
    unread: true,
    type: 'system',
  },
];
