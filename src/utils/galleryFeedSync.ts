import { GalleryAlbum, GalleryPhoto, AlumniProfile, PostItem } from '../types';
import { createFeedPostInDb } from '../services/supabaseService';

export interface SyncNewAlbumFeedParams {
  album: GalleryAlbum;
  author: AlumniProfile;
}

export interface SyncUploadedPhotosFeedParams {
  album: GalleryAlbum;
  newPhotos: GalleryPhoto[];
  author: AlumniProfile;
}

/**
 * Automatically creates an activity post in the Quad Feed when a new gallery album is created.
 */
export async function syncNewAlbumToQuadFeed({
  album,
  author,
}: SyncNewAlbumFeedParams): Promise<PostItem> {
  // Collect preview images from the album (up to 5 for collage preview)
  const albumPhotos = album.photos && album.photos.length > 0 ? album.photos.map((p) => p.url) : [];
  const previewImages = albumPhotos.length > 0 ? albumPhotos.slice(0, 5) : [album.coverUrl];

  const albumTitle = album.title.trim();
  const descriptionText = album.description?.trim();
  const locationText = album.location?.trim();

  // Activity post caption
  let content = `📸 Created a new gallery album: "${albumTitle}"`;
  if (descriptionText) {
    content += `\n\n${descriptionText}`;
  }
  if (locationText) {
    content += `\n📍 ${locationText}`;
  }

  const newPostId = Date.now();
  const newPost: PostItem = {
    id: newPostId,
    userId: author.id || author.userId || 0,
    fullName: author.fullName || 'Notre Dame Alumnus',
    avatarUrl:
      author.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    batchYear: author.batchYear || 0,
    content,
    images: previewImages,
    likesCount: 0,
    commentsCount: 0,
    comments: [],
    createdAt: new Date().toISOString(),
    likedByMe: false,
    category: 'Campus Memories',
    postType: 'gallery_album',
    link_metadata: {
      postType: 'gallery_album',
      actionType: 'create_album',
      albumId: album.id,
      albumTitle: albumTitle,
      albumCategory: album.category,
      albumCover: album.coverUrl,
      photoCount: album.photosCount || album.photos?.length || previewImages.length,
      location: album.location,
      eventDate: album.date,
      previewPhotos: previewImages,
    },
  };

  // 1. Persist to localStorage for immediate offline and reload persistence
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('ndc_alumni_posts');
      const posts: PostItem[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem('ndc_alumni_posts', JSON.stringify([newPost, ...posts]));
    } catch (e) {
      console.warn('Failed to store new album post in localStorage:', e);
    }

    // 2. Broadcast event to live feed listeners
    window.dispatchEvent(
      new CustomEvent('ndc_post_created', {
        detail: { post: newPost },
      })
    );
  }

  // 3. Persist to Supabase asynchronously
  createFeedPostInDb({
    authorId: author.id || author.userId,
    content: newPost.content,
    category: 'Campus Memories',
    images: newPost.images,
    linked_url: newPost.linked_url,
    link_metadata: newPost.link_metadata,
  }).catch((err) => {
    console.warn('createFeedPostInDb for new album sync fallback:', err);
  });

  return newPost;
}

/**
 * Automatically creates an activity post in the Quad Feed when photos are uploaded to an existing album.
 */
export async function syncUploadedPhotosToQuadFeed({
  album,
  newPhotos,
  author,
}: SyncUploadedPhotosFeedParams): Promise<PostItem> {
  const uploadedUrls = newPhotos.map((p) => p.url);

  // Build preview collage images: prioritize uploaded photos; fill with existing album photos if < 4
  const collageImages = [...uploadedUrls];
  if (collageImages.length < 4 && album.photos && album.photos.length > 0) {
    for (const p of album.photos) {
      if (!collageImages.includes(p.url)) {
        collageImages.push(p.url);
        if (collageImages.length >= 4) break;
      }
    }
  }

  const count = newPhotos.length;
  const albumTitle = album.title.trim();
  const firstCaption = newPhotos[0]?.caption?.trim();

  let content = `🖼️ Added ${count} new photo${count > 1 ? 's' : ''} to "${albumTitle}"`;
  if (firstCaption && !firstCaption.toLowerCase().includes('untitled')) {
    content += `\n\n"${firstCaption}"`;
  } else {
    content += `\n\nExplore the latest moments added to this Notre Dame alumni album.`;
  }

  const newPostId = Date.now();
  const newPost: PostItem = {
    id: newPostId,
    userId: author.id || author.userId || 0,
    fullName: author.fullName || 'Notre Dame Alumnus',
    avatarUrl:
      author.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    batchYear: author.batchYear || 0,
    content,
    images: collageImages,
    likesCount: 0,
    commentsCount: 0,
    comments: [],
    createdAt: new Date().toISOString(),
    likedByMe: false,
    category: 'Campus Memories',
    postType: 'gallery_album',
    link_metadata: {
      postType: 'gallery_album',
      actionType: 'upload_photos',
      albumId: album.id,
      albumTitle: albumTitle,
      albumCategory: album.category,
      albumCover: album.coverUrl,
      newPhotosCount: count,
      totalPhotosCount: (album.photos?.length || 0) + count,
      location: album.location,
      eventDate: album.date,
      previewPhotos: collageImages,
    },
  };

  // 1. Persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('ndc_alumni_posts');
      const posts: PostItem[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem('ndc_alumni_posts', JSON.stringify([newPost, ...posts]));
    } catch (e) {
      console.warn('Failed to store photo upload post in localStorage:', e);
    }

    // 2. Broadcast event to live feed listeners
    window.dispatchEvent(
      new CustomEvent('ndc_post_created', {
        detail: { post: newPost },
      })
    );
  }

  // 3. Persist to Supabase asynchronously
  createFeedPostInDb({
    authorId: author.id || author.userId,
    content: newPost.content,
    category: 'Campus Memories',
    images: newPost.images,
    linked_url: newPost.linked_url,
    link_metadata: newPost.link_metadata,
  }).catch((err) => {
    console.warn('createFeedPostInDb for photo upload sync fallback:', err);
  });

  return newPost;
}
