import { AlumniProfile } from '../types';
import campusHeroImg from '../assets/images/ndc_campus_hero_1790233370828.jpg';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type EliteCategory = 'all' | 'tech' | 'medicine' | 'governance' | 'academia' | 'global';

/**
 * Designated Notre Dame Alumni Administrators whose Gmail is assigned central admin authority.
 */
export const ADMIN_EMAILS: string[] = [
  'bdocouncil.official@gmail.com',
  'admin@notredamecollege.edu',
  'principal@ndc.edu.bd',
];

/**
 * Validates whether an alumni profile belongs to an administrator.
 * Matches either database role 'admin' or an approved administrator gmail address.
 */
export function isAlumnusAdmin(profile?: AlumniProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  const email = (profile.email || '').toLowerCase().trim();
  if (email && ADMIN_EMAILS.some((adm) => adm.toLowerCase() === email)) {
    return true;
  }
  return false;
}

export const INITIAL_FEATURED_ALUMNI: AlumniProfile[] = [
  {
    id: 1001,
    userId: 1001,
    fullName: 'Sir Fazle Hasan Abed KCMG',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 6,
    session: '1954-56 (Pioneer)',
    group: 'Science',
    collegeRoll: 'NDC-06-001',
    profession: 'Global Humanitarian & Social Pioneer',
    position: 'Founder & Chairperson Emeritus',
    institution: 'BRAC (World’s Largest Development Org)',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Global Social Enterprise', 'Poverty Alleviation', 'Public Health Infrastructure'],
    degree: ['HSC (Notre Dame College)', 'Cost Management Accounting (Glasgow)', 'Honorary Doctorates from Oxford, Columbia, Princeton'],
    badges: ['Pioneer Notredamian', 'Knight Commander (KCMG)', 'World Food Prize Laureate'],
    bio: 'Pioneer Notredamian who transformed global social development by founding BRAC. Dedicated his life to education, healthcare, and human dignity.',
    careerHistory: [
      'Founder and Chairperson, BRAC (1972–2019)',
      'Chancellor, BRAC University',
      'Knight Commander of the Most Distinguished Order of Saint Michael and Saint George (KCMG)',
      'World Food Prize Laureate (2015)'
    ],
    isPublic: true,
    online: false,
    postsCount: 18,
  },
  {
    id: 1002,
    userId: 1002,
    fullName: 'Prof. Dr. Jamilur Reza Choudhury',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 11,
    session: '1959-61',
    group: 'Science',
    collegeRoll: 'NDC-11-042',
    profession: 'Civil Engineer & National Professor',
    position: 'National Professor & Vice-Chancellor',
    institution: 'University of Asia Pacific & Ex-BUET / Adviser to Caretaker Govt',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Structural Engineering', 'Mega Infrastructure (Padma Bridge & Bangabandhu Bridge)', 'Earthquake Engineering'],
    degree: ['HSC (Notre Dame College)', 'BSc Civil Engg (BUET)', 'MSc & PhD (University of Southampton, UK)'],
    badges: ['National Professor', 'Ekushey Padak', 'Padma Bridge Chief Expert'],
    bio: 'One of the most prominent civil engineers in Asia. Chaired the International Panel of Experts for the Padma Multipurpose Bridge and Jamuna Bridge.',
    careerHistory: [
      'Chairman, Panel of Experts, Padma Multipurpose Bridge Project',
      'Vice-Chancellor, University of Asia Pacific & BRAC University',
      'Professor and Head of Civil Engineering, BUET',
      'Adviser to the Caretaker Government of Bangladesh (1996)'
    ],
    isPublic: true,
    online: false,
    postsCount: 14,
  },
  {
    id: 1003,
    userId: 1003,
    fullName: 'Dr. Kamal Hossain',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 4,
    session: '1952-54',
    group: 'Humanities',
    collegeRoll: 'NDC-04-003',
    profession: 'Senior Jurist & Constitutional Lawyer',
    position: 'Chairman, Constitution Drafting Committee & Senior Advocate',
    institution: 'Supreme Court of Bangladesh & United Nations Rapporteur',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Constitutional Law', 'International Arbitration', 'Human Rights'],
    degree: ['HSC (Notre Dame College)', 'BA Jurisprudence & BCL (University of Oxford)', 'D.Phil (Oxford)'],
    badges: ['Author of Bangladesh Constitution', 'Father of Constitution', 'Oxford Fellow'],
    bio: 'Principal architect of the 1972 Constitution of Bangladesh. Senior Advocate of the Supreme Court, former Law Minister, Foreign Minister, and UN Special Rapporteur.',
    careerHistory: [
      'Chairman of the Constitution Drafting Committee of Bangladesh (1972)',
      'Minister of Law, Justice and Parliamentary Affairs (1972–1973)',
      'Minister of Foreign Affairs of Bangladesh (1973–1975)',
      'Member of the UN Human Rights Committee & International Arbitrator'
    ],
    isPublic: true,
    online: false,
    postsCount: 22,
  },
  {
    id: 1004,
    userId: 1004,
    fullName: 'Tanvir Ahmed Chowdhury',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 58,
    session: '2006-08 (HSC 2008)',
    group: 'Science',
    collegeRoll: '108112',
    profession: 'Staff Software & Systems Lead',
    position: 'Staff Engineering Lead & Cloud Architect',
    institution: 'Google Cloud (Silicon Valley, California)',
    city: 'Mountain View, CA',
    country: 'United States',
    specialty: ['Distributed Systems', 'Hyper-Scale Cloud Infrastructure', 'Generative AI Workloads'],
    degree: ['HSC (Notre Dame College)', 'BSc CSE (BUET)', 'MSc Computer Science (Stanford University)'],
    badges: ['Silicon Valley Chapter Lead', 'Google Staff Engineer', 'Top 1% Global Tech'],
    bio: 'Staff Engineering Lead at Google Cloud Silicon Valley designing hyper-scale distributed storage and next-gen AI inference platforms. Active mentor to younger Notredamians.',
    careerHistory: [
      'Staff Software Engineer & Tech Lead, Google Cloud (2020–Present)',
      'Senior Infrastructure Engineer, AWS Systems (2015–2020)',
      'Founding Member, Notre Dame Silicon Valley Alumni Circle'
    ],
    isPublic: true,
    online: true,
    postsCount: 31,
  },
  {
    id: 1005,
    userId: 1005,
    fullName: 'Dr. Faisal Kabir, MD, FACS',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 49,
    session: '1997-99 (HSC 1999)',
    group: 'Science',
    collegeRoll: '199045',
    profession: 'Cardiothoracic & Vascular Surgeon',
    position: 'Chief of Cardiovascular Surgery & Clinical Professor',
    institution: 'Global Heart Institute / Harvard Medical Affiliate',
    city: 'Boston, MA',
    country: 'United States',
    specialty: ['Minimally Invasive Cardiac Surgery', 'Aortic Valve Reconstruction', 'Heart Transplantation'],
    degree: ['HSC (Notre Dame College)', 'MBBS (Dhaka Medical College)', 'Fellow of the American College of Surgeons (FACS)'],
    badges: ['Chief Cardiac Surgeon', 'Harvard Medical Fellow', 'Global Healer Award'],
    bio: 'World-renowned cardiothoracic surgeon pioneering minimally invasive valve surgeries. Conducted over 4,500 open-heart procedures with leading survival outcomes.',
    careerHistory: [
      'Chief of Cardiovascular Surgery, Global Heart Institute (2018–Present)',
      'Clinical Associate Professor of Surgery, Harvard Medical School Teaching Hospitals',
      'Gold Medalist, Dhaka Medical College'
    ],
    isPublic: true,
    online: true,
    postsCount: 16,
  },
  {
    id: 1006,
    userId: 1006,
    fullName: 'Prof. Dr. Mahfuzur Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 45,
    session: '1993-95 (HSC 1995)',
    group: 'Science',
    collegeRoll: '195021',
    profession: 'Computer Science Professor & AI Researcher',
    position: 'Professor & Department Chairman of CSE',
    institution: 'Bangladesh University of Engineering & Technology (BUET)',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Artificial Intelligence', 'Natural Language Processing for Bangla', 'Algorithm Engineering'],
    degree: ['HSC (Notre Dame College)', 'BSc CSE (BUET)', 'PhD in CS (National University of Singapore)'],
    badges: ['BUET CSE Chairman', 'National ICT Awardee', 'IEEE Senior Member'],
    bio: 'Distinguished Professor and Chair of CSE at BUET. Mentored generations of software engineers who now lead global tech and spearheaded national AI policy.',
    careerHistory: [
      'Chairman & Professor, Dept. of CSE, BUET (2016–Present)',
      'Advisor to National Digital Framework & ICT Division',
      'Principal Investigator, Bangla Language Computing Initiative'
    ],
    isPublic: true,
    online: false,
    postsCount: 29,
  },
  {
    id: 1007,
    userId: 1007,
    fullName: 'Dr. Atiur Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 24,
    session: '1972-74',
    group: 'Humanities',
    collegeRoll: 'NDC-24-012',
    profession: 'Economist & Former Central Banker',
    position: 'Former Governor & Bangabandhu Chair Professor',
    institution: 'Bangladesh Bank & University of Dhaka',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Central Banking', 'Green Financial Policy', 'Financial Inclusion & Rural Banking'],
    degree: ['HSC (Notre Dame College)', 'BA & MA Economics (University of Dhaka)', 'PhD Economics (SOAS University of London)'],
    badges: ['Central Bank Governor of the Year', 'Bangabandhu Chair Professor', 'Green Banker Award'],
    bio: 'Served as the 10th Governor of Bangladesh Bank (2009–2016). Globally recognized as "The Green Governor" for pioneering financial inclusion, mobile money, and eco-banking.',
    careerHistory: [
      'Governor, Bangladesh Bank (2009–2016)',
      'Bangabandhu Chair Professor, Dept. of Development Studies, University of Dhaka',
      'Central Bank Governor of the Year for Asia-Pacific (The Banker Magazine, 2015)'
    ],
    isPublic: true,
    online: false,
    postsCount: 25,
  },
  {
    id: 1008,
    userId: 1008,
    fullName: 'Dr. Tariqul Islam',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 52,
    session: '2000-02 (HSC 2002)',
    group: 'Science',
    collegeRoll: '102088',
    profession: 'Principal Cloud & Systems Architect',
    position: 'Principal Cloud Solutions Architect',
    institution: 'Amazon Web Services (AWS) Systems',
    city: 'Seattle, WA',
    country: 'United States',
    specialty: ['Cloud Infrastructure', 'Enterprise Security', 'Fault-Tolerant Architectures'],
    degree: ['HSC (Notre Dame College)', 'BSc EEE (BUET)', 'MSc Cloud Computing (Carnegie Mellon University)'],
    badges: ['AWS Principal Architect', 'CMU Alumnus', 'Batch 52 Secretary'],
    bio: 'Principal Cloud Architect at AWS designing resilient enterprise cloud frameworks for Fortune 500 organizations. Active organizer of North American Notredamian reunions.',
    careerHistory: [
      'Principal Cloud Solutions Architect, AWS (2019–Present)',
      'Lead Infrastructure Architect, Microsoft Azure (2014–2019)',
      'Organizing Secretary, Batch 52 Global Brotherhood'
    ],
    isPublic: true,
    online: true,
    postsCount: 20,
  },
  {
    id: 1009,
    userId: 1009,
    fullName: 'A.M.M. Nasir Uddin',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 21,
    session: '1969-71',
    group: 'Humanities',
    collegeRoll: 'NDC-21-008',
    profession: 'Constitutional Leader & Civil Servant',
    position: 'Chief Election Commissioner of Bangladesh',
    institution: 'Bangladesh Election Commission & Former Secretary to Govt',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Public Administration', 'Electoral Governance', 'State Institution Building'],
    degree: ['HSC (Notre Dame College)', 'BA & MA (University of Dhaka)', 'Public Policy Diploma (Harvard Kennedy School)'],
    badges: ['Chief Election Commissioner', 'Former Secretary to Govt', 'Constitutional Head'],
    bio: 'Chief Election Commissioner of Bangladesh and retired Senior Secretary to the Government. A veteran administrator dedicated to upholding electoral integrity and rule of law.',
    careerHistory: [
      'Chief Election Commissioner of Bangladesh (2024–Present)',
      'Secretary, Ministry of Information & Ministry of Health and Family Welfare',
      'Distinguished Member of Bangladesh Civil Service (BCS 1979)'
    ],
    isPublic: true,
    online: false,
    postsCount: 12,
  },
  {
    id: 1010,
    userId: 1010,
    fullName: 'Tahmidur Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 68,
    session: '2016-18 (HSC 2018)',
    group: 'Business Studies',
    collegeRoll: '218042',
    profession: 'Fintech Executive & Founder',
    position: 'Head of Fintech & Digital Banking',
    institution: 'Pathao Pay & Ex-IBA Innovator',
    city: 'Dhaka',
    country: 'Bangladesh',
    specialty: ['Fintech Product Architecture', 'Venture Growth', 'Digital Wallets & Payments'],
    degree: ['HSC (Notre Dame College)', 'BBA (Institute of Business Administration - IBA, University of Dhaka)'],
    badges: ['Fintech Leader', 'Ex-IBA Champion', 'Batch 68 Representative'],
    bio: 'Product leader driving digital payments infrastructure in South Asia. Co-architected wallet rails used by millions daily. Active mentor for youth entrepreneurship.',
    careerHistory: [
      'Head of Product & Fintech, Pathao (2022–Present)',
      'Growth Strategy Lead, Digital Commerce Ventures (2020–2022)',
      'President, Notre Dame Business Club (2017–2018)'
    ],
    isPublic: true,
    online: true,
    postsCount: 38,
  },
  {
    id: 1011,
    userId: 1011,
    fullName: 'Prof. Dr. K. M. Rahman',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 55,
    session: '2003-05 (HSC 2005)',
    group: 'Science',
    collegeRoll: '105104',
    profession: 'Medicinal Chemist & Cancer Drug Innovator',
    position: 'Professor of Medicinal Chemistry',
    institution: 'King’s College London (London, UK)',
    city: 'London',
    country: 'United Kingdom',
    specialty: ['Cancer Therapeutics', 'DNA-Targeted Drug Discovery', 'Antimicrobial Resistance'],
    degree: ['HSC (Notre Dame College)', 'BPharm (University of Dhaka)', 'PhD in Chemical Biology (University of London)'],
    badges: ['King’s College London Professor', 'Royal Society of Chemistry Fellow', 'Cancer Drug Innovator'],
    bio: 'Professor at King’s College London heading groundbreaking research into DNA-interactive anti-cancer therapeutics and novel antibiotic resistance solutions.',
    careerHistory: [
      'Professor of Medicinal Chemistry, King’s College London (2021–Present)',
      'Fellow of the Royal Society of Chemistry (FRSC)',
      'Inventor on 12 International Drug Discovery Patents'
    ],
    isPublic: true,
    online: false,
    postsCount: 19,
  },
  {
    id: 1012,
    userId: 1012,
    fullName: 'Engr. Masud Alam',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&auto=format&fit=crop&q=80',
    coverUrl: campusHeroImg,
    batchYear: 40,
    session: '1988-90 (HSC 1990)',
    group: 'Science',
    collegeRoll: '190018',
    profession: 'Renewable Power Systems VP',
    position: 'Vice President of Global Grid Infrastructure',
    institution: 'GreenGrid Systems International',
    city: 'London',
    country: 'United Kingdom',
    specialty: ['Offshore Wind Grids', 'Renewable High Voltage Transmission', 'Smart Grid Automation'],
    degree: ['HSC (Notre Dame College)', 'BSc EEE (BUET)', 'MSc Power Systems (Imperial College London)'],
    badges: ['VP of Engineering', 'Imperial College Alumnus', 'Clean Energy Pioneer'],
    bio: 'Global power engineer heading multi-gigawatt offshore wind integration across Europe and Asia. Committed to sustainable energy transitions and technical education.',
    careerHistory: [
      'VP of Global Grid Infrastructure, GreenGrid Systems (2017–Present)',
      'Technical Director, Siemens Energy Transmission (2010–2017)',
      'Patron, Notre Dame Science Club (NDSC) Endowment'
    ],
    isPublic: true,
    online: true,
    postsCount: 15,
  }
];

