import { MentorshipCategory, MentorshipRequest, MentorOffer, MentorshipAnswer } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

function formatRelativeTimestamp(isoDate?: string): string {
  if (!isoDate) return 'Just now';
  try {
    const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

/**
 * Synchronous local cache loader for instant UI render
 */
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
    console.warn('Failed to load mentorship requests from storage', e);
  }
  return INITIAL_MENTORSHIP_REQUESTS;
};

export const saveMentorshipRequests = (requests: MentorshipRequest[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('ndc_mentorship_requests_updated', { detail: requests }));
  } catch (e) {
    console.warn('Failed to save mentorship requests', e);
  }
};

/**
 * Fetch mentorship requests with their answers directly from Supabase DB
 */
export async function fetchMentorshipRequestsFromDb(): Promise<MentorshipRequest[]> {
  const localFallback = loadMentorshipRequests();
  if (!isSupabaseConfigured) return localFallback;

  try {
    const { data, error } = await supabase
      .from('mentorship_requests')
      .select('*, mentorship_answers(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch mentorship_requests error:', error.message);
      return localFallback;
    }

    if (data) {
      const mapped: MentorshipRequest[] = data.map((row: any) => {
        const answers: MentorshipAnswer[] = Array.isArray(row.mentorship_answers)
          ? row.mentorship_answers.map((ans: any) => ({
              id: String(ans.id),
              mentorId: ans.mentor_profile_id || (ans.mentor_id ? 1000 : 0),
              mentorName: ans.mentor_name || 'Senior Alum',
              mentorBatch: ans.mentor_batch,
              mentorAvatar: ans.mentor_avatar,
              mentorProfession: ans.mentor_profession,
              answerText: ans.answer_text,
              createdAt: formatRelativeTimestamp(ans.created_at),
            }))
          : [];

        return {
          id: String(row.id),
          userId: 0,
          userName: row.user_name || 'Notredamian Alum',
          userBatch: row.user_batch,
          userAvatar: row.user_avatar,
          topic: row.topic as MentorshipCategory,
          question: row.question,
          contactInfo: row.contact_info,
          createdAt: formatRelativeTimestamp(row.created_at),
          status: row.status as 'open' | 'answered' | 'resolved',
          answers,
        };
      });

      // Cache for offline viewing
      saveMentorshipRequests(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Failed to query mentorship_requests:', err);
  }

  return localFallback;
}

/**
 * Create a new mentorship request, persisting to Supabase and updating local cache
 */
export const createMentorshipRequest = async (
  topic: MentorshipCategory,
  question: string,
  user: { id: number; name: string; batch?: number | null; avatar?: string; contact?: string },
  targetMentor?: { id: number | string; name: string }
): Promise<MentorshipRequest> => {
  const current = loadMentorshipRequests();
  const tempId = `req-${Date.now()}`;
  const newReq: MentorshipRequest = {
    id: tempId,
    userId: user.id,
    userName: user.name || 'Notredamian Alum',
    userBatch: user.batch ?? null,
    userAvatar: user.avatar,
    topic,
    question: question.trim(),
    contactInfo: user.contact?.trim() || undefined,
    targetMentorId: typeof targetMentor?.id === 'number' ? targetMentor.id : undefined,
    targetMentorName: targetMentor?.name,
    createdAt: 'Just now',
    status: 'open',
    answers: [],
  };

  // Immediate optimistic update to UI
  const updated = [newReq, ...current];
  saveMentorshipRequests(updated);

  // Sync to Supabase DB
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;

      const { data, error } = await supabase
        .from('mentorship_requests')
        .insert({
          user_id: authUser?.id || null,
          user_name: user.name || 'Notredamian Alum',
          user_batch: user.batch || null,
          user_avatar: user.avatar || null,
          topic,
          question: question.trim(),
          contact_info: user.contact?.trim() || null,
          status: 'open',
        })
        .select('id, created_at')
        .single();

      if (!error && data) {
        newReq.id = String(data.id);
        const replaced = updated.map((r) => (r.id === tempId ? newReq : r));
        saveMentorshipRequests(replaced);
      } else if (error) {
        console.warn('Supabase insert mentorship_requests error:', error.message);
      }
    } catch (e) {
      console.warn('Database error creating mentorship request:', e);
    }
  }

  return newReq;
};

