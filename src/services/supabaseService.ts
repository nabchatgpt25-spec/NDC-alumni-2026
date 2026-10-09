import { supabase, isSupabaseConfigured, ALUMNI_PUBLIC_COLUMNS } from '../lib/supabase';
import { mapSupabaseRowToAlumniProfile, getOrCreateSupabaseProfile } from '../lib/supabase-auth';
import {
  AlumniProfile,
  BatchSummary,
  BloodDonorProfile,
  BloodDonationHistoryItem,
  BloodEmergencyRequest,
  GalleryAlbum,
  GalleryPhoto,
  NotificationItem,
  OfficialNotice,
  PostItem,
  PostComment,
  VouchRequest,
} from '../types';
import {
  BATCH_LIST,
  loadStoredAlumniProfiles,
} from '../data/mockData';

// =============================================================================
// 1. ALUMNI DIRECTORY & BATCHES
// =============================================================================

export async function fetchAlumniProfilesFromDb(params?: {
  search?: string;
  batchYear?: number;
  academicStream?: string;
  limit?: number;
  offset?: number;
}): Promise<AlumniProfile[]> {
  if (!isSupabaseConfigured) {
    return loadStoredAlumniProfiles();
  }

  try {
    let query = supabase
      .from('alumni_profiles')
      .select(ALUMNI_PUBLIC_COLUMNS)
      .eq('is_public', true)
      .order('batch_year', { ascending: false });

    if (params?.batchYear) {
      query = query.eq('batch_year', params.batchYear);
    }
    if (params?.academicStream) {
      query = query.eq('academic_stream', params.academicStream);
    }
    if (params?.search?.trim()) {
      const s = params.search.trim();
      query = query.or(
        `full_name.ilike.%${s}%,institution.ilike.%${s}%,profession.ilike.%${s}%,city.ilike.%${s}%`
      );
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetchAlumniProfiles error:', error.message);
      return loadStoredAlumniProfiles();
    }
    if (!data || data.length === 0) {
      return [];
    }

    return data.map(mapSupabaseRowToAlumniProfile);
  } catch (err) {
    console.warn('Supabase fetchAlumniProfiles fallback:', err);
    return loadStoredAlumniProfiles();
  }
}

export async function fetchAlumniProfileByIdFromDb(profileId: number): Promise<AlumniProfile | null> {
  if (!isSupabaseConfigured || !profileId) return null;

  try {
    const { data, error } = await supabase
      .from('alumni_profiles')
      .select(ALUMNI_PUBLIC_COLUMNS)
      .eq('id', profileId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Enrich with permitted contact details via authorized SECURITY DEFINER RPC
    try {
      const { data: contacts } = await supabase.rpc('get_alumni_contact_details', {
        p_profile_id: profileId,
      });
      if (contacts && contacts[0]) {
        Object.assign(data, contacts[0]);
      }
    } catch {
      // Graceful fallback if unauthenticated or privacy denied
    }

    return mapSupabaseRowToAlumniProfile(data);
  } catch (err) {
    console.warn('Error fetching alumni profile by id:', err);
    return null;
  }
}

export async function fetchBatchesFromDb(): Promise<BatchSummary[]> {
  if (!isSupabaseConfigured) {
    return BATCH_LIST;
  }

  try {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('batch_year', { ascending: false });

    if (error || !data || data.length === 0) {
      return BATCH_LIST;
    }

    return data.map((b) => ({
      batchYear: b.batch_year,
      hscYear: b.hsc_year || (b.batch_year > 1900 ? b.batch_year : 1950 + b.batch_year),
      session: b.session || `${b.batch_year - 2}-${String(b.batch_year).slice(-2)}`,
      total: Number(b.registered_count ?? 0),
      representative: b.representative_name || undefined,
      specialNote: b.special_note || undefined,
    }));
  } catch (err) {
    console.warn('Supabase fetchBatches error:', err);
    return BATCH_LIST;
  }
}

export async function fetchBatchAlumniProfilesFromDb(batchYear: number): Promise<AlumniProfile[]> {
  if (!isSupabaseConfigured || !Number.isFinite(batchYear)) return [];

  try {
    const profiles: AlumniProfile[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from('alumni_profiles')
        .select(ALUMNI_PUBLIC_COLUMNS)
        .eq('is_public', true)
        .eq('batch_year', batchYear)
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error || !data) return [];
      profiles.push(...data.map(mapSupabaseRowToAlumniProfile));
      if (data.length < pageSize) break;
    }
    return profiles;
  } catch (err) {
    console.warn('Supabase batch profile statistics error:', err);
    return [];
  }
}

export async function fetchAcademicStreamGroupsFromDb(): Promise<any[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('academic_stream_groups')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error || !data) return [];
    return data;
  } catch (err) {
    return [];
  }
}

// =============================================================================
// 2. THE QUAD / SOCIAL FEED & POSTS
// =============================================================================