const STORAGE_KEY = 'ndc_featured_luminaries_v2';
const EVENT_KEY = 'ndc_featured_luminaries_updated';

/**
 * Load featured luminaries from localStorage with fallback to initial curated items
 */
export const loadFeaturedAlumni = (): AlumniProfile[] => {
  if (typeof window === 'undefined') return INITIAL_FEATURED_ALUMNI;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FEATURED_ALUMNI));
      return INITIAL_FEATURED_ALUMNI;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_FEATURED_ALUMNI;
  } catch (err) {
    console.warn('[featuredAlumniService] Failed to parse stored luminaries:', err);
    return INITIAL_FEATURED_ALUMNI;
  }
};

/**
 * Save featured luminaries to localStorage and notify listeners
 */
export const saveFeaturedAlumni = (list: AlumniProfile[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { list } }));
  } catch (err) {
    console.error('[featuredAlumniService] Failed to save luminaries:', err);
  }
};

/**
 * Fetch featured luminaries directly from Supabase `featured_alumni`
 * Seeds initial records to Supabase if table is currently empty.
 */
export async function fetchFeaturedAlumniFromDb(): Promise<AlumniProfile[]> {
  const localFallback = loadFeaturedAlumni();
  if (!isSupabaseConfigured) return localFallback;

  try {
    const { data, error } = await supabase
      .from('featured_alumni')
      .select('*')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      console.warn('Supabase fetch featured_alumni error:', error.message);
      return localFallback;
    }

    if (data && data.length > 0) {
      const mapped: AlumniProfile[] = data.map((row: any) => ({
        id: Number(row.id),
        userId: Number(row.id),
        fullName: row.full_name,
        avatarUrl: row.avatar_url || '/ndc-logo.png',
        coverUrl: row.cover_url || campusHeroImg,
        batchYear: Number(row.batch_year) || 50,
        session: row.session || undefined,
        group: row.academic_group || 'Science',
        collegeRoll: row.college_roll || undefined,
        profession: row.profession,
        position: row.position,
        institution: row.institution,
        city: row.city || 'Dhaka',
        country: row.country || 'Bangladesh',
        specialty: Array.isArray(row.specialties) ? row.specialties : [],
        degree: Array.isArray(row.degrees) ? row.degrees : ['HSC (Notre Dame College)'],
        badges: Array.isArray(row.badges) ? row.badges : [],
        bio: row.bio || '',
        careerHistory: Array.isArray(row.career_history) ? row.career_history : [],
        isPublic: Boolean(row.is_active ?? true),
        online: false,
        postsCount: 10,
      }));

      saveFeaturedAlumni(mapped);
      return mapped;
    } else if (data && data.length === 0) {
      // Supabase table is provisioned but empty: seed initial curated luminaries to cloud
      (async () => {
        try {
          const seeds = INITIAL_FEATURED_ALUMNI.map((p, idx) => ({
            id: p.id,
            full_name: p.fullName,
            avatar_url: p.avatarUrl,
            cover_url: typeof p.coverUrl === 'string' ? p.coverUrl : '',
            batch_year: p.batchYear || 50,
            session: p.session,
            academic_group: p.group || 'Science',
            college_roll: p.collegeRoll,
            profession: p.profession,
            position: p.position,
            institution: p.institution,
            city: p.city,
            country: p.country,
            category: 'all',
            specialties: p.specialty,
            degrees: p.degree,
            badges: p.badges,
            bio: p.bio,
            career_history: p.careerHistory,
            display_order: idx,
            is_active: true,
          }));
          await supabase.from('featured_alumni').upsert(seeds, { onConflict: 'id' });
        } catch (seedErr) {
          console.warn('Failed to seed featured alumni to Supabase:', seedErr);
        }
      })();
    }
  } catch (err) {
    console.warn('Error querying featured_alumni from Supabase:', err);
  }

  return localFallback;
}