/**
 * Add a mentorship answer to a request, persisting to Supabase and updating local cache
 */
export const addMentorshipAnswer = async (
  requestId: string,
  answerText: string,
  mentor: { id: number; name: string; batch?: number | null; avatar?: string; profession?: string }
): Promise<MentorshipAnswer> => {
  const current = loadMentorshipRequests();
  const tempAnsId = `ans-${Date.now()}`;
  const newAns: MentorshipAnswer = {
    id: tempAnsId,
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

  // Sync to Supabase DB
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;

      // Check if requestId is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
      if (isUuid) {
        const { data, error } = await supabase
          .from('mentorship_answers')
          .insert({
            request_id: requestId,
            mentor_id: authUser?.id || null,
            mentor_name: mentor.name,
            mentor_batch: mentor.batch || null,
            mentor_profession: mentor.profession || null,
            mentor_avatar: mentor.avatar || null,
            answer_text: answerText.trim(),
          })
          .select('id, created_at')
          .single();

        if (!error && data) {
          newAns.id = String(data.id);
        } else if (error) {
          console.warn('Supabase insert mentorship_answers error:', error.message);
        }
      }
    } catch (e) {
      console.warn('Database error adding mentorship answer:', e);
    }
  }

  return newAns;
};

/**
 * Synchronous local cache loader for mentor offers
 */
export const loadMentorOffers = (): MentorOffer[] => {
  if (typeof window === 'undefined') return INITIAL_MENTORS;
  try {
    const raw = localStorage.getItem(MENTORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load mentor offers from storage', e);
  }
  return INITIAL_MENTORS;
};

export const saveMentorOffers = (mentors: MentorOffer[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MENTORS_STORAGE_KEY, JSON.stringify(mentors));
    window.dispatchEvent(new CustomEvent('ndc_mentors_updated', { detail: mentors }));
  } catch (e) {
    console.warn('Failed to save mentor offers', e);
  }
};

/**
 * Fetch active mentors directly from Supabase DB `mentor_profiles`
 */
export async function fetchMentorOffersFromDb(): Promise<MentorOffer[]> {
  const localFallback = loadMentorOffers();
  if (!isSupabaseConfigured) return localFallback;

  try {
    const { data, error } = await supabase
      .from('mentor_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetch mentor_profiles error:', error.message);
      return localFallback;
    }

    if (data && data.length > 0) {
      const mapped: MentorOffer[] = data.map((row: any) => ({
        id: String(row.id),
        userId: 1000,
        fullName: row.full_name,
        batchYear: row.batch_year,
        avatarUrl: row.avatar_url,
        category: row.category as MentorshipCategory,
        expertise: row.expertise,
        shortDescription: row.short_description,
        institution: row.institution,
        position: row.position,
        contactPreference: row.contact_preference,
        createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-01-01',
      }));

      saveMentorOffers(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Failed to query mentor_profiles:', err);
  }

  return localFallback;
}

/**
 * Register a new mentor offer, persisting to Supabase `mentor_profiles`
 */
export const registerMentorOffer = async (
  data: Omit<MentorOffer, 'id' | 'createdAt'>
): Promise<MentorOffer> => {
  const current = loadMentorOffers();
  const existingIdx = current.findIndex((m) => m.fullName.toLowerCase() === data.fullName.toLowerCase());

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

  // Sync to Supabase DB
  if (isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;

      const { data: inserted, error } = await supabase
        .from('mentor_profiles')
        .insert({
          user_id: authUser?.id || null,
          full_name: data.fullName,
          batch_year: data.batchYear || null,
          avatar_url: data.avatarUrl || null,
          category: data.category,
          expertise: data.expertise,
          short_description: data.shortDescription,
          institution: data.institution || null,
          position: data.position || null,
          contact_preference: data.contactPreference || 'Email / Message',
          is_active: true,
          is_verified: true,
        })
        .select('id, created_at')
        .single();

      if (!error && inserted) {
        newOffer.id = String(inserted.id);
        const replaced = updated.map((m) => (m.id.startsWith('mentor-') ? { ...m, id: String(inserted.id) } : m));
        saveMentorOffers(replaced);
      } else if (error) {
        console.warn('Supabase insert mentor_profiles error:', error.message);
      }
    } catch (e) {
      console.warn('Database error registering mentor offer:', e);
    }
  }

  return newOffer;
};
