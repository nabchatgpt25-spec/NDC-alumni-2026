import { AlumniProfile, PostItem } from '../types';

export const CACHED_DIRECTORY_KEY = 'ndc_cached_directory';
export const CACHED_DIRECTORY_TIMESTAMP_KEY = 'ndc_cached_directory_timestamp';
export const SAVED_POSTS_KEY = 'ndc_cached_saved_posts';
export const SAVED_POST_IDS_KEY = 'ndc_saved_post_ids';

/**
 * Initial offline fallback directory dataset representing diverse Notre Dame College batches and professions.
 * Ensured available in offline mode so users can browse and verify offline search immediately.
 */
export const INITIAL_OFFLINE_DIRECTORY: AlumniProfile[] = [
  {
    id: 1001,
    userId: 1001,
    fullName: 'Prof. Mahfuzur Rahman, PhD',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    coverUrl: '/src/assets/images/ndc_campus_hero_1790233370828.jpg',
    batchYear: 45,
    session: '1993-95',
    group: 'Science',
    collegeRoll: '195012',
    profession: 'Academic & Scientist',
    position: 'Professor & Head of Computer Science',
    institution: 'Bangladesh University of Engineering and Technology (BUET)',
    specialty: ['Computer Science & Software', 'Artificial Intelligence & Data'],
    degree: ['HSC', 'BSc Engineering', 'PhD'],
    city: 'Dhaka',
    country: 'Bangladesh',
    phone: '+880 1711-234567',
    email: 'mahfuz.ndc@gmail.com',
    whatsapp: '8801711234567',
    bio: 'Batch 45 (HSC 1995) Notredamian. Former NDSC Executive. Dedicated to advancing computer science education and AI research in Bangladesh.',
    isPublic: true,
    online: true,
    lastSeen: 'Now',
    postsCount: 14,
    badges: ['Distinguished Alumnus', 'NDSC Fellow', 'BUET Faculty'],
  },
  {
    id: 1002,
    userId: 1002,
    fullName: 'Tanvir Ahmed Chowdhury',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80',
    batchYear: 58,
    session: '2006-08',
    group: 'Science',
    collegeRoll: '108044',
    profession: 'Tech Executive',
    position: 'Staff Engineering Lead',
    institution: 'Google Cloud, Silicon Valley',
    specialty: ['Computer Science & Software', 'Artificial Intelligence & Data'],
    degree: ['HSC', 'BSc Engg (BUET)', 'MSc (Stanford)'],
    city: 'Mountain View, CA',
    country: 'United States',
    phone: '+1 (650) 555-0199',
    email: 'tanvir.chowdhury@alumni.ndc.edu',
    whatsapp: '16505550199',
    bio: 'NDC Batch 58. Passionate about large-scale distributed cloud systems. Always open to mentoring young Notredamians aspiring for top tech careers and global grad school.',
    isPublic: true,
    online: true,
    lastSeen: '15m ago',
    postsCount: 12,
    badges: ['Silicon Valley Chapter', 'Global Mentor'],
  },
  {
    id: 1003,
    userId: 1003,
    fullName: 'Tariqul Islam',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    batchYear: 52,
    session: '2000-02',
    group: 'Science',
    collegeRoll: '102078',
    profession: 'Technology Director & Architect',
    position: 'Principal Cloud & Infrastructure Architect',
    institution: 'Global Enterprise Systems Ltd',
    specialty: ['Civil & Structural Engineering', 'Computer Science & Software'],
    degree: ['HSC', 'BSc in EEE (BUET)', 'MSc in Systems Engineering'],
    city: 'Dhaka',
    country: 'Bangladesh',
    phone: '+880 1713-456789',
    email: 'tariqul.systems@gmail.com',
    whatsapp: '8801713456789',
    bio: 'Batch 52 Notredamian (BUET). Former NDDC debater. Passionate about mission-critical telecommunications, cloud architecture, and mentoring Notredamians.',
    isPublic: true,
    online: false,
    lastSeen: '1h ago',
    postsCount: 19,
    badges: ['Verified Notredamian', 'NDDC Alumnus'],
  },
  {
    id: 1004,
    userId: 1004,
    fullName: 'Syed Farhan Rezwan',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    batchYear: 60,
    session: '2008-10',
    group: 'Business Studies',
    collegeRoll: '210015',
    profession: 'Business Executive & Founder',
    position: 'Managing Director & CEO',
    institution: 'Apex Fintech & Ventures',
    specialty: ['Business Administration & Management', 'Finance, Banking & Investment'],
    degree: ['HSC', 'BBA (IBA, DU)', 'MBA (INSEAD)'],
    city: 'Singapore',
    country: 'Singapore',
    phone: '+65 9123 4567',
    email: 'farhan.rezwan@apexfin.sg',
    whatsapp: '6591234567',
    bio: 'Batch 60 (Commerce stream). Active in venture building and financial technology. Active member of Notre Dame Alumni Singapore Chapter.',
    isPublic: true,
    online: true,
    lastSeen: 'Now',
    postsCount: 22,
    badges: ['Commerce Batch 60', 'Singapore Chapter Lead'],
  },
  {
    id: 1005,
    userId: 1005,
    fullName: 'Barrister Nabeel Hasan',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&auto=format&fit=crop&q=80',
    batchYear: 64,
    session: '2012-14',
    group: 'Humanities',
    collegeRoll: '314008',
    profession: 'Lawyer & Advocate',
    position: 'Advocate, Supreme Court of Bangladesh',
    institution: 'Chambers of Law & Corporate Associates',
    specialty: ['Constitutional & Corporate Law', 'Civil Service & Administration (BCS)'],
    degree: ['HSC', 'LLB (Hons, London)', 'Barrister-at-Law (Lincoln’s Inn)'],
    city: 'Dhaka',
    country: 'Bangladesh',
    phone: '+880 1715-998877',
    email: 'nabeel.hasan@supremecourt.bd',
    whatsapp: '8801715998877',
    bio: 'Batch 64 Humanities. President of NDDC (2013-14). Practicing constitutional, commercial, and human rights law in Dhaka.',
    isPublic: true,
    online: false,
    lastSeen: '2h ago',
    postsCount: 16,
    badges: ['Supreme Court Advocate', 'NDDC Former President'],
  },
  {
    id: 1006,
    userId: 1006,
    fullName: 'Fahim Shahriar',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    coverUrl: '/src/assets/images/ndc_campus_hero_1790233370828.jpg',
    batchYear: 68,
    session: '2016-18',
    group: 'Science',
    collegeRoll: '118088',
    profession: 'Engineer / Tech',
    position: 'Robotics & Embedded Systems Engineer',
    institution: 'Autonomous Mobility Labs',
    specialty: ['Mechanical & Robotics', 'Artificial Intelligence & Data'],
    degree: ['HSC', 'BSc Engg (EEE, BUET)'],
    city: 'Dhaka',
    country: 'Bangladesh',
    phone: '+880 1718-223344',
    email: 'fahim.shahriar@eee.buet.ac.bd',
    whatsapp: '8801718223344',
    bio: 'Batch 68 (HSC 2018). NDITC & NDSC project coordinator. Researching autonomous mobile robotics and edge AI hardware.',
    isPublic: true,
    online: true,
    lastSeen: 'Now',
    postsCount: 9,
    badges: ['HSC 2018', 'Robotics Pioneer'],
  },
];

