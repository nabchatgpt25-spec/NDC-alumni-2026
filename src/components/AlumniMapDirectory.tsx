import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Search,
  Filter,
  Globe,
  Users,
  Building2,
  MapPin,
  RotateCcw,
  X,
  ChevronRight,
  Sparkles,
  Layers,
  Cpu,
  GraduationCap,
  TrendingUp,
  Award,
  Scale,
  Rocket,
  PenTool,
  Briefcase,
  Check,
  Navigation,
  ExternalLink,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { AlumniProfile } from '../types';
import { ALUMNI_PROFILES, loadStoredAlumniProfiles } from '../data/mockData';

const CITY_COORDINATES: Record<string, [number, number]> = {
  dhaka: [23.7314, 90.4193],
  motijheel: [23.7314, 90.4193],
  chittagong: [22.3569, 91.7832],
  sylhet: [24.8949, 91.8687],
  rajshahi: [24.3636, 88.6241],
  london: [51.5074, -0.1278],
  oxford: [51.752, -1.2577],
  berlin: [52.52, 13.405],
  dublin: [53.3498, -6.2603],
  'new york': [40.7128, -74.006],
  'mountain view': [37.3861, -122.0839],
  'san francisco': [37.7749, -122.4194],
  seattle: [47.6062, -122.3321],
  boston: [42.3601, -71.0589],
  toronto: [43.6532, -79.3832],
  dubai: [25.2048, 55.2708],
  riyadh: [24.7136, 46.6753],
  doha: [25.2854, 51.531],
  singapore: [1.3521, 103.8198],
  sydney: [-33.8688, 151.2093],
  melbourne: [-37.8136, 144.9631],
  tokyo: [35.6762, 139.6503],
  'kuala lumpur': [3.139, 101.6869],
};

