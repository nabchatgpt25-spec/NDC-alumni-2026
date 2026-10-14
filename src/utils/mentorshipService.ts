import { MentorshipCategory, MentorshipRequest, MentorOffer, MentorshipAnswer } from '../types';

const REQUESTS_STORAGE_KEY = 'ndc_mentorship_requests_v4';
const MENTORS_STORAGE_KEY = 'ndc_mentorship_mentors_v4';

// Remove legacy demo data from client storage
if (typeof window !== 'undefined') {
  try {
    ['ndc_mentorship_requests_v3', 'ndc_mentorship_mentors_v3', 'ndc_mentorship_requests_v2', 'ndc_mentorship_mentors_v2'].forEach((k) => {
      localStorage.removeItem(k);
    });
  } catch {
    // Ignore storage restriction
  }
}

export const MENTORSHIP_CATEGORIES: { id: MentorshipCategory; labelBn: string; labelEn: string; icon: string; descriptionBn: string }[] = [
  {
    id: 'Medical',
    labelBn: 'মেডিকেল',
    labelEn: 'Medical',
    icon: '🩺',
    descriptionBn: 'মেডিকেল ভর্তি, এমবিবিএস, এফসিপিএস ও স্বাস্থ্য ক্যাডার গাইডলাইন',
  },
  {
    id: 'Job',
    labelBn: 'চাকরি',
    labelEn: 'Job & Career',
    icon: '💼',
    descriptionBn: 'সফটওয়্যার, বিসিএস, করপোরেট ও সরকারি জব প্রিপারেশন',
  },
  {
    id: 'Abroad',
    labelBn: 'উচ্চশিক্ষা ও বিদেশ',
    labelEn: 'Study Abroad',
    icon: '✈️',
    descriptionBn: 'আইইএলটিএস, জিআরই, ফান্ডিং ও বিদেশের ইউনিভার্সিটিতে ভর্তি',
  },
  {
    id: 'Degree',
    labelBn: 'বিশ্ববিদ্যালয় ও ডিগ্রি',
    labelEn: 'University & Degree',
    icon: '🎓',
    descriptionBn: 'বুয়েট, ঢাবি, আইবিএ ও অন্যান্য পাবলিক/প্রাইভেট এডমিশন',
  },
  {
    id: 'Business',
    labelBn: 'উদ্যোক্তা ও ব্যবসা',
    labelEn: 'Business & Startup',
    icon: '🚀',
    descriptionBn: 'স্টার্টআপ শুরু, ফান্ডিং, সেলস এবং বিজনেস স্ট্র্যাটেজি',
  },
];

export const INITIAL_MENTORSHIP_REQUESTS: MentorshipRequest[] = [];

export const INITIAL_MENTORS: MentorOffer[] = [];

export const loadMentorshipRequests = (): MentorshipRequest[] => {
  if (typeof window === 'undefined') return INITIAL_MENTORSHIP_REQUESTS;
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load mentorship requests', e);
  }
  return INITIAL_MENTORSHIP_REQUESTS;
};

export const saveMentorshipRequests = (requests: MentorshipRequest[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('Failed to save mentorship requests', e);
  }
};

export const createMentorshipRequest = (
  topic: MentorshipCategory,
  question: string,
  user: { id: number; name: string; batch?: number | null; avatar?: string; contact?: string }
): MentorshipRequest => {
  const current = loadMentorshipRequests();
  const newReq: MentorshipRequest = {
    id: `req-${Date.now()}`,
    userId: user.id,
    userName: user.name || 'Notredamian Alum',
    userBatch: user.batch ?? null,
    userAvatar: user.avatar,
    topic,
    question: question.trim(),
    contactInfo: user.contact?.trim() || undefined,
    createdAt: 'Just now',
    status: 'open',
    answers: [],
  };
  const updated = [newReq, ...current];
  saveMentorshipRequests(updated);
  return newReq;
};

export const addMentorshipAnswer = (
  requestId: string,
  answerText: string,
  mentor: { id: number; name: string; batch?: number | null; avatar?: string; profession?: string }
): MentorshipAnswer => {
  const current = loadMentorshipRequests();
  const newAns: MentorshipAnswer = {
    id: `ans-${Date.now()}`,
    mentorId: mentor.id,
    mentorName: mentor.name,
    mentorBatch: mentor.batch ?? null,
    mentorAvatar: mentor.avatar,
    mentorProfession: mentor.profession,
    answerText: answerText.trim(),
    createdAt: 'Just now',
  };

  const updated = current.map((req) => {
    if (req.id === requestId) {
      return {
        ...req,
        status: 'answered' as const,
        answers: [...(req.answers || []), newAns],
      };
    }
    return req;
  });

  saveMentorshipRequests(updated);
  return newAns;
};

export const loadMentorOffers = (): MentorOffer[] => {
  if (typeof window === 'undefined') return INITIAL_MENTORS;
  try {
    const raw = localStorage.getItem(MENTORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load mentor offers', e);
  }
  return INITIAL_MENTORS;
};

export const saveMentorOffers = (mentors: MentorOffer[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MENTORS_STORAGE_KEY, JSON.stringify(mentors));
  } catch (e) {
    console.warn('Failed to save mentor offers', e);
  }
};

export const registerMentorOffer = (
  data: Omit<MentorOffer, 'id' | 'createdAt'>
): MentorOffer => {
  const current = loadMentorOffers();
  const existingIdx = current.findIndex((m) => m.userId === data.userId);

  const newOffer: MentorOffer = {
    ...data,
    id: `mentor-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
  };

  let updated: MentorOffer[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...current[existingIdx], ...newOffer };
  } else {
    updated = [newOffer, ...current];
  }

  saveMentorOffers(updated);
  return newOffer;
};
