/**
 * Career Opportunities Service
 * Manages career postings, internships, referrals, and one-click applications.
 */

export type CareerType = 'job' | 'internship' | 'referral';

export interface CareerApplicant {
  id: string;
  applicantId: number;
  applicantName: string;
  applicantBatch?: string;
  applicantAvatar?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  appliedAt: string;
}

export interface CareerOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  type: CareerType;
  description: string;
  posterId: number;
  posterName: string;
  posterBatch: string;
  posterAvatar?: string;
  posterEmail?: string;
  createdAt: string;
  status: 'active' | 'closed';
  applicants: CareerApplicant[];
}

const CAREER_STORAGE_KEY = 'ndc_career_opportunities_v1';

export const CAREER_FILTER_TYPES: { id: 'all' | CareerType; labelBn: string; labelEn: string }[] = [
  { id: 'all', labelBn: 'সব', labelEn: 'All' },
  { id: 'job', labelBn: 'চাকরি', labelEn: 'Job' },
  { id: 'internship', labelBn: 'ইন্টার্নশিপ', labelEn: 'Internship' },
  { id: 'referral', labelBn: 'রেফারেল', labelEn: 'Referral' },
];

export const getCareerTypeLabel = (type: CareerType): { bn: string; en: string; badgeClass: string } => {
  switch (type) {
    case 'job':
      return {
        bn: 'চাকরি',
        en: 'Job',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
      };
    case 'internship':
      return {
        bn: 'ইন্টার্নশিপ',
        en: 'Internship',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'referral':
      return {
        bn: 'রেফারেল',
        en: 'Referral',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
      };
    default:
      return {
        bn: 'সুযোগ',
        en: 'Opportunity',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
};

const INITIAL_CAREER_OPPORTUNITIES: CareerOpportunity[] = [
  {
    id: 'opp-seed-1',
    title: 'Software Engineer (Backend / Go & Node.js)',
    company: 'bKash Limited',
    location: 'Dhaka (Tejgaon / Hybrid)',
    type: 'job',
    description: 'Looking for a passionate backend engineer with 1-3 years of experience in microservices, relational databases, and scalable distributed systems. Notre Dame alumni preferred for fast-track interview.',
    posterId: 1001,
    posterName: 'Tanvir Ahmed',
    posterBatch: 'HSC 2016',
    posterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'active',
    applicants: [
      {
        id: 'app-seed-1',
        applicantId: 1002,
        applicantName: 'Fahim Morshed',
        applicantBatch: 'HSC 2019',
        applicantEmail: 'fahim.m@example.com',
        appliedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'opp-seed-2',
    title: 'Undergraduate Summer Research Intern',
    company: 'BRAC Institute of Governance and Development',
    location: 'Dhaka (Mohakhali)',
    type: 'internship',
    description: 'Summer research internship for current university undergraduates. Opportunity to work on economic survey datasets, statistical analysis, and public policy briefs.',
    posterId: 1003,
    posterName: 'Siamur Rahman',
    posterBatch: 'HSC 2014',
    posterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: 'active',
    applicants: [],
  },
];

export const loadCareerOpportunities = (): CareerOpportunity[] => {
  if (typeof window === 'undefined') return INITIAL_CAREER_OPPORTUNITIES;
  try {
    const raw = localStorage.getItem(CAREER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load career opportunities from storage:', err);
  }
  return INITIAL_CAREER_OPPORTUNITIES;
};

export const saveCareerOpportunities = (opportunities: CareerOpportunity[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(opportunities));
    window.dispatchEvent(new CustomEvent('ndc_careers_updated', { detail: opportunities }));
  } catch (err) {
    console.warn('Failed to save career opportunities to storage:', err);
  }
};

export const createCareerOpportunity = (
  data: Omit<CareerOpportunity, 'id' | 'createdAt' | 'applicants' | 'status'>
): CareerOpportunity => {
  const currentList = loadCareerOpportunities();
  const newOpportunity: CareerOpportunity = {
    ...data,
    id: 'opp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
    status: 'active',
    applicants: [],
  };

  const updatedList = [newOpportunity, ...currentList];
  saveCareerOpportunities(updatedList);
  return newOpportunity;
};

export const applyToCareerOpportunity = (
  opportunityId: string,
  applicant: Omit<CareerApplicant, 'id' | 'appliedAt'>
): { success: boolean; message: string; opportunity?: CareerOpportunity } => {
  const currentList = loadCareerOpportunities();
  const index = currentList.findIndex((item) => item.id === opportunityId);

  if (index === -1) {
    return { success: false, message: 'সুযোগটি খুঁজে পাওয়া যায়নি।' };
  }

  const target = currentList[index];

  // Check if user already applied
  const alreadyApplied = target.applicants.some(
    (app) => app.applicantId === applicant.applicantId || (applicant.applicantEmail && app.applicantEmail === applicant.applicantEmail)
  );

  if (alreadyApplied) {
    return { success: false, message: 'আপনি ইতোমধ্যে এই সুযোগটিতে আবেদন করেছেন।', opportunity: target };
  }

  const newApplicant: CareerApplicant = {
    ...applicant,
    id: 'app-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    appliedAt: new Date().toISOString(),
  };

  const updatedTarget: CareerOpportunity = {
    ...target,
    applicants: [newApplicant, ...target.applicants],
  };

  currentList[index] = updatedTarget;
  saveCareerOpportunities(currentList);

  return { success: true, message: 'আপনার আবেদন সফলভাবে গৃহীত হয়েছে!', opportunity: updatedTarget };
};

export const deleteCareerOpportunity = (
  opportunityId: string,
  userId: number,
  isAdmin: boolean = false
): boolean => {
  const currentList = loadCareerOpportunities();
  const target = currentList.find((item) => item.id === opportunityId);
  if (!target) return false;

  if (!isAdmin && target.posterId !== userId) {
    return false;
  }

  const updatedList = currentList.filter((item) => item.id !== opportunityId);
  saveCareerOpportunities(updatedList);
  return true;
};