function mapRowToFeedPost(row: any, currentUserId?: number): PostItem {
  const author = row.author || {};
  const comments: PostComment[] = (row.post_comments || []).map((c: any) => ({
    id: Number(c.id),
    postId: Number(row.id),
    userId: Number(c.user_id),
    fullName: c.author?.full_name || 'Alumnus',
    avatarUrl: c.author?.avatar_url || '/ndc-logo.png',
    content: c.content,
    likesCount: Number(c.likes_count) || 0,
    likedByMe: false,
    createdAt: new Date(c.created_at).toLocaleDateString(),
    author: c.author?.full_name || 'Alumnus',
    authorAvatar: c.author?.avatar_url || '/ndc-logo.png',
    timestamp: new Date(c.created_at).toLocaleDateString(),
  }));

  const isLiked = Boolean(
    currentUserId &&
      Array.isArray(row.post_likes) &&
      row.post_likes.some((l: any) => Number(l.user_id) === currentUserId)
  );

  return {
    id: Number(row.id),
    userId: Number(row.author_id),
    fullName: author.full_name || 'Notredamian Alumnus',
    avatarUrl: author.avatar_url || '/ndc-logo.png',
    batchYear: author.batch_year || 68,
    content: row.content || '',
    images: Array.isArray(row.images) ? row.images : [],
    videos: Array.isArray(row.videos) ? row.videos : [],
    likesCount: Number(row.likes_count) || (row.post_likes?.length ?? 0),
    commentsCount: comments.length,
    createdAt: new Date(row.created_at).toLocaleDateString(),
    likedByMe: isLiked,
    comments: comments,
    category: row.category || 'General Update',
    isEdited: Boolean(row.is_edited),
    pinned: Boolean(row.is_pinned),
    author: author.full_name || 'Notredamian Alumnus',
    authorAvatar: author.avatar_url || '/ndc-logo.png',
    authorBatch: author.batch_year || 68,
    authorRole: 'Alumnus',
    verified: author.verification_status === 'verified',
    timestamp: new Date(row.created_at).toLocaleDateString(),
    likes: Number(row.likes_count) || (row.post_likes?.length ?? 0),
    liked: isLiked,
    commentsList: comments,
    shares: 0,
  } as unknown as PostItem;
}