/**
 * Initial offline fallback saved posts for Notre Dame College.
 */
export const INITIAL_OFFLINE_SAVED_POSTS: PostItem[] = [
  {
    id: 9001,
    userId: 1001,
    fullName: 'Prof. Mahfuzur Rahman, PhD',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    batchYear: 45,
    content:
      'Official Announcement: Notre Dame College Dhaka Platinum Jubilee & Grand Reunion 2026 is officially set for December at our beloved Motijheel campus! All Notredamians from early batches to HSC 2026 are cordially invited. Registration, batch coordinator directories, and souvenir article submission forms are now live on this portal. Diligite Lumen Sapientiae!',
    images: ['/src/assets/images/ndc_campus_hero_1790233370828.jpg'],
    likesCount: 142,
    commentsCount: 38,
    createdAt: '2 days ago',
    likedByMe: true,
    isSaved: true,
    category: 'Reunion',
    comments: [
      {
        id: 9101,
        postId: 9001,
        userId: 1002,
        fullName: 'Tanvir Ahmed Chowdhury',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        content: 'Our Silicon Valley and North America chapter is booking flights to Dhaka for the Grand Reunion! See you all at Ganguly Hall and the green field.',
        likesCount: 24,
        likedByMe: true,
        createdAt: '1 day ago',
      },
    ],
  },
  {
    id: 9002,
    userId: 1003,
    fullName: 'Tariqul Islam',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    batchYear: 52,
    content:
      'Walking past the Father Harrington Building and the basketball ground this morning brought back twenty years of memories. The discipline, the quizzes, the club addas, and the timeless mentorship from our Fathers shaped who we are today. Proud to be a Notredamian forever.',
    images: ['/src/assets/images/ndc_reunion_celebration_1790233384454.jpg'],
    likesCount: 98,
    commentsCount: 17,
    createdAt: '3 days ago',
    likedByMe: false,
    isSaved: true,
    category: 'Achievement',
    comments: [],
  },
];