const DEFAULT_MAP_ALUMNI: AlumniProfile[] = [
  {
    id: 800001,
    userId: 800001,
    fullName: 'Dr. Tariqul Islam Chowdhury',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    batchYear: 52,
    session: '(2000-01), HSC 02',
    group: 'Science 01',
    collegeRoll: '1020101',
    profession: 'Professor of Electrical Engineering',
    position: 'Professor & Head of Department',
    institution: 'BUET',
    specialty: ['Electrical & Electronic Engineering', 'Robotics'],
    degree: ['HSC', 'BSc Engineering', 'PhD'],
    city: 'Dhaka',
    country: 'Bangladesh',
    latitude: 23.7266,
    longitude: 90.3925,
    phone: '+8801711223344',
    email: 'tariqul.buet@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Professor of Electrical & Electronic Engineering at BUET and proud Notredamian from Batch 52.',
  },
  {
    id: 800002,
    userId: 800002,
    fullName: 'Engr. Tanvir Ahmed Siddiqui',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    batchYear: 66,
    session: '(2014-15), HSC 16',
    group: 'Science 05',
    collegeRoll: '1160512',
    profession: 'Senior Software Architect',
    position: 'Staff Software Engineer (AI & Cloud)',
    institution: 'Google',
    specialty: ['Computer Science & Software', 'Artificial Intelligence & Data'],
    degree: ['HSC', 'BSc Engineering', 'MSc'],
    city: 'Mountain View',
    country: 'United States',
    latitude: 37.3861,
    longitude: -122.0839,
    phone: '+16502530000',
    email: 'tanvir.siddiqui@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Building next-generation cloud & AI infrastructure in Silicon Valley. Notre Dame Batch 66 (Science 05).',
  },
  {
    id: 800003,
    userId: 800003,
    fullName: 'Dr. Zubair Al-Mahmud',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    batchYear: 58,
    session: '(2006-07), HSC 08',
    group: 'Science 03',
    collegeRoll: '1080304',
    profession: 'Consultant Cardiologist',
    position: 'Senior Consultant, Interventional Cardiology',
    institution: 'Dhaka Medical College Hospital',
    specialty: ['Medicine, Surgery & Healthcare'],
    degree: ['HSC', 'MBBS', 'FCPS', 'MRCP'],
    city: 'Dhaka',
    country: 'Bangladesh',
    latitude: 23.7314,
    longitude: 90.4193,
    phone: '+8801715001122',
    email: 'zubair.dmc@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Interventional Cardiologist at Dhaka Medical College Hospital, right beside our beloved Motijheel campus.',
  },
  {
    id: 800004,
    userId: 800004,
    fullName: 'Barrister Shafayat Karim',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    batchYear: 55,
    session: '(2003-04), HSC 05',
    group: 'Arts A',
    collegeRoll: '2050109',
    profession: 'Barrister-at-Law & Senior Counsel',
    position: 'Senior Partner, International Arbitration',
    institution: 'Lincoln’s Inn Chambers',
    specialty: ['Constitutional & Corporate Law', 'Legal Practice'],
    degree: ['HSC', 'LLB', 'LLM', 'Barrister-at-Law'],
    city: 'London',
    country: 'United Kingdom',
    latitude: 51.5155,
    longitude: -0.1132,
    phone: '+442079460192',
    email: 'shafayat.london@ndcalumni.org',
    isPublic: true,
    online: false,
    bio: 'Practicing international commercial and constitutional law in London & Dhaka.',
  },
  {
    id: 800005,
    userId: 800005,
    fullName: 'Nafisur Rahman Khan, CFA',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    batchYear: 60,
    session: '(2008-09), HSC 10',
    group: 'Commerce B',
    collegeRoll: '3100215',
    profession: 'Managing Director, Investment Banking',
    position: 'Managing Director, Global Markets',
    institution: 'Goldman Sachs',
    specialty: ['Finance, Banking & Investment'],
    degree: ['HSC', 'BBA', 'MBA', 'CFA'],
    city: 'New York',
    country: 'United States',
    latitude: 40.7145,
    longitude: -74.0134,
    phone: '+12129021000',
    email: 'nafis.ny@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Leading cross-border investment banking advisory on Wall Street. Notre Dame Batch 60.',
  },
  {
    id: 800006,
    userId: 800006,
    fullName: 'Mahir Ahsan Talukder',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    batchYear: 64,
    session: '(2012-13), HSC 14',
    group: 'Science 07',
    collegeRoll: '1140721',
    profession: 'Principal Cloud Solutions Architect',
    position: 'Principal Cloud & Cybersecurity Architect',
    institution: 'Amazon Web Services (AWS)',
    specialty: ['Cybersecurity & Cloud', 'Software'],
    degree: ['HSC', 'BSc Engineering', 'MSc'],
    city: 'Toronto',
    country: 'Canada',
    latitude: 43.6532,
    longitude: -79.3832,
    phone: '+14165550199',
    email: 'mahir.toronto@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Cloud Security & Distributed Systems Architect in Toronto, Canada.',
  },
  {
    id: 800007,
    userId: 800007,
    fullName: 'Syed Rashedul Alam',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    batchYear: 50,
    session: '(1998-99), HSC 00',
    group: 'Commerce A',
    collegeRoll: '3000103',
    profession: 'Chief Executive Officer',
    position: 'Regional CEO & Managing Director',
    institution: 'Standard Chartered Gulf',
    specialty: ['Corporate Leadership', 'Finance, Banking & Investment'],
    degree: ['HSC', 'BBA', 'MBA'],
    city: 'Dubai',
    country: 'United Arab Emirates',
    latitude: 25.2048,
    longitude: 55.2708,
    phone: '+97145550123',
    email: 'rashed.dubai@ndcalumni.org',
    isPublic: true,
    online: false,
    bio: 'Regional banking executive overseeing MENA corporate operations from Dubai.',
  },
  {
    id: 800008,
    userId: 800008,
    fullName: 'Dr. Farhan Sadik Majumder',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    batchYear: 62,
    session: '(2010-11), HSC 12',
    group: 'Science 02',
    collegeRoll: '1120208',
    profession: 'Senior AI Research Scientist',
    position: 'Associate Professor of Machine Learning',
    institution: 'National University of Singapore (NUS)',
    specialty: ['Artificial Intelligence & Data', 'Academia & Research'],
    degree: ['HSC', 'BSc Engineering', 'PhD'],
    city: 'Singapore',
    country: 'Singapore',
    latitude: 1.2966,
    longitude: 103.7764,
    phone: '+6565166666',
    email: 'farhan.nus@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Leading AI and autonomous systems research at NUS Singapore.',
  },
  {
    id: 800009,
    userId: 800009,
    fullName: 'Ashfaqur Rahman Bhuiyan',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    batchYear: 56,
    session: '(2004-05), HSC 06',
    group: 'Arts B',
    collegeRoll: '2060211',
    profession: 'Joint Secretary & Diplomat',
    position: 'Deputy High Commissioner (BCS Foreign Affairs)',
    institution: 'Ministry of Foreign Affairs',
    specialty: ['Civil Service & Administration (BCS)', 'Foreign Affairs & Diplomacy'],
    degree: ['HSC', 'BSS', 'MSS', 'BCS'],
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8688,
    longitude: 151.2093,
    phone: '+61299550188',
    email: 'ashfaq.diplomat@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Career diplomat representing Bangladesh in Australia.',
  },
  {
    id: 800010,
    userId: 800010,
    fullName: 'Engr. Kamrul Hasan Dev',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    batchYear: 61,
    session: '(2009-10), HSC 11',
    group: 'Science 09',
    collegeRoll: '1110918',
    profession: 'Founder & CEO',
    position: 'Co-Founder & Chief Executive Officer',
    institution: 'Chittagong Port Logistics & Maritime Tech',
    specialty: ['Entrepreneurship & Startups', 'Supply Chain & Operations'],
    degree: ['HSC', 'BSc Engineering', 'MBA'],
    city: 'Chittagong',
    country: 'Bangladesh',
    latitude: 22.3569,
    longitude: 91.7832,
    phone: '+8801819223344',
    email: 'kamrul.ctg@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Maritime technology founder based in Chittagong.',
  },
  {
    id: 800011,
    userId: 800011,
    fullName: 'Mehedi Hasan Jamil',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    batchYear: 63,
    session: '(2011-12), HSC 13',
    group: 'Arts C',
    collegeRoll: '2130307',
    profession: 'Executive Editor & Journalist',
    position: 'Senior Diplomatic Correspondent',
    institution: 'The Daily Star',
    specialty: ['Journalism & Media Communications'],
    degree: ['HSC', 'BSS', 'MSS'],
    city: 'Sylhet',
    country: 'Bangladesh',
    latitude: 24.8949,
    longitude: 91.8687,
    phone: '+8801712889900',
    email: 'mehedi.sylhet@ndcalumni.org',
    isPublic: true,
    online: false,
    bio: 'Journalist and media communications specialist covering Northeast Bangladesh.',
  },
  {
    id: 800012,
    userId: 800012,
    fullName: 'Dr. Soumya Paul',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    batchYear: 59,
    session: '(2007-08), HSC 09',
    group: 'Science 04',
    collegeRoll: '1090402',
    profession: 'Professor of Physics & Researcher',
    position: 'Senior Research Fellow, Quantum Optics',
    institution: 'University of Rajshahi',
    specialty: ['Academia & Research', 'Physics'],
    degree: ['HSC', 'BSc', 'MSc', 'PhD'],
    city: 'Rajshahi',
    country: 'Bangladesh',
    latitude: 24.3636,
    longitude: 88.6241,
    phone: '+8801716554433',
    email: 'soumya.ru@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Quantum physics researcher and faculty member at Rajshahi University.',
  },
  {
    id: 800013,
    userId: 800013,
    fullName: 'Ar. Fahim Faysal Chowdhury',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    batchYear: 65,
    session: '(2013-14), HSC 15',
    group: 'Science 06',
    collegeRoll: '1150614',
    profession: 'Principal Urban Architect',
    position: 'Lead Sustainable Architect',
    institution: 'Vitti Sthapati Brindo',
    specialty: ['Architecture & Urban Planning', 'Civil & Structural Engineering'],
    degree: ['HSC', 'B.Arch', 'M.Arch'],
    city: 'Dhaka',
    country: 'Bangladesh',
    latitude: 23.7465,
    longitude: 90.376,
    phone: '+8801711998877',
    email: 'fahim.arch@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Designing sustainable urban public spaces across Dhaka.',
  },
  {
    id: 800014,
    userId: 800014,
    fullName: 'Sadman Sakib Ahsan, FCA',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    batchYear: 57,
    session: '(2005-06), HSC 07',
    group: 'Commerce C',
    collegeRoll: '3070309',
    profession: 'Fellow Chartered Accountant',
    position: 'Senior Audit Partner',
    institution: 'Hoda Vasi Chowdhury & Co',
    specialty: ['Chartered Accountancy & Audit', 'Finance, Banking & Investment'],
    degree: ['HSC', 'BBA', 'CA / ACA', 'FCA'],
    city: 'Dhaka',
    country: 'Bangladesh',
    latitude: 23.7806,
    longitude: 90.4143,
    phone: '+8801713445566',
    email: 'sadman.fca@ndcalumni.org',
    isPublic: true,
    online: false,
    bio: 'Chartered Accountant and corporate governance advisor in Gulshan, Dhaka.',
  },
  {
    id: 800015,
    userId: 800015,
    fullName: 'Dr. Adibul Islam Khan',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    batchYear: 64,
    session: '(2012-13), HSC 14',
    group: 'Science 11',
    collegeRoll: '1141105',
    profession: 'Quantitative Researcher',
    position: 'Vice President, Quantitative Strategies',
    institution: 'Barclays Investment Bank',
    specialty: ['Finance, Banking & Investment', 'Artificial Intelligence & Data'],
    degree: ['HSC', 'BSc Engineering', 'PhD'],
    city: 'London',
    country: 'United Kingdom',
    latitude: 51.5045,
    longitude: -0.0195,
    phone: '+442071161000',
    email: 'adib.london@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'Quantitative modeling and algorithmic trading researcher at Canary Wharf, London.',
  },
  {
    id: 800016,
    userId: 800016,
    fullName: 'Engr. Tawsif Muntasir',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    batchYear: 67,
    session: '(2015-16), HSC 17',
    group: 'Science 08',
    collegeRoll: '1170819',
    profession: 'Senior Machine Learning Engineer',
    position: 'Staff ML Systems Engineer',
    institution: 'Apple',
    specialty: ['Artificial Intelligence & Data', 'Computer Science & Software'],
    degree: ['HSC', 'BSc Engineering', 'MSc'],
    city: 'Mountain View',
    country: 'United States',
    latitude: 37.3349,
    longitude: -122.009,
    phone: '+14089961010',
    email: 'tawsif.silicon@ndcalumni.org',
    isPublic: true,
    online: true,
    bio: 'On-device machine learning engineer in Silicon Valley.',
  },
];