/**
 * Admin Action: Add a new distinguished alumnus / career position
 */
export const addFeaturedAlumnus = (data: Partial<AlumniProfile>): AlumniProfile => {
  const current = loadFeaturedAlumni();
  const newId = Date.now();
  const newProfile: AlumniProfile = {
    id: newId,
    userId: newId,
    fullName: data.fullName?.trim() || 'Distinguished Alumnus',
    avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    coverUrl: data.coverUrl || campusHeroImg,
    batchYear: Number(data.batchYear) || 50,
    session: data.session || `HSC Batch ${data.batchYear || 50}`,
    group: data.group || 'Science',
    collegeRoll: data.collegeRoll || `NDC-${data.batchYear || 50}-001`,
    profession: data.profession?.trim() || 'Leader & Innovator',
    position: data.position?.trim() || 'Distinguished Position',
    institution: data.institution?.trim() || 'Global Organization',
    city: data.city?.trim() || 'Dhaka',
    country: data.country?.trim() || 'Bangladesh',
    specialty: data.specialty && data.specialty.length > 0 ? data.specialty : ['Leadership', 'Innovation'],
    degree: data.degree && data.degree.length > 0 ? data.degree : ['HSC (Notre Dame College)'],
    badges: data.badges && data.badges.length > 0 ? data.badges : ['Distinguished Leader'],
    bio: data.bio?.trim() || 'Accomplished Notredamian making impactful contributions to industry and society.',
    careerHistory: data.careerHistory || [`${data.position} at ${data.institution}`],
    isPublic: true,
    online: true,
    postsCount: 5,
  };

  const updated = [newProfile, ...current];
  saveFeaturedAlumni(updated);

  // If Supabase is configured, sync to DB asynchronously
  syncInsertToSupabase(newProfile);

  return newProfile;
};