export async function fetchFeedPostsFromDb(limit = 50, currentUserId?: number): Promise<PostItem[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  // 1. Directly fetch posts from public.posts table (avoids brittle PostgREST nested joins)
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      author_id,
      content,
      category,
      images,
      videos,
      likes_count,
      comments_count,
      is_pinned,
      is_edited,
      created_at
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (postsError) {
    console.error('Supabase fetchFeedPosts error loading posts:', postsError);
    throw new Error(`Failed to load posts from Supabase: ${postsError.message || postsError.code}`);
  }

  if (!postsData || postsData.length === 0) {
    return [];
  }

  // 2. Collect author IDs and post IDs for batched queries
  const authorIds = Array.from(
    new Set(postsData.map((p) => Number(p.author_id)).filter((id) => id > 0))
  );
  const postIds = postsData.map((p) => Number(p.id));

  // 3. Batch fetch author profiles
  const authorMap = new Map<number, any>();
  if (authorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('alumni_profiles')
      .select('id, full_name, avatar_url, batch_year, verification_status, profession, institution')
      .in('id', authorIds);

    if (profilesError) {
      console.warn('Supabase fetchFeedPosts warning loading author profiles:', profilesError.message);
    } else if (profiles) {
      profiles.forEach((p: any) => authorMap.set(Number(p.id), p));
    }
  }

  // 4. Batch fetch comments for these posts
  const commentsByPost = new Map<number, any[]>();
  if (postIds.length > 0) {
    const { data: comments, error: commentsError } = await supabase
      .from('post_comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        likes_count,
        created_at
      `)
      .in('post_id', postIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.warn('Supabase fetchFeedPosts warning loading post comments:', commentsError.message);
    } else if (comments && comments.length > 0) {
      // Find any commenters whose profiles we don't have yet
      const commenterIds = Array.from(
        new Set(
          comments
            .map((c: any) => Number(c.user_id))
            .filter((id: number) => id > 0 && !authorMap.has(id))
        )
      );

      if (commenterIds.length > 0) {
        const { data: commenterProfiles } = await supabase
          .from('alumni_profiles')
          .select('id, full_name, avatar_url, batch_year, verification_status')
          .in('id', commenterIds);

        if (commenterProfiles) {
          commenterProfiles.forEach((cp: any) => authorMap.set(Number(cp.id), cp));
        }
      }

      // Group comments with attached author profile
      for (const c of comments) {
        const pId = Number(c.post_id);
        const cAuthor = authorMap.get(Number(c.user_id)) || {};
        const commentWithAuthor = { ...c, author: cAuthor };
        const list = commentsByPost.get(pId) || [];
        list.push(commentWithAuthor);
        commentsByPost.set(pId, list);
      }
    }
  }

  // 5. Batch fetch likes for active user (if currentUserId provided)
  const userLikesSet = new Set<number>();
  if (currentUserId && postIds.length > 0) {
    const { data: likes, error: likesError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds);

    if (!likesError && likes) {
      likes.forEach((l: any) => userLikesSet.add(Number(l.post_id)));
    }
  }

  // 6. Map and combine into complete PostItem array
  return postsData.map((row: any) => {
    const pId = Number(row.id);
    const author = authorMap.get(Number(row.author_id)) || {};
    const comments = commentsByPost.get(pId) || [];
    const isLiked = userLikesSet.has(pId);

    return mapRowToFeedPost(
      {
        ...row,
        author,
        post_comments: comments,
        post_likes: isLiked ? [{ user_id: currentUserId }] : [],
      },
      currentUserId
    );
  });
}

/**
 * Uploads a base64 Data URL or temporary Blob URL to Supabase Storage 'post-media' bucket,
 * returning the persistent public CDN URL.
 */
async function resolveAndUploadMediaToStorage(
  urlOrData: string,
  authorId: number,
  mediaType: 'image' | 'video'
): Promise<string> {
  if (!urlOrData || (!urlOrData.startsWith('data:') && !urlOrData.startsWith('blob:'))) {
    return urlOrData;
  }

  try {
    let blob: Blob | null = null;
    let mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    let ext = mediaType === 'video' ? 'mp4' : 'jpg';

    if (urlOrData.startsWith('data:')) {
      const commaIdx = urlOrData.indexOf(',');
      if (commaIdx !== -1) {
        const header = urlOrData.slice(0, commaIdx);
        const base64Str = urlOrData.slice(commaIdx + 1);
        const mimeMatch = header.match(/:(.*?);/);
        if (mimeMatch && mimeMatch[1]) {
          mimeType = mimeMatch[1];
        }
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        else if (mimeType.includes('svg')) ext = 'svg';
        else if (mimeType.includes('mp4')) ext = 'mp4';
        else if (mimeType.includes('webm')) ext = 'webm';
        else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = 'mov';

        const binary = atob(base64Str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      }
    } else if (urlOrData.startsWith('blob:')) {
      const res = await fetch(urlOrData);
      blob = await res.blob();
      if (blob.type) {
        mimeType = blob.type;
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        else if (mimeType.includes('svg')) ext = 'svg';
        else if (mimeType.includes('mp4')) ext = 'mp4';
        else if (mimeType.includes('webm')) ext = 'webm';
        else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = 'mov';
      }
    }

    if (blob) {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const uploadRes = await uploadMediaToSupabaseStorage(
        blob,
        'post-media',
        `posts/${authorId}`,
        fileName
      );
      if (uploadRes?.publicUrl) {
        return uploadRes.publicUrl;
      }
      throw new Error('Supabase Storage did not return a permanent media URL.');
    }
  } catch (err) {
    console.warn('Failed to upload post media to Supabase Storage:', err);
    throw new Error(`Could not upload the attached ${mediaType}. Please try again.`);
  }

  throw new Error(`Could not upload the attached ${mediaType}. Please try again.`);
}

export async function createFeedPostInDb(params: {
  authorId?: number;
  content: string;
  category: string;
  images?: string[];
  videos?: string[];
}): Promise<{ success: boolean; post?: PostItem; error?: string }> {
  if (!isSupabaseConfigured) {
    const fallbackId = Date.now();
    const fallbackPost: PostItem = {
      id: fallbackId,
      userId: params.authorId || 1,
      fullName: 'Notredamian Alumnus',
      avatarUrl: '/ndc-logo.png',
      batchYear: 68,
      content: params.content.trim() || 'Shared an update',
      images: params.images || [],
      videos: params.videos || [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: 'Just now',
      likedByMe: false,
      comments: [],
      category: params.category || 'General Update',
      isEdited: false,
      pinned: false,
      author: 'Notredamian Alumnus',
      authorAvatar: '/ndc-logo.png',
      authorBatch: 68,
      authorRole: 'Alumnus',
      verified: true,
      timestamp: 'Just now',
      likes: 0,
      liked: false,
      commentsList: [],
      shares: 0,
    } as unknown as PostItem;
    return { success: true, post: fallbackPost };
  }

  try {
    // 1. Get authenticated Supabase user (checking server user first, then active session)
    let { data: authData } = await supabase.auth.getUser();
    let authUser = authData?.user;

    if (!authUser) {
      const { data: sessionData } = await supabase.auth.getSession();
      authUser = sessionData?.session?.user ?? null;
    }

    if (!authUser) {
      return {
        success: false,
        error: 'You must be signed in with a valid account to publish a post to Supabase.',
      };
    }

    // 2. Always obtain the authenticated user's real alumni_profiles.id from Supabase
    let profileRow: any = null;

    const { data: existingProfile } = await supabase
      .from('alumni_profiles')
      .select('id, full_name, avatar_url, batch_year, verification_status, profession, institution')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (existingProfile?.id) {
      profileRow = existingProfile;
    } else {
      // Check if profile exists by email and link auth_user_id
      if (authUser.email) {
        const { data: profileByEmail } = await supabase
          .from('alumni_profiles')
          .select('id, full_name, avatar_url, batch_year, verification_status, profession, institution')
          .ilike('email', authUser.email.trim())
          .maybeSingle();

        if (profileByEmail?.id) {
          try {
            await supabase
              .from('alumni_profiles')
              .update({ auth_user_id: authUser.id })
              .eq('id', profileByEmail.id);
          } catch {}
          profileRow = profileByEmail;
        }
      }

      // Check if profile exists by authorId
      if (!profileRow?.id && params.authorId && params.authorId > 0) {
        const { data: profileById } = await supabase
          .from('alumni_profiles')
          .select('id, full_name, avatar_url, batch_year, verification_status, profession, institution')
          .eq('id', params.authorId)
          .maybeSingle();

        if (profileById?.id) {
          try {
            await supabase
              .from('alumni_profiles')
              .update({ auth_user_id: authUser.id })
              .eq('id', profileById.id);
          } catch {}
          profileRow = profileById;
        }
      }

      // If still not found, ensure profile record is created for this authUser
      if (!profileRow?.id) {
        const created = await getOrCreateSupabaseProfile(authUser);
        if (created?.id) {
          profileRow = created;
        }
      }
    }

    if (!profileRow?.id || Number(profileRow.id) <= 0) {
      return {
        success: false,
        error: 'Unable to publish: Could not verify your registered alumni profile in Supabase.',
      };
    }

    const realAuthorId = Number(profileRow.id);

    // 3. Resolve and upload attached media (photos and videos) to Supabase Storage 'post-media' bucket
    const uploadedImages: string[] = [];
    if (Array.isArray(params.images)) {
      for (const img of params.images) {
        if (!img) continue;
        if (img.startsWith('data:') || img.startsWith('blob:')) {
          const uploadedUrl = await resolveAndUploadMediaToStorage(img, realAuthorId, 'image');
          uploadedImages.push(uploadedUrl);
        } else {
          uploadedImages.push(img);
        }
      }
    }

    const uploadedVideos: string[] = [];
    if (Array.isArray(params.videos)) {
      for (const vid of params.videos) {
        if (!vid) continue;
        if (vid.startsWith('data:') || vid.startsWith('blob:')) {
          const uploadedUrl = await resolveAndUploadMediaToStorage(vid, realAuthorId, 'video');
          uploadedVideos.push(uploadedUrl);
        } else {
          uploadedVideos.push(vid);
        }
      }
    }

    // 4. Validate and sanitize content and category to satisfy schema constraints
    const validCategories = [
      'General Update',
      'Tech & Innovation',
      'Professional Insights',
      'Reunion',
      'Achievement',
    ];
    const safeCategory = params.category && validCategories.includes(params.category)
      ? params.category
      : 'General Update';

    let safeContent = params.content?.trim();
    if (!safeContent) {
      safeContent = uploadedImages.length > 0
        ? (uploadedImages.length > 1 ? `Shared ${uploadedImages.length} photos` : 'Shared a photo')
        : (uploadedVideos.length > 0 ? 'Shared a video' : 'Shared an update');
    }
    if (safeContent.length > 10000) {
      safeContent = safeContent.slice(0, 10000);
    }

    // 5. Prepare insert payload with real alumni_profiles.id and CDN-hosted media URLs
    const insertPayload = {
      author_id: realAuthorId,
      content: safeContent,
      category: safeCategory,
      images: uploadedImages,
      videos: uploadedVideos,
    };

    // 6. Insert into public.posts
    const { data: insertedRow, error: insertError } = await supabase
      .from('posts')
      .insert(insertPayload)
      .select(`
        id,
        author_id,
        content,
        category,
        images,
        videos,
        likes_count,
        comments_count,
        is_pinned,
        is_edited,
        created_at
      `)
      .single();

    if (insertError || !insertedRow) {
      console.error('Supabase createFeedPost insert error:', insertError);
      return {
        success: false,
        error: insertError?.message || 'Failed to save post to Supabase database',
      };
    }

    const postItem = mapRowToFeedPost({ ...insertedRow, author: profileRow }, realAuthorId);
    return { success: true, post: postItem };
  } catch (err: any) {
    console.error('Failed to insert post in Supabase:', err);
    return { success: false, error: err.message || 'Unexpected error inserting post' };
  }
}

export async function togglePostLikeInDb(
  postId: number,
  userId?: number
): Promise<{ liked: boolean; likesCount: number }> {
  if (!isSupabaseConfigured) return { liked: true, likesCount: 1 };

  try {
    let likeUserId = userId && userId > 0 ? userId : null;
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;
    if (authUser) {
      const { data: profile } = await supabase
        .from('alumni_profiles')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
      if (profile?.id) {
        likeUserId = Number(profile.id);
      }
    }

    if (!likeUserId) return { liked: false, likesCount: 0 };

    // Check if like already exists
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', likeUserId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      return { liked: false, likesCount: -1 };
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: likeUserId });
      return { liked: true, likesCount: 1 };
    }
  } catch (err) {
    console.warn('Supabase togglePostLike error:', err);
    return { liked: true, likesCount: 1 };
  }
}

export async function addPostCommentInDb(params: {
  postId: number;
  userId?: number;
  content: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    let commentAuthorId = params.userId && params.userId > 0 ? params.userId : null;
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;
    if (authUser) {
      const { data: profile } = await supabase
        .from('alumni_profiles')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
      if (profile?.id) {
        commentAuthorId = Number(profile.id);
      }
    }

    if (!commentAuthorId) return false;

    const { error } = await supabase.from('post_comments').insert({
      post_id: params.postId,
      user_id: commentAuthorId,
      content: params.content,
    });
    return !error;
  } catch {
    return false;
  }
}

// Reconciled: saved_posts table
export async function toggleSavePostInDb(
  postId: number,
  userId: number
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { data: existing } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('saved_posts').delete().eq('id', existing.id);
      return false;
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: userId });
      return true;
    }
  } catch {
    return true;
  }
}

// =============================================================================
// 3. BLOOD LIFELINE NETWORK
// =============================================================================

export async function fetchBloodRequestsFromDb(): Promise<BloodEmergencyRequest[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('blood_requests')
      .select(
        `
        *,
        requester:alumni_profiles!blood_requests_requester_id_fkey (
          id,
          full_name,
          batch_year,
          avatar_url
        ),
        blood_request_responses (
          id,
          request_id,
          donor_user_id,
          status,
          note,
          responded_at,
          donor:alumni_profiles!blood_request_responses_donor_user_id_fkey (
            id,
            full_name,
            batch_year,
            avatar_url,
            blood_group
          )
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((r: any) => ({
      id: r.id,
      requestCode: r.coordination_ref || `EMG-${String(r.id).slice(0, 6)}`,
      bloodGroup: r.blood_group,
      unitsRequired: r.units_required,
      unitsFulfilled: r.units_fulfilled || 0,
      hospitalName: r.hospital_name,
      hospitalArea: r.hospital_area,
      city: r.city || 'Dhaka',
      requiredDateTime: r.required_datetime,
      emergencyLevel: r.emergency_level,
      contactMethod: r.contact_method,
      description: r.description,
      requesterId: Number(r.requester_profile_id || r.requester?.id || 1),
      requesterName: r.requester?.full_name || 'Notredamian Alumnus',
      requesterAvatar: r.requester?.avatar_url || '/ndc-logo.png',
      requesterBatch: r.requester?.batch_year || 68,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      expiresAt: r.expires_at,
      verifiedByAdmin: r.verified_by_admin_id ? String(r.verified_by_admin_id) : undefined,
      moderationNote: r.moderation_note || undefined,
      responses: (r.blood_request_responses || []).map((resp: any) => ({
        id: resp.id,
        requestId: resp.request_id,
        donorUserId: Number(resp.donor_user_id),
        donorName: resp.donor?.full_name || 'Brother Donor',
        donorAvatar: resp.donor?.avatar_url || '/ndc-logo.png',
        donorBatchYear: resp.donor?.batch_year || 68,
        donorBloodGroup: resp.donor?.blood_group || r.blood_group,
        donorPreferredArea: r.hospital_area,
        respondedAt: new Date(resp.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: resp.status,
        note: resp.note || undefined,
      })),
    }));
  } catch (err) {
    console.warn('Supabase fetchBloodRequests error:', err);
    return [];
  }
}

export async function respondToBloodRequestInDb(params: {
  requestId: string;
  donorUserId: number;
  status?: 'offered' | 'accepted' | 'confirmed_donated' | 'declined';
  note?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('blood_request_responses').upsert({
      request_id: params.requestId,
      donor_user_id: params.donorUserId,
      status: params.status || 'offered',
      note: params.note || null,
      updated_at: new Date().toISOString(),
    });

    return !error;
  } catch (err) {
    console.warn('Failed to respond to blood request:', err);
    return false;
  }
}

export async function fetchBloodDonorsFromDb(): Promise<BloodDonorProfile[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    // Note: Never select sensitive PII columns directly
    const { data, error } = await supabase
      .from('blood_donors')
      .select(
        `
        user_id,
        blood_group,
        is_registered_donor,
        availability,
        preferred_area,
        city,
        last_donation_date,
        emergency_alert_preference,
        donation_history,
        alumnus:alumni_profiles!blood_donors_user_id_fkey (
          id,
          full_name,
          batch_year,
          avatar_url,
          verification_status,
          city,
          country
        )
      `
      )
      .eq('is_registered_donor', true);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((d: any) => ({
      userId: Number(d.user_id),
      fullName: d.alumnus?.full_name || 'Notredamian Donor',
      avatarUrl: d.alumnus?.avatar_url || '/ndc-logo.png',
      batchYear: d.alumnus?.batch_year || 68,
      verificationStatus: d.alumnus?.verification_status || 'verified',
      bloodGroup: d.blood_group,
      isRegisteredDonor: d.is_registered_donor,
      availability: d.availability,
      preferredArea: d.preferred_area,
      city: d.city || 'Dhaka',
      lastDonationDate: d.last_donation_date || undefined,
      emergencyAlertPreference: d.emergency_alert_preference,
      donationHistory: Array.isArray(d.donation_history) ? d.donation_history : [],
      updatedAt: d.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Supabase fetchBloodDonors error:', err);
    return [];
  }
}

export async function createBloodRequestInDb(params: {
  requesterId: number;
  bloodGroup: string;
  unitsRequired: number;
  hospitalName: string;
  hospitalArea: string;
  city: string;
  requiredDateTime: string;
  emergencyLevel: string;
  contactMethod: string;
  description: string;
  status: string;
  coordinationRef?: string;
  patientRelation?: string;
}): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const requiredDate = new Date(params.requiredDateTime);
  if (Number.isNaN(requiredDate.getTime()) || requiredDate.getTime() <= Date.now()) {
    return null;
  }

  const validEmergencyLevels = ['critical', 'urgent', 'standard'];
  const normalizedLevel = (params.emergencyLevel || 'urgent').toLowerCase();
  const emergencyLevel = validEmergencyLevels.includes(normalizedLevel) ? normalizedLevel : 'urgent';

  const validContactMethods = [
    'Portal Secure Coordination',
    'Hospital Blood Bank Desk',
    'Batch Coordinator Relay',
    'Attendant Emergency Line',
  ];
  const contactMethod = validContactMethods.includes(params.contactMethod)
    ? params.contactMethod
    : 'Portal Secure Coordination';

  try {
    const { data, error } = await supabase
      .from('blood_requests')
      .insert({
        requester_id: params.requesterId,
        blood_group: params.bloodGroup,
        units_required: params.unitsRequired,
        hospital_name: params.hospitalName,
        hospital_area: params.hospitalArea,
        city: params.city || 'Dhaka',
        required_datetime: requiredDate.toISOString(),
        emergency_level: emergencyLevel,
        contact_method: contactMethod,
        coordination_ref: params.coordinationRef || null,
        patient_relation: params.patientRelation || null,
        description: params.description,
        status: params.status,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      console.warn('Failed to insert blood request:', error?.message);
      return null;
    }
    return String(data.id);
  } catch (err) {
    console.warn('Failed to insert blood request:', err);
    return null;
  }
}

export async function registerBloodDonorInDb(params: {
  userId: number;
  bloodGroup: string;
  isRegisteredDonor: boolean;
  availability: string;
  preferredArea: string;
  city: string;
  lastDonationDate?: string;
  emergencyAlertPreference: string;
  donationHistory?: BloodDonationHistoryItem[];
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('blood_donors').upsert({
      user_id: params.userId,
      blood_group: params.bloodGroup,
      is_registered_donor: params.isRegisteredDonor,
      availability: params.availability,
      preferred_area: params.preferredArea,
      city: params.city,
      last_donation_date: params.lastDonationDate || null,
      emergency_alert_preference: params.emergencyAlertPreference,
      donation_history: params.donationHistory || [],
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Failed to upsert blood donor in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to upsert blood donor in Supabase:', err);
    return false;
  }
}

// =============================================================================
// 4. VERIFICATION & PEER VOUCHING
// =============================================================================

export async function fetchVerificationRequestsFromDb(batchYear?: number): Promise<VouchRequest[]> {
  if (!isSupabaseConfigured) return [];

  try {
    let query = supabase
      .from('verification_requests')
      .select(
        `
        *,
        requester:alumni_profiles!verification_requests_requester_id_fkey (
          id,
          full_name,
          avatar_url,
          batch_year,
          college_roll
        ),
        peer_vouches (
          id,
          voucher_id,
          voucher_batch,
          comment,
          created_at,
          voucher:alumni_profiles!peer_vouches_voucher_id_fkey (
            id,
            full_name,
            avatar_url,
            batch_year
          )
        )
      `
      )
      .eq('status', 'pending');

    if (batchYear) {
      query = query.eq('batch_year', batchYear);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      requesterId: Number(r.requester_id),
      requesterName: r.requester?.full_name || 'Notredamian Alumnus',
      requesterAvatar: r.requester?.avatar_url || '/ndc-logo.png',
      batchYear: r.batch_year,
      collegeRoll: r.college_roll,
      group: r.academic_stream,
      section: r.section || '',
      createdAt: r.created_at,
      status: r.status,
      targetVouches: r.target_vouches || 2,
      vouches: (r.peer_vouches || []).map((v: any) => ({
        id: v.id,
        voucherId: Number(v.voucher_id),
        voucherName: v.voucher?.full_name || 'Brother Alumnus',
        voucherAvatar: v.voucher?.avatar_url || '/ndc-logo.png',
        voucherBatch: v.voucher_batch,
        date: new Date(v.created_at).toLocaleDateString(),
        comment: v.comment || undefined,
      })),
    }));
  } catch {
    return [];
  }
}

export async function submitPeerVouchInDb(params: {
  verificationRequestId: string;
  requesterId: number;
  voucherId: number;
  voucherBatch: number;
  comment?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('peer_vouches').insert({
      verification_request_id: params.verificationRequestId,
      requester_id: params.requesterId,
      voucher_id: params.voucherId,
      voucher_batch: params.voucherBatch,
      comment: params.comment || null,
    });

    return !error;
  } catch (err) {
    console.warn('Failed to insert peer vouch in Supabase:', err);
    return false;
  }
}

export async function createVerificationRequestInDb(params: {
  requesterId: number;
  batchYear: number;
  collegeRoll: string;
  academicStream: string;
  academicGroup?: string | null;
  section?: string | null;
  message?: string | null;
  targetVouches?: number;
}): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('verification_requests')
      .insert({
        requester_id: params.requesterId,
        batch_year: params.batchYear,
        college_roll: params.collegeRoll,
        academic_stream: params.academicStream,
        academic_group: params.academicGroup || null,
        section: params.section || null,
        message: params.message || null,
        target_vouches: params.targetVouches || 2,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.warn('Failed to insert verification request:', error?.message);
      return null;
    }
    return String(data.id);
  } catch (err) {
    console.warn('createVerificationRequestInDb error:', err);
    return null;
  }
}

export async function submitAdminDocSubmissionInDb(params: {
  userId: number;
  batchYear: number;
  collegeRoll: string;
  academicStream: string;
  academicGroup?: string | null;
  docType: string;
  docTypeLabel: string;
  storageObjectPath: string;
}): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const validDocTypes = ['id_card', 'nid_card', 'hsc_slip', 'souvenir'];
  const normalizedDocType = (params.docType || 'id_card').toLowerCase();
  const docType = validDocTypes.includes(normalizedDocType) ? normalizedDocType : 'id_card';

  try {
    const { data, error } = await supabase
      .from('admin_doc_submissions')
      .insert({
        user_id: params.userId,
        batch_year: params.batchYear,
        college_roll: params.collegeRoll,
        academic_stream: params.academicStream,
        academic_group: params.academicGroup || null,
        doc_type: docType,
        doc_type_label: params.docTypeLabel,
        storage_object_path: params.storageObjectPath,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.warn('Failed to insert admin doc submission:', error?.message);
      return null;
    }
    return String(data.id);
  } catch (err) {
    console.warn('submitAdminDocSubmissionInDb error:', err);
    return null;
  }
}

export async function editFeedPostInDb(params: {
  postId: number;
  content: string;
  category?: string;
  images?: string[];
  videos?: string[];
}): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const uploadedImages: string[] = [];
    if (Array.isArray(params.images)) {
      for (const img of params.images) {
        if (!img) continue;
        if (img.startsWith('data:') || img.startsWith('blob:')) {
          const uploadedUrl = await resolveAndUploadMediaToStorage(img, params.postId, 'image');
          uploadedImages.push(uploadedUrl);
        } else {
          uploadedImages.push(img);
        }
      }
    }

    const uploadedVideos: string[] = [];
    if (Array.isArray(params.videos)) {
      for (const vid of params.videos) {
        if (!vid) continue;
        if (vid.startsWith('data:') || vid.startsWith('blob:')) {
          const uploadedUrl = await resolveAndUploadMediaToStorage(vid, params.postId, 'video');
          uploadedVideos.push(uploadedUrl);
        } else {
          uploadedVideos.push(vid);
        }
      }
    }

    const validCategories = [
      'General Update',
      'Tech & Innovation',
      'Professional Insights',
      'Reunion',
      'Achievement',
    ];
    const safeCategory = params.category && validCategories.includes(params.category)
      ? params.category
      : 'General Update';

    let safeContent = params.content?.trim();
    if (!safeContent) {
      safeContent = uploadedImages.length > 0
        ? (uploadedImages.length > 1 ? `Shared ${uploadedImages.length} photos` : 'Shared a photo')
        : (uploadedVideos.length > 0 ? 'Shared a video' : 'Updated post');
    }

    const { error } = await supabase
      .from('posts')
      .update({
        content: safeContent.slice(0, 10000),
        category: safeCategory,
        images: uploadedImages,
        videos: uploadedVideos,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.postId);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteFeedPostInDb(postId: number): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', postId);
    return !error;
  } catch {
    return false;
  }
}

// =============================================================================
// 5. OFFICIAL NOTICES & GALLERY
// =============================================================================

export async function fetchOfficialNoticesFromDb(): Promise<OfficialNotice[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('official_notices')
      .select('*')
      .eq('is_published', true)
      .order('published_date', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((n: any) => ({
      id: n.id,
      refNo: n.ref_no,
      title: n.title,
      category: n.category,
      publishedDate: n.published_date,
      isUrgent: Boolean(n.is_urgent),
      summary: n.summary,
      fullContent: n.full_content,
      pdfUrl: n.pdf_url || undefined,
      fileSize: n.file_size || undefined,
      signatory: {
        name: n.signatory_name,
        designation: n.signatory_designation,
        organization: n.signatory_organization,
      },
    }));
  } catch {
    return [];
  }
}

export async function fetchGalleryAlbumsFromDb(): Promise<GalleryAlbum[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('gallery_albums')
      .select('*, gallery_photos(*)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((a: any) => {
      const photos: GalleryPhoto[] = (a.gallery_photos || []).map((p: any) => ({
        id: p.id,
        url: p.url,
        caption: p.caption || '',
        category: a.category,
        batchYear: p.batch_year || a.batch_year,
        year: String(a.batch_year || 2026),
        uploaderName: 'NDC Archive',
        likes: Number(p.likes_count) || 0,
        liked: false,
        tags: p.tags || [],
        mediaType: p.media_type || 'image',
        fileSize: p.file_size || '1.2 MB',
      }));

      return {
        id: Number(a.id),
        title: a.title,
        description: a.description || '',
        category: a.category,
        date: a.event_date_label || '2026',
        location: a.location || 'Motijheel Campus',
        batchYear: a.batch_year || undefined,
        photosCount: photos.length,
        coverUrl: a.cover_url || (photos[0]?.url ?? '/ndc-logo.png'),
        photos,
      };
    });
  } catch {
    return [];
  }
}

export async function createGalleryAlbumInDb(params: {
  title: string;
  description?: string;
  category: string;
  eventDateLabel: string;
  location?: string;
  batchYear?: number;
  coverUrl: string;
  createdById?: number;
}): Promise<number | null> {
  if (!isSupabaseConfigured) return null;

  const validCategories = ['reunion', 'academic', 'campus', 'convocation', 'sports', 'cultural', 'all'];
  const normalizedCategory = (params.category || 'campus').toLowerCase();
  const category = validCategories.includes(normalizedCategory) ? normalizedCategory : 'campus';

  try {
    const { data, error } = await supabase
      .from('gallery_albums')
      .insert({
        title: params.title,
        description: params.description || null,
        category: category,
        event_date_label: params.eventDateLabel,
        location: params.location || null,
        batch_year: params.batchYear || null,
        cover_url: params.coverUrl,
        created_by_id: params.createdById || null,
        is_published: true,
      })
      .select('id')
      .single();

    if (error || !data) return null;
    return Number(data.id);
  } catch {
    return null;
  }
}

export async function addPhotoToGalleryAlbumInDb(params: {
  albumId: number;
  url: string;
  caption?: string;
  batchYear?: number;
  tags?: string[];
  mediaType?: string;
  fileSize?: string;
  uploaderId?: number;
}): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('gallery_photos')
      .insert({
        album_id: params.albumId,
        url: params.url,
        caption: params.caption || null,
        batch_year: params.batchYear || null,
        tags: params.tags || [],
        media_type: params.mediaType || 'image',
        file_size: params.fileSize || null,
        uploader_id: params.uploaderId || null,
        is_approved: true,
      })
      .select('id')
      .single();

    if (error || !data) return null;
    return String(data.id);
  } catch {
    return null;
  }
}