interface AlumniMapDirectoryProps {
  onViewProfile: (profileId: number) => void;
}

// -------------------------------------------------------------
// 1. Geographic Region Specifications
// -------------------------------------------------------------
export interface GeographicSubRegion {
  id: string;
  name: string;
  city: string;
  center: [number, number];
  zoom: number;
}

export interface GeographicRegion {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  center: [number, number];
  zoom: number;
  countries: string[];
  subRegions?: GeographicSubRegion[];
}

export const GEOGRAPHIC_REGIONS: GeographicRegion[] = [
  {
    id: 'all',
    name: 'Worldwide (All Regions)',
    shortName: 'Worldwide',
    flag: '🌍',
    center: [23.5, 30],
    zoom: 2.5,
    countries: [],
  },
  {
    id: 'bangladesh',
    name: 'Bangladesh (Campus & National)',
    shortName: 'Bangladesh',
    flag: '🇧🇩',
    center: [23.95, 89.9],
    zoom: 7.2,
    countries: ['Bangladesh'],
    subRegions: [
      { id: 'all_bd', name: 'All Bangladesh', city: 'all', center: [23.95, 89.9], zoom: 7.2 },
      { id: 'motijheel', name: 'Dhaka (NDC Motijheel Campus)', city: 'Dhaka', center: [23.7314, 90.4193], zoom: 14 },
      { id: 'dhaka_div', name: 'Greater Dhaka', city: 'Dhaka', center: [23.78, 90.40], zoom: 11 },
      { id: 'chittagong', name: 'Chittagong Division', city: 'Chittagong', center: [22.3569, 91.7832], zoom: 11 },
      { id: 'sylhet', name: 'Sylhet Division', city: 'Sylhet', center: [24.8949, 91.8687], zoom: 11 },
      { id: 'rajshahi', name: 'Rajshahi Division', city: 'Rajshahi', center: [24.3636, 88.6241], zoom: 11 },
    ],
  },
  {
    id: 'uk_europe',
    name: 'United Kingdom & Europe',
    shortName: 'UK & Europe',
    flag: '🇬🇧',
    center: [52.2, 5.0],
    zoom: 5.2,
    countries: ['United Kingdom', 'Germany', 'Ireland'],
  },
  {
    id: 'north_america',
    name: 'North America (USA & Canada)',
    shortName: 'North America',
    flag: '🇺🇸',
    center: [38.5, -88.0],
    zoom: 4.2,
    countries: ['United States', 'Canada'],
  },
  {
    id: 'middle_east',
    name: 'Middle East & Gulf',
    shortName: 'Middle East',
    flag: '🇸🇦',
    center: [25.0, 50.0],
    zoom: 5.5,
    countries: ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman'],
  },
  {
    id: 'asia_pacific',
    name: 'Australia & Asia-Pacific',
    shortName: 'Asia-Pacific',
    flag: '🇦🇺',
    center: [-20.0, 130.0],
    zoom: 4.0,
    countries: ['Australia', 'Singapore', 'Malaysia', 'Japan'],
  },
];

// -------------------------------------------------------------
// 2. Professional / Industry Sector Definitions
// -------------------------------------------------------------
export interface ProfessionalSector {
  id: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  ringColor: string;
  badgeBg: string;
  badgeText: string;
  activeBg: string;
  activeBorder: string;
  keywords: string[];
}

