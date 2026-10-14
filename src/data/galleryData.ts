import { GalleryAlbum } from '../types';

import reunionGrandImg from '../assets/images/ndc_always_notredamian_reunion_1791119708714.jpg';
import campusHeroImg from '../assets/images/ndc_campus_hero_1790233370828.jpg';
import mosaicMonumentImg from '../assets/images/ndc_mosaic_monument_1791118817180.jpg';
import monumentCloseupImg from '../assets/images/ndc_monument_closeup.jpg';
import mainGateImg from '../assets/images/ndc_main_gate_1790748632254.jpg';
import badmintonCourtImg from '../assets/images/ndc_badminton_court_1790748659189.jpg';
import campusArtworkImg from '../assets/images/ndc_campus_artwork_1790748644859.jpg';
import celebrationImg from '../assets/images/ndc_reunion_celebration_1790233384454.jpg';
import crestLogoImg from '../assets/images/ndc_official_crest_1790240048868.jpg';

/**
 * Curated authentic Notre Dame College alumni albums.
 * Fetches dynamic additions from Supabase tables (`gallery_albums`, `gallery_photos`).
 */
export const INITIAL_ALBUMS: GalleryAlbum[] = [
  {
    id: 1,
    title: '75th Platinum Jubilee Grand Reunion 2026',
    description: 'Historical gathering of Notre Dame College alumni celebrating 75 years of brotherhood and academic excellence at Motijheel campus.',
    category: 'reunion',
    date: 'December 2026',
    location: 'NDC Main Ground, Motijheel, Dhaka',
    photosCount: 3,
    coverUrl: reunionGrandImg,
    photos: [
      {
        id: 'photo-reunion-01',
        url: reunionGrandImg,
        caption: 'Once a Notredamian, Always a Notredamian — Grand Reunion Stage',
        uploaderName: 'NDCAA Central Committee',
        batchYear: 78,
        uploadedAt: '2026-09-20',
        likesCount: 142,
        likedByMe: false,
        commentsCount: 18,
      },
      {
        id: 'photo-reunion-02',
        url: celebrationImg,
        caption: 'Alumni brotherhood and batch fellowship in the college auditorium',
        uploaderName: 'Batch 86 Alumni Council',
        batchYear: 86,
        uploadedAt: '2026-09-21',
        likesCount: 98,
        likedByMe: false,
        commentsCount: 9,
      },
      {
        id: 'photo-reunion-03',
        url: mosaicMonumentImg,
        caption: 'Historic Holy Cross mosaic monument honoring college founding fathers',
        uploaderName: 'Notre Dame Archive',
        batchYear: 90,
        uploadedAt: '2026-09-22',
        likesCount: 115,
        likedByMe: false,
        commentsCount: 12,
      },
    ],
  },
  {
    id: 2,
    title: 'Campus Heritage & Landmarks',
    description: 'Iconic architectural landmarks, Father Timm Building, and peaceful green courtyards of Notre Dame College Dhaka.',
    category: 'campus',
    date: 'August 2026',
    location: 'Motijheel Campus, Dhaka-1000',
    photosCount: 3,
    coverUrl: campusHeroImg,
    photos: [
      {
        id: 'photo-campus-01',
        url: campusHeroImg,
        caption: 'Father Timm Building and majestic college front campus lawn',
        uploaderName: 'Secretariat Archivist',
        batchYear: 75,
        uploadedAt: '2026-08-15',
        likesCount: 210,
        likedByMe: false,
        commentsCount: 24,
      },
      {
        id: 'photo-campus-02',
        url: mainGateImg,
        caption: 'Historic Notre Dame College Main Gate on Arambagh Motijheel Road',
        uploaderName: 'NDC Photography Club',
        batchYear: 88,
        uploadedAt: '2026-08-16',
        likesCount: 164,
        likedByMe: false,
        commentsCount: 15,
      },
      {
        id: 'photo-campus-03',
        url: monumentCloseupImg,
        caption: 'Holy Cross Cross-and-Anchors college monument in morning sunlight',
        uploaderName: 'Heritage Committee',
        batchYear: 82,
        uploadedAt: '2026-08-18',
        likesCount: 89,
        likedByMe: false,
        commentsCount: 7,
      },
    ],
  },
  {
    id: 3,
    title: 'Clubs, Sports & College Life',
    description: 'Badminton tournaments, science club exhibitions, and collegiate crest memorabilia from Notredamian student life.',
    category: 'sports',
    date: 'July 2026',
    location: 'Notre Dame Sports Complex & Quad',
    photosCount: 3,
    coverUrl: badmintonCourtImg,
    photos: [
      {
        id: 'photo-sports-01',
        url: badmintonCourtImg,
        caption: 'Annual Inter-Batch Badminton and Basketball courts in the college quad',
        uploaderName: 'NDC Sports Club',
        batchYear: 94,
        uploadedAt: '2026-07-10',
        likesCount: 132,
        likedByMe: false,
        commentsCount: 11,
      },
      {
        id: 'photo-sports-02',
        url: campusArtworkImg,
        caption: 'Mosaic sculpture mural celebrating science, art, and moral leadership',
        uploaderName: 'Cultural Club NDCC',
        batchYear: 92,
        uploadedAt: '2026-07-12',
        likesCount: 76,
        likedByMe: false,
        commentsCount: 5,
      },
      {
        id: 'photo-sports-03',
        url: crestLogoImg,
        caption: 'Diligite Lumen Sapientiae — Official Notre Dame College Crest & Seal',
        uploaderName: 'Notre Dame Alumni Network',
        batchYear: 70,
        uploadedAt: '2026-07-15',
        likesCount: 254,
        likedByMe: false,
        commentsCount: 31,
      },
    ],
  },
];
