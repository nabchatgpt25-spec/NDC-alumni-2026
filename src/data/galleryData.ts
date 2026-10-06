import { GalleryAlbum } from '../types';

/**
 * Gallery albums dataset.
 * Production starts with an empty list []; albums are fetched dynamically
 * from Supabase Storage & database tables (`gallery_albums`, `gallery_photos`).
 */
export const INITIAL_ALBUMS: GalleryAlbum[] = [];
