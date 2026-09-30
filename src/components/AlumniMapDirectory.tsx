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
import { ALUMNI_PROFILES } from '../data/mockData';

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

export const AlumniMapDirectory: React.FC<AlumniMapDirectoryProps> = ({ onViewProfile }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // 1. Geographic Region State
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
  const [selectedSubRegionCity, setSelectedSubRegionCity] = useState<string>('all');

  // 2. Professional Sector State
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');

  // 3. Secondary Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('All');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  const currentRegion = useMemo(() => {
    return GEOGRAPHIC_REGIONS.find((r) => r.id === selectedRegionId) || GEOGRAPHIC_REGIONS[0];
  }, [selectedRegionId]);

  const currentDepartment = useMemo(() => {
    return PROFESSIONAL_SECTORS.find((d) => d.id === selectedDepartmentId) || null;
  }, [selectedDepartmentId]);

  // Dynamic regional counts per sector (specifically for the selected geographic region)
  const departmentCountsInRegion = useMemo(() => {
    const alumniInRegion = ALUMNI_PROFILES.filter((p) =>
      matchAlumnusToRegion(p, selectedRegionId, selectedSubRegionCity)
    );

    const counts: Record<string, number> = {
      all: alumniInRegion.length,
    };

    PROFESSIONAL_SECTORS.forEach((dept) => {
      counts[dept.id] = alumniInRegion.filter((p) => matchAlumnusToSector(p, dept.id)).length;
    });

    return counts;
  }, [selectedRegionId, selectedSubRegionCity]);

  // Overall counts per geographic region (independent of sector filter)
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: ALUMNI_PROFILES.length,
    };

    GEOGRAPHIC_REGIONS.forEach((r) => {
      if (r.id === 'all') return;
      counts[r.id] = ALUMNI_PROFILES.filter((p) => matchAlumnusToRegion(p, r.id)).length;
    });

    return counts;
  }, []);

  // Filtered alumni based on Region, Sector, Search, Batch & Organization
  const filteredAlumni = useMemo(() => {
    return ALUMNI_PROFILES.filter((profile) => {
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
    selectedRegionId,
    selectedSubRegionCity,
    selectedDepartmentId,
    selectedBatch,
    selectedOrganization,
    searchQuery,
  ]);

  // Extract batch and organization options
  const filterOptions = useMemo(() => {
    const batches = Array.from(new Set(ALUMNI_PROFILES.map((p) => p.batchYear))).sort((a, b) => a - b);
    const organizations = Array.from(
      new Set(
        ALUMNI_PROFILES.filter((p) => matchAlumnusToRegion(p, selectedRegionId, selectedSubRegionCity)).map(
          (p) => p.institution
        )
      )
    ).filter(Boolean).sort();

    return { batches, organizations };
  }, [selectedRegionId, selectedSubRegionCity]);

  // Location clusters for the map
  const clusters = useMemo(() => {
    const clusterMap = new Map<string, LocationCluster>();

    filteredAlumni.forEach((profile) => {
      const lat = profile.latitude ?? profile.lat;
      const lng = profile.longitude ?? profile.lng;
      if (lat === undefined || lng === undefined) return;

      const key = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          key,
          lat,
          lng,
          city: profile.city,
          country: profile.country,
          alumni: [],
        });
      }
      clusterMap.get(key)!.alumni.push(profile);
    });

    return Array.from(clusterMap.values());
  }, [filteredAlumni]);

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

  // Update Markers whenever clusters change
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
              onViewProfile(alumnus.id);
            };
          }
        });

        marker.addTo(markersLayer);
      } else {
        // Multi-alumni cluster
        const clusterIcon = L.divIcon({
          className: 'alumni-cluster-marker',
          html: `
            <div class="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110">
              <div class="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-sm ring-4 ring-blue-400/40 shadow-xl border-2 border-white">
                <span>${count}</span>
                <span class="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-bold items-center justify-center text-white">✓</span>
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

        const clusterPopupDiv = document.createElement('div');
        clusterPopupDiv.className = 'ndc-map-popup p-1 min-w-[270px] max-w-[320px] font-sans text-slate-900';
        clusterPopupDiv.innerHTML = `
          <div class="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <div class="font-extrabold text-sm text-slate-900">${cluster.city}, ${cluster.country}</div>
              <div class="text-[11px] font-semibold text-blue-600">${count} Alumni Living & Working Here</div>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">${count} Alumni</span>
          </div>
          <div class="py-2 divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
            ${cluster.alumni
              .map((a) => {
                const aDept = getPrimaryDepartment(a);
                return `
                  <div class="py-2 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <img src="${a.avatarUrl}" alt="${a.fullName}" class="w-8 h-8 rounded-full object-cover shrink-0" style="border: 2px solid ${aDept.ringColor}" />
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-slate-900 truncate">${a.fullName}</div>
                        <div class="flex items-center gap-1 text-[10px]">
                          <span class="font-semibold text-blue-600">B${a.batchYear}</span>
                          <span class="text-slate-300">·</span>
                          <span class="px-1.5 py-0.2 rounded font-bold ${aDept.badgeBg} ${aDept.badgeText}">${aDept.shortName}</span>
                        </div>
                        <div class="text-[9px] text-slate-500 truncate mt-0.5">${a.institution}</div>
                      </div>
                    </div>
                    <button
                      id="cluster-item-${a.id}"
                      class="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-[10px] rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                `;
              })
              .join('')}
          </div>
          <button
            id="zoom-cluster-${cluster.key}"
            class="w-full mt-2 py-1.5 px-3 bg-slate-900 hover:bg-black text-white font-bold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Zoom In Closer</span>
          </button>
        `;

        marker.bindPopup(clusterPopupDiv, {
          className: 'ndc-leaflet-popup',
          maxWidth: 340,
        });

        marker.on('popupopen', () => {
          cluster.alumni.forEach((a) => {
            const btn = document.getElementById(`cluster-item-${a.id}`);
            if (btn) {
              btn.onclick = (e) => {
                e.preventDefault();
                onViewProfile(a.id);
              };
            }
          });

          const zoomBtn = document.getElementById(`zoom-cluster-${cluster.key}`);
          if (zoomBtn) {
            zoomBtn.onclick = (e) => {
              e.preventDefault();
              map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 3, 14), {
                animate: true,
              });
            };
          }
        });

        marker.addTo(markersLayer);
      }
    });
  }, [clusters, onViewProfile]);

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

          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
              isFilterPanelOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isFilterPanelOpen ? 'Hide Directory Panel' : 'Show Directory Panel'}</span>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Geographic Region Selector Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Select Geographic Region
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {filteredAlumni.length} alumni currently in view
          </span>
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
      {/* 3. Professional Sector Toggle Filter Bar */}
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

        {/* Dynamic Regional Specialty Status Pill */}
        {selectedDepartmentId !== 'all' && currentDepartment && (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentDepartment.ringColor }}
              ></span>
              <span>
                Showing <strong>{filteredAlumni.length}</strong> specialist
                {filteredAlumni.length === 1 ? '' : 's'} in{' '}
                <strong className="text-blue-700 dark:text-blue-300">
                  {currentDepartment.name}
                </strong>{' '}
                working in <strong>{currentRegion.name}</strong>
              </span>
            </div>

            {filteredAlumni.length === 0 && (
              <button
                type="button"
                onClick={() => setSelectedRegionId('all')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Find Worldwide</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Main Map Canvas & Directory Drawer */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex flex-col lg:flex-row gap-4 min-h-[580px] h-[calc(100vh-320px)] min-w-0">
        {/* Full Interactive Leaflet Map */}
        <div className="relative flex-1 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-xs flex flex-col min-w-0">
          <div ref={mapContainerRef} className="w-full h-full min-h-[440px] z-10" />

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

          {/* Empty State Overlay if 0 alumni found for filter combo */}
          {filteredAlumni.length === 0 && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  No Alumni Found in this Region
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  There are currently no alumni registered in{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentDepartment?.name || 'this specialty'}
                  </span>{' '}
                  for{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentRegion.name}
                  </span>
                  .
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedRegionId('all')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    View this Department Worldwide
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDepartmentId('all')}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Show All Departments Here
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. Right-side Directory Filter Panel */}
        {/* ------------------------------------------------------------- */}
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
                            onViewProfile(alumnus.id);
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
    </div>
  );
};

export default AlumniMapDirectory;
