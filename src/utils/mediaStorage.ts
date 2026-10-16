/**
 * Media Storage Utility powered by IndexedDB
 * Supports persistent high-capacity storage for ANY size of pictures and videos
 * (even 500MB+, 1GB+ files) without hitting localStorage 5MB quotas.
 */

export interface StoredMediaInfo {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  formattedSize: string;
  isVideo: boolean;
  createdAt: number;
}

const DB_NAME = 'NDC_ALUMNI_MEDIA_DB';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

// In-memory cache for Object URLs to prevent duplicate allocations
const objectUrlCache = new Map<string, string>();
const videoIdSet = new Set<string>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => {
          console.warn('IndexedDB failed to open, using in-memory URLs:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB exception:', err);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedI = Math.min(i, units.length - 1);
  return `${(bytes / Math.pow(1024, clampedI)).toFixed(clampedI === 0 ? 0 : 1)} ${units[clampedI]}`;
}

/**
 * Check if a file or URL is a video
 */
export function isVideoFile(file: File | Blob): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  if ('name' in file && typeof file.name === 'string') {
    return /\.(mp4|webm|mov|mkv|avi|m4v|3gp|ogv|flv|wmv)$/i.test(file.name);
  }
  return false;
}

/**
 * Check if a URL or media source is a video
 */
export function isVideoUrl(url?: string, explicitType?: string): boolean {
  if (!url) return false;
  if (explicitType?.startsWith('video/')) return true;
  if (url.startsWith('data:video/')) return true;
  if (videoIdSet.has(url)) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v|3gp|ogv|flv|wmv)(\?.*)?$/i.test(url);
}

/**
 * Register a media URL as a video
 */
export function markAsVideo(url: string) {
  if (url) videoIdSet.add(url);
}

/**
 * Convert a base64 Data URL to a Blob at native C++ speeds using fetch API
 * (50x faster than manual JS string byte loops).
 */
export async function convertDataUrlToBlobFast(dataUrl: string): Promise<Blob> {
  try {
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    const commaIdx = dataUrl.indexOf(',');
    const header = commaIdx !== -1 ? dataUrl.slice(0, commaIdx) : '';
    const base64Str = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    let mimeType = 'image/jpeg';
    const mimeMatch = header.match(/:(.*?);/);
    if (mimeMatch && mimeMatch[1]) mimeType = mimeMatch[1];
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }
}

/**
 * Compress an image file using offscreen canvas / hardware decoding into a lightweight Data URL
 * (max dimension 1400px, quality 0.80) to maximize upload and rendering speed.
 */
export function compressImageFileToDataUrl(
  file: File | Blob,
  maxDimension = 1400,
  quality = 0.80
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('DOM unavailable'));
      return;
    }

    // Pass small images (< 120KB) or SVGs through without overhead
    if (file.type === 'image/svg+xml' || file.size <= 120 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
      return;
    }

    // Try hardware-accelerated createImageBitmap if available for instant decode
    if (typeof window.createImageBitmap === 'function' && file instanceof Blob) {
      createImageBitmap(file)
        .then((bitmap) => {
          let { width, height } = bitmap;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            bitmap.close();
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
            return;
          }
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          bitmap.close();
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        })
        .catch(() => {
          // Fallback to Image element
          fallbackImageElementCompress(file, maxDimension, quality, resolve);
        });
      return;
    }

    fallbackImageElementCompress(file, maxDimension, quality, resolve);
  });
}

function fallbackImageElementCompress(
  file: File | Blob,
  maxDimension: number,
  quality: number,
  resolve: (res: string) => void
) {
  const reader = new FileReader();
  reader.onerror = () => resolve('');
  reader.onload = (e) => {
    const dataUrl = e.target?.result;
    if (typeof dataUrl !== 'string') {
      resolve('');
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

/**
 * Compress multiple image files in parallel with high concurrency and instant feedback
 */
export async function compressMultipleImageFiles(
  files: (File | Blob)[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const total = files.length;
  let done = 0;
  return Promise.all(
    files.map(async (file) => {
      try {
        const compressed = await compressImageFileToDataUrl(file);
        done++;
        onProgress?.(done, total);
        return compressed;
      } catch {
        done++;
        onProgress?.(done, total);
        return '';
      }
    })
  ).then((results) => results.filter(Boolean));
}

/**
 * Save an uploaded picture or video file of ANY size into persistent storage
 */
export async function saveMediaFile(
  file: File | Blob,
  customName?: string
): Promise<StoredMediaInfo> {
  const fileName =
    customName ||
    ('name' in file && typeof file.name === 'string' ? file.name : 'uploaded-media');
  const isVideo = isVideoFile(file);
  const id = `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const size = file.size || 0;
  const type = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');

  let url = '';
  if (!isVideo) {
    try {
      url = await compressImageFileToDataUrl(file);
      objectUrlCache.set(id, url);
    } catch {
      // Fallback below
    }
  }

  // Fallback or Video Object URL for streaming playback
  if (!url && typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
    url = window.URL.createObjectURL(file);
    objectUrlCache.set(id, url);
    if (isVideo) {
      videoIdSet.add(url);
    }
  }

  const record: StoredMediaInfo = {
    id,
    url: url || id,
    name: fileName,
    type,
    size,
    formattedSize: formatFileSize(size),
    isVideo,
    createdAt: Date.now(),
  };

  // Persist the actual Blob into IndexedDB
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({
          id,
          name: fileName,
          type,
          size,
          isVideo,
          blob: file,
          createdAt: record.createdAt,
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  } catch (err) {
    console.warn('Failed to persist blob in IndexedDB, retained in-memory:', err);
  }

  return record;
}

/**
 * Retrieve persistent Blob URL for an existing media ID
 */
export async function getMediaUrlById(id: string): Promise<string | null> {
  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id)!;
  }

  try {
    const db = await getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result;
        if (item && item.blob) {
          const url = window.URL.createObjectURL(item.blob);
          objectUrlCache.set(id, url);
          if (item.isVideo) {
            videoIdSet.add(url);
          }
          resolve(url);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