/**
 * Admin Action: Update an existing distinguished alumnus
 */
export const updateFeaturedAlumnus = (id: number, updates: Partial<AlumniProfile>): AlumniProfile | null => {
  const current = loadFeaturedAlumni();
  const idx = current.findIndex((item) => item.id === id);
  if (idx === -1) return null;

  const updatedItem: AlumniProfile = {
    ...current[idx],
    ...updates,
    id, // preserve id
  };

  current[idx] = updatedItem;
  saveFeaturedAlumni([...current]);

  syncUpdateToSupabase(id, updates);

  return updatedItem;
};

/**
 * Admin Action: Delete a distinguished alumnus
 */
export const deleteFeaturedAlumnus = (id: number): boolean => {
  const current = loadFeaturedAlumni();
  const filtered = current.filter((item) => item.id !== id);
  if (filtered.length === current.length) return false;

  saveFeaturedAlumni(filtered);
  syncDeleteToSupabase(id);

  return true;
};

/**
 * Admin Action: Reset to curated initial demo data
 */
export const resetFeaturedAlumniToDefault = (): AlumniProfile[] => {
  saveFeaturedAlumni(INITIAL_FEATURED_ALUMNI);
  return INITIAL_FEATURED_ALUMNI;
};

// Supabase synchronization helpers (graceful fallback if Supabase table isn't created yet)
async function syncInsertToSupabase(profile: AlumniProfile) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('featured_alumni').insert([
      {
        id: profile.id,
        full_name: profile.fullName,
        avatar_url: profile.avatarUrl,
        batch_year: profile.batchYear,
        session: profile.session,
        academic_group: profile.group,
        profession: profile.profession,
        position: profile.position,
        institution: profile.institution,
        city: profile.city,
        country: profile.country,
        specialties: profile.specialty,
        badges: profile.badges,
        bio: profile.bio,
      }
    ]);
  } catch (e) {
    console.info('[featuredAlumniService] Supabase insert skipped (table may be offline or local-only):', e);
  }
}

async function syncUpdateToSupabase(id: number, updates: Partial<AlumniProfile>) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('featured_alumni').update({
      full_name: updates.fullName,
      avatar_url: updates.avatarUrl,
      batch_year: updates.batchYear,
      position: updates.position,
      institution: updates.institution,
      profession: updates.profession,
      city: updates.city,
      country: updates.country,
      bio: updates.bio,
    }).eq('id', id);
  } catch (e) {
    console.info('[featuredAlumniService] Supabase update skipped:', e);
  }
}

async function syncDeleteToSupabase(id: number) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from('featured_alumni').delete().eq('id', id);
  } catch (e) {
    console.info('[featuredAlumniService] Supabase delete skipped:', e);
  }
}

/**
 * Listen for live changes to featured alumni positions across components and browser events
 */
export function subscribeToFeaturedAlumni(callback: (list: AlumniProfile[]) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ list: AlumniProfile[] }>;
    if (custom?.detail?.list) {
      callback(custom.detail.list);
    } else {
      callback(loadFeaturedAlumni());
    }
  };
  window.addEventListener(EVENT_KEY, handler);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(loadFeaturedAlumni());
    }
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(EVENT_KEY, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