// =============================================================================
// 6. NOTIFICATIONS
// =============================================================================

export async function fetchNotificationsFromDb(
  userId: number
): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:alumni_profiles!notifications_actor_id_fkey(id, full_name, avatar_url)')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((n: any) => ({
      id: Number(n.id),
      title: n.title || 'Notification',
      message: n.message || '',
      timeAgo: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: Boolean(n.unread),
      type: n.type || 'system',
      targetRoute: n.target_route || undefined,
      bloodRequestId: n.blood_request_id || undefined,
    }));
  } catch {
    return [];
  }
}

export async function markNotificationReadInDb(notificationId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('notifications')
      .update({ unread: false })
      .eq('id', Number(notificationId));
  } catch {}
}

export async function createNotificationInDb(params: {
  recipientId: number;
  actorId?: number;
  type?: string;
  title: string;
  message: string;
  targetRoute?: string;
  postId?: number;
  bloodRequestId?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const validTypes = ['like', 'comment', 'post', 'system', 'blood', 'verification'];
  const normalizedType = (params.type || 'system').toLowerCase();
  const type = validTypes.includes(normalizedType) ? normalizedType : 'system';

  try {
    const { error } = await supabase.from('notifications').insert({
      recipient_id: params.recipientId,
      actor_id: params.actorId || null,
      type: type,
      title: params.title,
      message: params.message,
      target_route: params.targetRoute || null,
      post_id: params.postId || null,
      blood_request_id: params.bloodRequestId || null,
      unread: true,
    });
    return !error;
  } catch {
    return false;
  }
}

// =============================================================================
// 7. SUPABASE STORAGE HELPER
// =============================================================================

export async function uploadMediaToSupabaseStorage(
  file: File | Blob,
  bucketName: 'avatars' | 'post-media' | 'verification-documents' | 'gallery',
  folderPath: string,
  fileName?: string
): Promise<{ publicUrl: string; storagePath: string } | null> {
  if (!isSupabaseConfigured) return null;

  try {
    let ext = 'jpg';
    if (file.type) {
      if (file.type.includes('png')) ext = 'png';
      else if (file.type.includes('webp')) ext = 'webp';
      else if (file.type.includes('gif')) ext = 'gif';
      else if (file.type.includes('svg')) ext = 'svg';
      else if (file.type.includes('mp4')) ext = 'mp4';
      else if (file.type.includes('webm')) ext = 'webm';
      else if (file.type.includes('quicktime') || file.type.includes('mov')) ext = 'mov';
    } else if ('name' in file && typeof (file as any).name === 'string') {
      const parts = (file as any).name.split('.');
      if (parts.length > 1) ext = parts.pop()!.toLowerCase();
    }

    const name = fileName || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const fullPath = `${folderPath}/${name}`;
    const contentType = file.type || (bucketName === 'post-media' ? 'image/jpeg' : undefined);

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.warn(`Supabase Storage upload to ${bucketName} error:`, uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fullPath);
    return {
      publicUrl: urlData.publicUrl,
      storagePath: fullPath,
    };
  } catch (err) {
    console.warn('Storage upload error:', err);
    return null;
  }
}

/**
 * Uploads an identity document (NDC ID, HSC slip, Souvenir) directly to the private
 * `verification-documents` bucket in Supabase Storage.
 * Only the file owner and authorized admins have access (enforced via Storage RLS).
 */
export async function uploadVerificationDocumentToStorage(
  file: File | Blob,
  authUserId: string
): Promise<{ storagePath: string } | null> {
  if (!isSupabaseConfigured || !authUserId) return null;

  // File size limit: 5 MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Verification document file size exceeds the 5MB limit.');
  }

  // Allowed file types: JPG, PNG, WEBP
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  let mimeType = file.type;
  if (!mimeType || !allowedMimes.includes(mimeType)) {
    const fileName = (file as any).name || '';
    if (/\.jpe?g$/i.test(fileName)) mimeType = 'image/jpeg';
    else if (/\.png$/i.test(fileName)) mimeType = 'image/png';
    else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';
    else {
      throw new Error('Only JPG, PNG, and WEBP image formats are accepted for verification documents.');
    }
  }

  let ext = 'jpg';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('webp')) ext = 'webp';

  // Folder must start with auth.uid() to fulfill Storage RLS policy
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const fullPath = `${authUserId}/${uniqueName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false, // Strict: Prevent unauthorized file overwrites
        contentType: mimeType,
      });

    if (uploadError) {
      console.warn('Supabase verification-documents storage upload error:', uploadError.message);
      throw new Error(uploadError.message || 'Failed to upload verification document to storage.');
    }

    return { storagePath: fullPath };
  } catch (err: any) {
    console.warn('uploadVerificationDocumentToStorage error:', err);
    throw err;
  }
}