export const PROFESSIONAL_SECTORS: ProfessionalSector[] = [
  {
    id: 'tech_software',
    name: 'Software, Cloud & Artificial Intelligence',
    shortName: 'Software & AI',
    icon: Cpu,
    ringColor: '#059669', // emerald-600
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-600 text-white shadow-emerald-500/25',
    activeBorder: 'border-emerald-600',
    keywords: ['software', 'cloud', 'engineer', 'ai', 'data', 'tech', 'developer', 'systems', 'cyber', 'product', 'swe'],
  },
  {
    id: 'engineering',
    name: 'Civil, Electrical & Mechanical Engineering',
    shortName: 'Engineering',
    icon: Layers,
    ringColor: '#2563eb', // blue-600
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
    badgeText: 'text-blue-600 dark:text-blue-400',
    activeBg: 'bg-blue-600 text-white shadow-blue-500/25',
    activeBorder: 'border-blue-600',
    keywords: ['engineering', 'electrical', 'mechanical', 'civil', 'robotics', 'buet', 'architect', 'hardware', 'eee'],
  },
  {
    id: 'academia',
    name: 'Higher Education, Research & Academia',
    shortName: 'Academia & Research',
    icon: GraduationCap,
    ringColor: '#7c3aed', // violet-600
    badgeBg: 'bg-violet-50 dark:bg-violet-950/50',
    badgeText: 'text-violet-600 dark:text-violet-400',
    activeBg: 'bg-violet-600 text-white shadow-violet-500/25',
    activeBorder: 'border-violet-600',
    keywords: ['professor', 'head', 'phd', 'academic', 'researcher', 'scientist', 'faculty', 'education'],
  },
  {
    id: 'corporate',
    name: 'Corporate Leadership & Multinationals',
    shortName: 'Corporate Leadership',
    icon: Building2,
    ringColor: '#4f46e5', // indigo-600
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
    activeBg: 'bg-indigo-600 text-white shadow-indigo-500/25',
    activeBorder: 'border-indigo-600',
    keywords: ['ceo', 'director', 'managing', 'lead', 'operations', 'executive', 'general manager'],
  },
  {
    id: 'finance',
    name: 'Banking, Finance & Investment',
    shortName: 'Banking & Finance',
    icon: TrendingUp,
    ringColor: '#d97706', // amber-600
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-600 dark:text-amber-400',
    activeBg: 'bg-amber-600 text-white shadow-amber-500/25',
    activeBorder: 'border-amber-600',
    keywords: ['finance', 'banking', 'investment', 'bba', 'mba', 'fintech', 'audit', 'chartered', 'accountancy'],
  },
  {
    id: 'civil_service',
    name: 'Civil Service, Governance & Diplomacy',
    shortName: 'Civil Service',
    icon: Award,
    ringColor: '#e11d48', // rose-600
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeText: 'text-rose-600 dark:text-rose-400',
    activeBg: 'bg-rose-600 text-white shadow-rose-500/25',
    activeBorder: 'border-rose-600',
    keywords: ['bcs', 'cadre', 'administration', 'foreign affairs', 'ministry', 'government', 'diplomacy', 'public'],
  },
  {
    id: 'law',
    name: 'Legal Practice, Judiciary & Counsel',
    shortName: 'Law & Judiciary',
    icon: Scale,
    ringColor: '#475569', // slate-600
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    activeBg: 'bg-slate-700 text-white shadow-slate-600/25',
    activeBorder: 'border-slate-600',
    keywords: ['lawyer', 'advocate', 'barrister', 'court', 'supreme court', 'llb', 'llm', 'legal', 'judicial'],
  },
  {
    id: 'entrepreneurship',
    name: 'Startups, Ventures & Entrepreneurship',
    shortName: 'Startups & Ventures',
    icon: Rocket,
    ringColor: '#ea580c', // orange-600
    badgeBg: 'bg-orange-50 dark:bg-orange-950/50',
    badgeText: 'text-orange-600 dark:text-orange-400',
    activeBg: 'bg-orange-600 text-white shadow-orange-500/25',
    activeBorder: 'border-orange-600',
    keywords: ['founder', 'co-founder', 'entrepreneur', 'startup', 'venture', 'managing director'],
  },
  {
    id: 'creative_media',
    name: 'Media, Communications & Creative Arts',
    shortName: 'Media & Arts',
    icon: PenTool,
    ringColor: '#0891b2', // cyan-600
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50',
    badgeText: 'text-cyan-600 dark:text-cyan-400',
    activeBg: 'bg-cyan-600 text-white shadow-cyan-500/25',
    activeBorder: 'border-cyan-600',
    keywords: ['journalism', 'media', 'communications', 'arts', 'writing', 'editor', 'literature'],
  },
];

// Helper to test if profile matches a sector
export function matchAlumnusToSector(profile: AlumniProfile, sectorId: string): boolean {
  if (sectorId === 'all') return true;
  const sector = PROFESSIONAL_SECTORS.find((s) => s.id === sectorId);
  if (!sector) return true;

  const textToSearch = [
    ...(profile.specialty || []),
    profile.position || '',
    profile.profession || '',
    profile.institution || '',
    profile.specialtyOther || '',
  ]
    .join(' ')
    .toLowerCase();

  return sector.keywords.some((kw) => textToSearch.includes(kw.toLowerCase()));
}

export const matchAlumnusToDepartment = matchAlumnusToSector;

// Helper to determine primary sector of an alumnus
export function getPrimarySector(profile: AlumniProfile): ProfessionalSector {
  for (const sector of PROFESSIONAL_SECTORS) {
    if (matchAlumnusToSector(profile, sector.id)) {
      return sector;
    }
  }
  return PROFESSIONAL_SECTORS[0]; // Default to Tech / Software
}

export const getPrimaryDepartment = getPrimarySector;

// Helper to test if profile matches a geographic region
export function matchAlumnusToRegion(
  profile: AlumniProfile,
  regionId: string,
  subRegionCity?: string
): boolean {
  if (regionId === 'all') return true;

  const region = GEOGRAPHIC_REGIONS.find((r) => r.id === regionId);
  if (!region) return true;

  if (region.countries.length > 0 && !region.countries.includes(profile.country)) {
    return false;
  }

  if (subRegionCity && subRegionCity !== 'all' && profile.city.toLowerCase() !== subRegionCity.toLowerCase()) {
    return false;
  }

  return true;
}

interface LocationCluster {
  key: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  alumni: AlumniProfile[];
}

interface GeoSearchSuggestion {
  label: string;
  lat: number;
  lng: number;
  zoom: number;
  subtitle?: string;
}