export function getCachedDirectory(): AlumniProfile[] {
  if (typeof window === 'undefined') return INITIAL_OFFLINE_DIRECTORY;
  try {
    const raw = localStorage.getItem(CACHED_DIRECTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse cached directory', e);
  }
  return INITIAL_OFFLINE_DIRECTORY;
}

export function saveCachedDirectory(profiles: AlumniProfile[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_DIRECTORY_KEY, JSON.stringify(profiles));
    localStorage.setItem(CACHED_DIRECTORY_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Failed to cache directory', e);
  }
}

export function cacheDirectory(profiles: AlumniProfile[]) {
  saveCachedDirectory(profiles);
}

export function getDirectoryCacheTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHED_DIRECTORY_TIMESTAMP_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function getSavedPosts(): PostItem[] {
  if (typeof window === 'undefined') return INITIAL_OFFLINE_SAVED_POSTS;
  try {
    const raw = localStorage.getItem(SAVED_POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse saved posts', e);
  }
  return INITIAL_OFFLINE_SAVED_POSTS;
}

export function saveSavedPosts(posts: PostItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(posts));
  } catch (e) {
    console.warn('Failed to cache saved posts', e);
  }
}

export function getSavedPostIds(): number[] {
  if (typeof window === 'undefined') return [9001, 9002];
  try {
    const raw = localStorage.getItem(SAVED_POST_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse saved post ids', e);
  }
  return [9001, 9002];
}

export function toggleSavedPostId(postId: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const ids = getSavedPostIds();
    const idx = ids.indexOf(postId);
    let isSavedNow = false;
    if (idx > -1) {
      ids.splice(idx, 1);
      isSavedNow = false;
    } else {
      ids.push(postId);
      isSavedNow = true;
    }
    localStorage.setItem(SAVED_POST_IDS_KEY, JSON.stringify(ids));
    return isSavedNow;
  } catch (e) {
    console.warn('Failed to toggle saved post', e);
    return false;
  }
}

export function isPostSaved(postId: number): boolean {
  const ids = getSavedPostIds();
  return ids.includes(postId);
}

export function setSavedPosts(posts: PostItem[]) {
  saveSavedPosts(posts);
}

export function toggleSavePost(post: PostItem): boolean {
  const isSavedNow = toggleSavedPostId(post.id);
  const currentSaved = getSavedPosts();
  if (isSavedNow) {
    if (!currentSaved.some((p) => p.id === post.id)) {
      currentSaved.unshift({ ...post, isSaved: true });
    }
  } else {
    const idx = currentSaved.findIndex((p) => p.id === post.id);
    if (idx > -1) {
      currentSaved.splice(idx, 1);
    }
  }
  saveSavedPosts(currentSaved);
  return isSavedNow;
}