export const AlumniMapDirectory: React.FC<AlumniMapDirectoryProps> = ({ onViewProfile }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geoPinRef = useRef<L.Marker | null>(null);

  // Combine registered profiles + default worldwide alumni so persons are always visible on the map
  const allMapAlumni = useMemo(() => {
    const stored = loadStoredAlumniProfiles();
    const combined = [...stored, ...ALUMNI_PROFILES, ...DEFAULT_MAP_ALUMNI].filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i
    );
    return combined.map((p, idx) => {
      if (p.latitude !== undefined && p.longitude !== undefined) return p;
      if (p.lat !== undefined && p.lng !== undefined) {
        return { ...p, latitude: p.lat, longitude: p.lng };
      }
      const cityKey = (p.city || 'dhaka').toLowerCase().trim();
      const baseCoords = CITY_COORDINATES[cityKey] || [23.7314, 90.4193];
      // Slight deterministic offset so multiple people in same city don't overlap identically
      const offsetLat = ((idx % 5) - 2) * 0.004;
      const offsetLng = (((idx * 3) % 5) - 2) * 0.004;
      return {
        ...p,
        latitude: baseCoords[0] + offsetLat,
        longitude: baseCoords[1] + offsetLng,
      };
    });
  }, []);

  // On-map Leaflet Geosearch state
  const [geoSearchInput, setGeoSearchInput] = useState('');
  const [geoSuggestions, setGeoSuggestions] = useState<GeoSearchSuggestion[]>([]);
  const [isGeoSearching, setIsGeoSearching] = useState(false);
  const [showGeoDropdown, setShowGeoDropdown] = useState(false);
  const [selectedMapAlumnus, setSelectedMapAlumnus] = useState<AlumniProfile | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(2.5);
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null);

  // 1. Geographic Region State
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
  const [selectedSubRegionCity, setSelectedSubRegionCity] = useState<string>('all');

  // 2. Professional Sector State
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');

  // 3. Secondary Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('All');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const currentRegion = useMemo(() => {
    return GEOGRAPHIC_REGIONS.find((r) => r.id === selectedRegionId) || GEOGRAPHIC_REGIONS[0];
  }, [selectedRegionId]);

  const currentDepartment = useMemo(() => {
    return PROFESSIONAL_SECTORS.find((d) => d.id === selectedDepartmentId) || null;
  }, [selectedDepartmentId]);

  // Dynamic regional counts per sector (specifically for the selected geographic region)
  const departmentCountsInRegion = useMemo(() => {
    const alumniInRegion = allMapAlumni.filter((p) =>
      matchAlumnusToRegion(p, selectedRegionId, selectedSubRegionCity)
    );

    const counts: Record<string, number> = {
      all: alumniInRegion.length,
    };

    PROFESSIONAL_SECTORS.forEach((dept) => {
      counts[dept.id] = alumniInRegion.filter((p) => matchAlumnusToSector(p, dept.id)).length;
    });

    return counts;
  }, [allMapAlumni, selectedRegionId, selectedSubRegionCity]);

  // Overall counts per geographic region (independent of sector filter)
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allMapAlumni.length,
    };

    GEOGRAPHIC_REGIONS.forEach((r) => {
      if (r.id === 'all') return;
      counts[r.id] = allMapAlumni.filter((p) => matchAlumnusToRegion(p, r.id)).length;
    });

    return counts;
  }, [allMapAlumni]);

  // Filtered alumni based on Region, Sector, Search, Batch & Organization
  const filteredAlumni = useMemo(() => {
    return allMapAlumni.filter((profile) => {
      const lat = profile.latitude ?? profile.lat;
      const lng = profile.longitude ?? profile.lng;
      if (lat === undefined || lng === undefined) return false;

      // 1. Geographic Region check
      if (!matchAlumnusToRegion(profile, selectedRegionId, selectedSubRegionCity)) {
        return false;
      }

      // 2. Sector check
      if (selectedDepartmentId !== 'all') {
        if (!matchAlumnusToSector(profile, selectedDepartmentId)) {
          return false;
        }
      }

      // 3. Batch check
      if (selectedBatch !== 'All' && profile.batchYear !== Number(selectedBatch)) {
        return false;
      }

      // 4. Organization check
      if (selectedOrganization !== 'All' && profile.institution !== selectedOrganization) {
        return false;
      }

      // 5. Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = profile.fullName.toLowerCase().includes(q);
        const matchPos = profile.position.toLowerCase().includes(q);
        const matchInst = profile.institution.toLowerCase().includes(q);
        const matchCity = profile.city.toLowerCase().includes(q);
        const matchCountry = profile.country.toLowerCase().includes(q);
        const matchSpec = profile.specialty.some((s) => s.toLowerCase().includes(q));
        if (!matchName && !matchPos && !matchInst && !matchCity && !matchCountry && !matchSpec) {
          return false;
        }
      }

      return true;
    });
  }, [
    allMapAlumni,
    selectedRegionId,
    selectedSubRegionCity,
    selectedDepartmentId,
    selectedBatch,
    selectedOrganization,
    searchQuery,
  ]);

  // Extract batch and organization options
  const filterOptions = useMemo(() => {
    const batches = Array.from(new Set(allMapAlumni.map((p) => p.batchYear))).sort((a, b) => a - b);
    const organizations = Array.from(
      new Set(
        allMapAlumni.filter((p) => matchAlumnusToRegion(p, selectedRegionId, selectedSubRegionCity)).map(
          (p) => p.institution
        )
      )
    ).filter(Boolean).sort();

    return { batches, organizations };
  }, [allMapAlumni, selectedRegionId, selectedSubRegionCity]);

  // Leaflet Geosearch effect: query local hubs + OpenStreetMap Nominatim API
  useEffect(() => {
    const q = geoSearchInput.trim();
    if (!q) {
      setGeoSuggestions([]);
      setIsGeoSearching(false);
      return;
    }

    const lower = q.toLowerCase();
    const localMatches: GeoSearchSuggestion[] = [];

    // Match sub-regions and known cities
    Object.entries(CITY_COORDINATES).forEach(([cityKey, coords]) => {
      if (cityKey.includes(lower)) {
        const displayCity = cityKey
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        const alumniHere = allMapAlumni.filter(
          (a) => a.city.toLowerCase() === cityKey
        ).length;
        localMatches.push({
          label: displayCity,
          lat: coords[0],
          lng: coords[1],
          zoom: 12,
          subtitle: alumniHere > 0 ? `${alumniHere} Notredamian Alumni` : 'Alumni Hub',
        });
      }
    });

    setGeoSuggestions(localMatches.slice(0, 5));

    const timer = setTimeout(async () => {
      try {
        setIsGeoSearching(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          const remote: GeoSearchSuggestion[] = (data || []).map((item: any) => ({
            label: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            zoom: 12,
            subtitle: item.type ? `${item.type}` : 'Map Location',
          }));
          const merged = [...localMatches];
          remote.forEach((r) => {
            if (!merged.some((m) => Math.abs(m.lat - r.lat) < 0.05 && Math.abs(m.lng - r.lng) < 0.05)) {
              merged.push(r);
            }
          });
          setGeoSuggestions(merged.slice(0, 6));
        }
      } catch {
        // Fallback to localMatches if offline
      } finally {
        setIsGeoSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [geoSearchInput, allMapAlumni]);

  const handleSelectGeoLocation = (loc: GeoSearchSuggestion) => {
    setGeoSearchInput(loc.label);
    setShowGeoDropdown(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], loc.zoom, {
        animate: true,
        duration: 1.2,
      });

      if (geoPinRef.current) {
        geoPinRef.current.remove();
      }
      const pinIcon = L.divIcon({
        className: 'geosearch-target-pin',
        html: `
          <div class="flex flex-col items-center">
            <div class="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold shadow-lg border border-white whitespace-nowrap">
              📍 ${loc.label.split(',')[0]}
            </div>
            <div class="w-2.5 h-2.5 bg-blue-600 rotate-45 -mt-1 border-r border-b border-white"></div>
          </div>
        `,
        iconSize: [120, 36],
        iconAnchor: [60, 34],
      });
      geoPinRef.current = L.marker([loc.lat, loc.lng], { icon: pinIcon }).addTo(
        mapInstanceRef.current
      );
    }
  };

  // Dynamic zoom-based vicinity clustering for the map
  const clusters = useMemo(() => {
    // Determine geographic proximity threshold (in degrees) based on current zoom level
    const gridRadius =
      mapZoom < 4
        ? 3.5
        : mapZoom < 6
          ? 1.8
          : mapZoom < 8
            ? 0.75
            : mapZoom < 10
              ? 0.3
              : mapZoom < 12
                ? 0.12
                : mapZoom < 14
                  ? 0.04
                  : 0.008;

    const clusterList: LocationCluster[] = [];

    filteredAlumni.forEach((profile) => {
      const lat = profile.latitude ?? profile.lat;
      const lng = profile.longitude ?? profile.lng;
      if (lat === undefined || lng === undefined) return;

      // Find an existing cluster within gridRadius
      let matchedCluster: LocationCluster | undefined;
      for (const existing of clusterList) {
        const dLat = Math.abs(existing.lat - lat);
        const dLng = Math.abs(existing.lng - lng);
        if (Math.sqrt(dLat * dLat + dLng * dLng) <= gridRadius) {
          matchedCluster = existing;
          break;
        }
      }

      if (matchedCluster) {
        matchedCluster.alumni.push(profile);
        // Recompute centroid average
        const n = matchedCluster.alumni.length;
        matchedCluster.lat =
          matchedCluster.alumni.reduce((s, a) => s + (a.latitude ?? a.lat ?? 0), 0) / n;
        matchedCluster.lng =
          matchedCluster.alumni.reduce((s, a) => s + (a.longitude ?? a.lng ?? 0), 0) / n;
      } else {
        const key = `cluster_${profile.city.toLowerCase().replace(/\s+/g, '_')}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
        clusterList.push({
          key,
          lat,
          lng,
          city: profile.city,
          country: profile.country,
          alumni: [profile],
        });
      }
    });

    return clusterList;
  }, [filteredAlumni, mapZoom]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.5, 30],
        zoom: 2.5,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: true,
        worldCopyJump: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control
        .zoom({
          position: 'topleft',
        })
        .addTo(map);

      map.on('zoomend', () => {
        setMapZoom(map.getZoom());
        setExpandedClusterKey(null);
      });

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Helper to create an individual alumnus marker
  const createAlumnusMarker = (alumnus: AlumniProfile, lat: number, lng: number) => {
    const dept = getPrimaryDepartment(alumnus);

    const customIcon = L.divIcon({
      className: 'alumni-custom-marker',
      html: `
        <div class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-115">
          <div class="relative w-11 h-11 rounded-full bg-white dark:bg-slate-900 shadow-xl overflow-hidden border-2 border-white" style="box-shadow: 0 0 0 3px ${dept.ringColor}, 0 10px 15px -3px rgba(0,0,0,0.3)">
            <img src="${alumnus.avatarUrl}" alt="${alumnus.fullName}" class="w-full h-full object-cover pointer-events-none" />
          </div>
          <div class="w-2.5 h-2.5 rotate-45 -mt-1 shadow-xs border-r border-b border-white" style="background-color: ${dept.ringColor}"></div>
          <span class="absolute -top-1.5 -right-1.5 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white shadow-xs" style="background-color: ${dept.ringColor}">
            B${alumnus.batchYear}
          </span>
        </div>
      `,
      iconSize: [44, 48],
      iconAnchor: [22, 46],
      popupAnchor: [0, -46],
    });

    const marker = L.marker([lat, lng], { icon: customIcon });

    const popupDiv = document.createElement('div');
    popupDiv.className = 'ndc-map-popup p-1 min-w-[250px] max-w-[290px] font-sans text-slate-900';
    popupDiv.innerHTML = `
      <div class="flex items-start gap-3 pb-3 border-b border-slate-200">
        <img src="${alumnus.avatarUrl}" alt="${alumnus.fullName}" class="w-12 h-12 rounded-full object-cover shrink-0 ring-2" style="border-color: ${dept.ringColor}" />
        <div class="min-w-0 flex-1">
          <div class="font-extrabold text-sm text-slate-900 leading-tight">${alumnus.fullName}</div>
          <div class="text-[11px] font-bold text-blue-600 mt-0.5">Batch ${alumnus.batchYear} · ${alumnus.position}</div>
        </div>
      </div>
      <div class="py-2.5 space-y-1.5 text-xs">
        <div class="flex items-center gap-1.5">
          <span class="font-bold text-slate-500 text-[11px]">Department:</span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${dept.badgeBg} ${dept.badgeText} border border-slate-200/50">
            ${dept.shortName}
          </span>
        </div>
        <div class="flex items-center gap-1.5 text-slate-700 text-xs">
          <span class="font-bold text-slate-500 text-[11px]">Location:</span>
          <span class="font-semibold text-slate-900">${alumnus.city}, ${alumnus.country}</span>
        </div>
        <div class="flex items-start gap-1.5 text-slate-700 text-xs">
          <span class="font-bold text-slate-500 text-[11px] shrink-0">Org / Dept:</span>
          <span class="font-medium text-slate-800 leading-tight">${alumnus.institution}</span>
        </div>
      </div>
      <button
        id="popup-btn-${alumnus.id}"
        class="w-full mt-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>View Full Profile</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      </button>
    `;

    marker.bindPopup(popupDiv, {
      className: 'ndc-leaflet-popup',
      maxWidth: 320,
    });

    marker.on('popupopen', () => {
      const btn = document.getElementById(`popup-btn-${alumnus.id}`);
      if (btn) {
        btn.onclick = (e) => {
          e.preventDefault();
          if (alumnus.id < 800000) {
            onViewProfile(alumnus.id);
          } else {
            setSelectedMapAlumnus(alumnus);
          }
        };
      }
    });

    return marker;
  };

  // Update Markers whenever clusters or expandedClusterKey change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    clusters.forEach((cluster) => {
      const count = cluster.alumni.length;

      if (count === 1) {
        const alumnus = cluster.alumni[0];
        const lat = alumnus.latitude ?? alumnus.lat ?? cluster.lat;
        const lng = alumnus.longitude ?? alumnus.lng ?? cluster.lng;
        createAlumnusMarker(alumnus, lat, lng).addTo(markersLayer);
      } else if (expandedClusterKey === cluster.key) {
        // Spiderfied / Expanded state: fan out individual markers in a circle around cluster center
        const currentZoom = map.getZoom();
        const radiusDeg = Math.max(0.003, 0.28 / Math.pow(1.65, Math.max(0, currentZoom - 4)));

        cluster.alumni.forEach((alumnus, idx) => {
          const angle = (2 * Math.PI * idx) / count;
          const spiderLat = cluster.lat + radiusDeg * Math.cos(angle) * 0.75;
          const spiderLng = cluster.lng + radiusDeg * Math.sin(angle);

          // Draw connecting spider leg line from cluster center to expanded marker
          L.polyline(
            [
              [cluster.lat, cluster.lng],
              [spiderLat, spiderLng],
            ],
            {
              color: '#2563eb',
              weight: 2,
              opacity: 0.65,
              dashArray: '4, 4',
            }
          ).addTo(markersLayer);

          createAlumnusMarker(alumnus, spiderLat, spiderLng).addTo(markersLayer);
        });

        // Center collapse hub button
        const collapseIcon = L.divIcon({
          className: 'alumni-cluster-collapse',
          html: `
            <div title="Click to collapse cluster" class="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:bg-rose-600 transition-colors">
              ✕
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const collapseMarker = L.marker([cluster.lat, cluster.lng], { icon: collapseIcon });
        collapseMarker.on('click', () => {
          setExpandedClusterKey(null);
        });
        collapseMarker.addTo(markersLayer);
      } else {
        // Multi-alumni count bubble that expands on click
        const clusterIcon = L.divIcon({
          className: 'alumni-cluster-marker',
          html: `
            <div title="Click to expand ${count} alumni in ${cluster.city}" class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110">
              <div class="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-sm ring-4 ring-blue-400/40 shadow-xl border-2 border-white">
                <span>${count}</span>
                <span class="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-bold items-center justify-center text-white">+</span>
                </span>
              </div>
              <div class="w-2.5 h-2.5 bg-blue-700 rotate-45 -mt-1 shadow-xs border-r border-b border-white"></div>
              <div class="mt-1 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                ${cluster.city} (${count})
              </div>
            </div>
          `,
          iconSize: [50, 60],
          iconAnchor: [25, 50],
          popupAnchor: [0, -50],
        });

        const marker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon });

        // Clicking the count bubble expands the cluster into individual alumni markers
        marker.on('click', () => {
          if (map.getZoom() < 8) {
            map.flyTo([cluster.lat, cluster.lng], Math.min(map.getZoom() + 3, 11), {
              animate: true,
              duration: 0.7,
            });
            setTimeout(() => {
              setExpandedClusterKey(cluster.key);
            }, 750);
          } else {
            setExpandedClusterKey(cluster.key);
          }
        });

        marker.addTo(markersLayer);
      }
    });
  }, [clusters, expandedClusterKey, onViewProfile]);

  // Handler: Change Region
  const handleSelectRegion = (regionId: string) => {
    setSelectedRegionId(regionId);
    setSelectedSubRegionCity('all');

    const region = GEOGRAPHIC_REGIONS.find((r) => r.id === regionId);
    if (region && mapInstanceRef.current) {
      mapInstanceRef.current.setView(region.center, region.zoom, { animate: true });
    }
  };

  // Handler: Change Sub-Region (City/Division)
  const handleSelectSubRegion = (sub: GeographicSubRegion) => {
    setSelectedSubRegionCity(sub.city);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(sub.center, sub.zoom, { animate: true });
    }
  };

  // Handler: Toggle Department
  const handleToggleDepartment = (deptId: string) => {
    if (selectedDepartmentId === deptId) {
      // Toggle off -> show all
      setSelectedDepartmentId('all');
    } else {
      setSelectedDepartmentId(deptId);
    }
  };

  // Handler: Reset everything
  const handleResetAll = () => {
    setSelectedRegionId('all');
    setSelectedSubRegionCity('all');
    setSelectedDepartmentId('all');
    setSelectedBatch('All');
    setSelectedOrganization('All');
    setSearchQuery('');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([23.5, 30], 2.5, { animate: true });
    }
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header Banner & Actions */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span>Interactive Geographic Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-0.5">
            Alumni Map Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Explore alumni, entrepreneurs, leaders, and specialists filtered by geographic regions and professional sectors worldwide.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {(selectedRegionId !== 'all' ||
            selectedDepartmentId !== 'all' ||
            selectedBatch !== 'All' ||
            searchQuery) && (
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Main Interactive Map Canvas & Optional Filter Drawer (Shown First!) */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex flex-col lg:flex-row gap-4 min-h-[520px] h-[62vh] min-w-0">
        {/* Full Interactive Leaflet Map */}
        <div className="relative flex-1 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-xs flex flex-col min-w-0">
          <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-10" />

          {/* On-Map Leaflet Geosearch Control */}
          <div className="absolute top-3 left-14 right-3 sm:right-auto sm:w-88 z-30">
            <div className="relative">
              <div className="flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-lg overflow-hidden">
                <div className="pl-3.5 text-blue-600 dark:text-blue-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={geoSearchInput}
                  onFocus={() => setShowGeoDropdown(true)}
                  onChange={(e) => {
                    setGeoSearchInput(e.target.value);
                    setShowGeoDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && geoSuggestions.length > 0) {
                      e.preventDefault();
                      handleSelectGeoLocation(geoSuggestions[0]);
                    }
                  }}
                  placeholder="Geosearch location on map (e.g. Dhaka, London, NY)..."
                  className="w-full px-2.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-none"
                />
                {geoSearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setGeoSearchInput('');
                      setGeoSuggestions([]);
                      if (geoPinRef.current) {
                        geoPinRef.current.remove();
                        geoPinRef.current = null;
                      }
                    }}
                    className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Geosearch Autocomplete Suggestions */}
              {showGeoDropdown && (geoSuggestions.length > 0 || isGeoSearching) && (
                <div className="mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                  {geoSuggestions.map((loc, i) => (
                    <button
                      key={`${loc.lat}_${loc.lng}_${i}`}
                      type="button"
                      onClick={() => handleSelectGeoLocation(loc)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {loc.label}
                        </span>
                      </div>
                      {loc.subtitle && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                          {loc.subtitle}
                        </span>
                      )}
                    </button>
                  ))}
                  {isGeoSearching && (
                    <div className="px-3.5 py-2 text-[11px] text-slate-400">
                      Searching world map coordinates...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Map Overlay: Current Region & Department HUD */}
          <div className="absolute top-3 right-3 z-20 pointer-events-none">
            <div className="bg-slate-900/85 dark:bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-bold shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                {currentRegion.flag} {currentRegion.shortName}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-blue-300 font-semibold">
                {selectedDepartmentId === 'all'
                  ? 'All Departments'
                  : currentDepartment?.shortName}
              </span>
            </div>
          </div>

          {/* Quick instructions pill at bottom-left */}
          <div className="absolute bottom-3 left-3 z-20 pointer-events-none hidden sm:block">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-700 dark:text-slate-300 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-semibold shadow-xs flex items-center gap-1.5">
              <Info className="w-3 h-3 text-blue-600" />
              <span>Color ring on markers indicates the alumnus's professional sector</span>
            </div>
          </div>
        </div>

        {/* Right-side Directory Filter Panel (Toggleable) */}
        <div
          className={`${
            isFilterPanelOpen ? 'flex' : 'hidden'
          } flex-col w-full lg:w-88 xl:w-96 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden shrink-0 transition-all`}
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Directory Filters
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                {filteredAlumni.length} found
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetAll}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Panel Controls */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {/* Search Input */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Search Alumni
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Alumnus name, company, city..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Geographic Region Dropdown */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Geographic Region
              </label>
              <select
                value={selectedRegionId}
                onChange={(e) => handleSelectRegion(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs cursor-pointer font-medium"
              >
                {GEOGRAPHIC_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.flag} {r.name} ({regionCounts[r.id] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Professional Sector Dropdown */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Professional Sector
              </label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs cursor-pointer font-medium"
              >
                <option value="all">
                  All Sectors ({departmentCountsInRegion['all'] || 0})
                </option>
                {PROFESSIONAL_SECTORS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({departmentCountsInRegion[dept.id] || 0} in {currentRegion.shortName})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Year Dropdown */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Batch Year
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs cursor-pointer"
              >
                <option value="All">All Batches</option>
                {filterOptions.batches.map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Organization / Workplace Dropdown */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Workplace / Organization in Region
              </label>
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs cursor-pointer"
              >
                <option value="All">All Organizations in this Region</option>
                {filterOptions.organizations.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>

            {/* Metrics Box */}
            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Selected Region:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {currentRegion.shortName}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Selected Sector:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {currentDepartment ? currentDepartment.shortName : 'All Sectors'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Matched Alumni:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {filteredAlumni.length} verified
                </span>
              </div>
            </div>

            {/* List of Matched Alumni in Region & Sector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                <span>Matched Alumni</span>
                <span>({filteredAlumni.length})</span>
              </div>

              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredAlumni.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    <MapPin className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                      No alumni in this view
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      As alumni register, their organization locations will pin here.
                    </p>
                  </div>
                ) : (
                  filteredAlumni.map((alumnus) => {
                    const dept = getPrimaryDepartment(alumnus);
                    return (
                      <div
                        key={alumnus.id}
                        onClick={() => {
                          const lat = alumnus.latitude ?? alumnus.lat;
                          const lng = alumnus.longitude ?? alumnus.lng;
                          if (lat && lng && mapInstanceRef.current) {
                            mapInstanceRef.current.setView([lat, lng], 13, { animate: true });
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={alumnus.avatarUrl}
                            alt={alumnus.fullName}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-2"
                            style={{ borderColor: dept.ringColor }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-[11px]">
                              {alumnus.fullName}
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                B{alumnus.batchYear}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold ${dept.badgeBg} ${dept.badgeText}`}
                              >
                                {dept.shortName}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500 truncate">
                              {alumnus.city}, {alumnus.country}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (alumnus.id < 800000) {
                              onViewProfile(alumnus.id);
                            } else {
                              setSelectedMapAlumnus(alumnus);
                            }
                          }}
                          className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-lg transition-colors shrink-0 cursor-pointer"
                        >
                          Profile
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Search & Geographic Region Selector Bar (Below Map) */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Inline Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alumni on map by name, company, city, or country..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Geographic Region
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              ({filteredAlumni.length} in view)
            </span>
          </div>
        </div>

        {/* Region Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GEOGRAPHIC_REGIONS.map((region) => {
            const active = selectedRegionId === region.id;
            const count = regionCounts[region.id] || 0;

            return (
              <button
                key={region.id}
                type="button"
                onClick={() => handleSelectRegion(region.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm scale-102'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <span className="text-sm">{region.flag}</span>
                <span>{region.shortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    active
                      ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-region Pills (if available for selected region, e.g. Bangladesh divisions) */}
        {currentRegion.subRegions && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
            <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">
              Divisions / Hubs:
            </span>
            {currentRegion.subRegions.map((sub) => {
              const subActive = selectedSubRegionCity === sub.city;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectSubRegion(sub)}
                  className={`px-2.5 py-1 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                    subActive
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Professional Sector Toggle Filter Bar (Below Map) */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Professional Sector Filters
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              (Live counts for {currentRegion.shortName})
            </span>
          </div>

          {selectedDepartmentId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedDepartmentId('all')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear Specialty Filter</span>
            </button>
          )}
        </div>

        {/* Toggle Pills Grid / Horizontal Flow */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* 'All Departments' Button */}
          <button
            type="button"
            onClick={() => setSelectedDepartmentId('all')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
              selectedDepartmentId === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Departments</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                selectedDepartmentId === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {departmentCountsInRegion['all'] || 0}
            </span>
          </button>

          {/* Department Items */}
          {PROFESSIONAL_SECTORS.map((dept) => {
            const Icon = dept.icon;
            const isSelected = selectedDepartmentId === dept.id;
            const countInRegion = departmentCountsInRegion[dept.id] || 0;
            const hasAlumni = countInRegion > 0;

            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => handleToggleDepartment(dept.id)}
                title={`${dept.name} (${countInRegion} in ${currentRegion.shortName})`}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? `${dept.activeBg} ${dept.activeBorder} shadow-sm ring-1 ring-white/20 scale-102`
                    : hasAlumni
                    ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200/50 dark:border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isSelected ? 'text-white' : hasAlumni ? dept.badgeText : 'text-slate-400'
                  }`}
                />
                <span>{dept.shortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : hasAlumni
                      ? 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {countInRegion}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Alumnus Profile Detail Modal */}
      {selectedMapAlumnus && (
        <div
          onClick={() => setSelectedMapAlumnus(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedMapAlumnus.avatarUrl}
                  alt={selectedMapAlumnus.fullName}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {selectedMapAlumnus.fullName}
                  </h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    Batch {selectedMapAlumnus.batchYear} {selectedMapAlumnus.session || ''} • {selectedMapAlumnus.group || 'Science'}
                  </p>
                  {selectedMapAlumnus.collegeRoll && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      College Roll: {selectedMapAlumnus.collegeRoll}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMapAlumnus(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedMapAlumnus.bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                {selectedMapAlumnus.bio}
              </p>
            )}

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong>{selectedMapAlumnus.position}</strong> at {selectedMapAlumnus.institution}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Degrees: {selectedMapAlumnus.degree.join(', ')} • {selectedMapAlumnus.specialty.join(', ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {selectedMapAlumnus.city}, {selectedMapAlumnus.country}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniMapDirectory;
