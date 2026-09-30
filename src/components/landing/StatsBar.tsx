import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap,
  ShieldCheck,
  Globe2,
  Award,
  HeartHandshake,
  RotateCw,
  Pause,
  Play,
  ChevronRight,
  Sparkles,
  MapPin,
  X
} from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  isHQ?: boolean;
  alumniCount: string;
}

const NETWORK_NODES: NetworkNode[] = [
  { id: 'dhaka', name: 'Dhaka HQ (Campus)', region: 'Mother Campus', lat: 23.733, lon: 90.417, isHQ: true, alumniCount: '35,000+ Total' },
  { id: 'london', name: 'London & UK', region: 'UK & Europe', lat: 51.507, lon: -0.127, alumniCount: '480+ Alumni' },
  { id: 'nyc', name: 'New York & Tri-State', region: 'North America', lat: 40.712, lon: -74.006, alumniCount: '650+ Alumni' },
  { id: 'toronto', name: 'Toronto & Ontario', region: 'North America', lat: 43.653, lon: -79.383, alumniCount: '520+ Alumni' },
  { id: 'sydney', name: 'Sydney & NSW', region: 'Asia-Pacific', lat: -33.868, lon: 151.209, alumniCount: '390+ Alumni' },
  { id: 'melbourne', name: 'Melbourne & VIC', region: 'Asia-Pacific', lat: -37.813, lon: 144.963, alumniCount: '240+ Alumni' },
  { id: 'tokyo', name: 'Tokyo & Kanto', region: 'Asia-Pacific', lat: 35.676, lon: 139.65, alumniCount: '150+ Alumni' },
  { id: 'singapore', name: 'Singapore Hub', region: 'Southeast Asia', lat: 1.352, lon: 103.819, alumniCount: '290+ Alumni' },
  { id: 'dubai', name: 'Dubai & Emirates', region: 'Middle East', lat: 25.204, lon: 55.27, alumniCount: '510+ Alumni' },
  { id: 'frankfurt', name: 'Frankfurt & Central EU', region: 'UK & Europe', lat: 50.11, lon: 8.682, alumniCount: '180+ Alumni' },
  { id: 'stockholm', name: 'Stockholm & Nordic', region: 'UK & Europe', lat: 59.329, lon: 18.068, alumniCount: '130+ Alumni' },
  { id: 'kl', name: 'Kuala Lumpur', region: 'Southeast Asia', lat: 3.139, lon: 101.686, alumniCount: '210+ Alumni' },
  { id: 'doha', name: 'Doha & Qatar', region: 'Middle East', lat: 25.285, lon: 51.531, alumniCount: '190+ Alumni' },
  { id: 'riyadh', name: 'Riyadh & KSA', region: 'Middle East', lat: 24.713, lon: 46.675, alumniCount: '260+ Alumni' },
  { id: 'sf', name: 'Silicon Valley & Bay Area', region: 'North America', lat: 37.774, lon: -122.419, alumniCount: '410+ Alumni' },
  { id: 'chicago', name: 'Chicago & Midwest', region: 'North America', lat: 41.878, lon: -87.629, alumniCount: '280+ Alumni' },
  { id: 'geneva', name: 'Geneva & UN Environs', region: 'UK & Europe', lat: 46.204, lon: 6.143, alumniCount: '110+ Alumni' },
];

type ActiveStatKey = 'none' | 'batches' | 'alumni' | 'countries' | 'specialists' | 'brotherhood';

export const StatsBar: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation & view state
  const [isInView, setIsInView] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0.4);
  const [targetAngle, setTargetAngle] = useState<number | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const [activeStat, setActiveStat] = useState<ActiveStatKey>('none');
  const [selectedNode, setSelectedNode] = useState<NetworkNode>(NETWORK_NODES[0]);

  const dragStartRef = useRef<{ x: number; angle: number }>({ x: 0, angle: 0 });

  // Intersection observer to trigger count-up on scroll
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Smooth numeric counter animation loop (1.6 seconds)
  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    let animId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / 1600);
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimProgress(ease);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isInView]);

  // Smooth rotation transition towards selected target angle
  useEffect(() => {
    if (targetAngle === null) return;
    let animId: number;

    const animateToTarget = () => {
      setRotationAngle((prev) => {
        // Compute shortest angle difference
        let diff = (targetAngle - prev) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) < 0.01) {
          setTargetAngle(null);
          return targetAngle;
        }
        return prev + diff * 0.08;
      });
      animId = requestAnimationFrame(animateToTarget);
    };

    animId = requestAnimationFrame(animateToTarget);
    return () => cancelAnimationFrame(animId);
  }, [targetAngle]);

  // Canvas 3D Global Network rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let localAngle = rotationAngle;

    const render = () => {
      if (isRotating && !isInteracting && targetAngle === null) {
        localAngle += 0.0025;
      } else {
        localAngle = rotationAngle;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 5;
      const radius = Math.min(width * 0.35, height * 0.42, 140);

      // 1. Globe Ambient Aura
      const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.15);
      glowGrad.addColorStop(0, 'rgba(30, 58, 138, 0.16)');
      glowGrad.addColorStop(0.7, 'rgba(15, 23, 42, 0.06)');
      glowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Latitude Circles
      const latSteps = [-60, -30, 0, 30, 60];
      latSteps.forEach((lat) => {
        const phi = (lat * Math.PI) / 180;
        const rLat = radius * Math.cos(phi);
        const yLat = cy - radius * Math.sin(phi);

        ctx.beginPath();
        ctx.ellipse(cx, yLat, rLat, rLat * 0.25, 0, 0, Math.PI * 2);
        ctx.strokeStyle = lat === 0 ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.07)';
        ctx.lineWidth = lat === 0 ? 1.1 : 0.7;
        ctx.stroke();
      });

      // 3. Longitude Circles
      const lonCount = 10;
      for (let i = 0; i < lonCount; i++) {
        const theta = (i * Math.PI) / lonCount + localAngle;
        const xRad = radius * Math.cos(theta);

        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(xRad), radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.07)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Projection formula
      const project = (lat: number, lon: number) => {
        const phi = (lat * Math.PI) / 180;
        const theta = (lon * Math.PI) / 180 + localAngle;

        const x = radius * Math.cos(phi) * Math.sin(theta);
        const y = -radius * Math.sin(phi);
        const z = radius * Math.cos(phi) * Math.cos(theta);

        const scale = 1 + z / (radius * 3.5);
        return {
          px: cx + x * scale,
          py: cy + y * scale,
          z,
          visible: z > -radius * 0.25,
        };
      };

      const hqNode = NETWORK_NODES[0];
      const hqProj = project(hqNode.lat, hqNode.lon);

      // 4. Connecting Flight Arcs from Dhaka to International Hubs
      NETWORK_NODES.slice(1).forEach((node, idx) => {
        const destProj = project(node.lat, node.lon);

        if (hqProj.visible || destProj.visible) {
          const midX = (hqProj.px + destProj.px) / 2;
          const midY = (hqProj.py + destProj.py) / 2 - Math.min(35, Math.abs(hqProj.px - destProj.px) * 0.22);

          ctx.beginPath();
          ctx.moveTo(hqProj.px, hProjClamp(hqProj.py, cy, radius));
          ctx.quadraticCurveTo(midX, midY, destProj.px, destProj.py);

          const isHighlighted = selectedNode.id === node.id || activeStat === 'countries';
          const arcGrad = ctx.createLinearGradient(hqProj.px, hqProj.py, destProj.px, destProj.py);
          arcGrad.addColorStop(0, isHighlighted ? 'rgba(245, 158, 11, 0.65)' : 'rgba(245, 158, 11, 0.35)');
          arcGrad.addColorStop(0.5, isHighlighted ? 'rgba(96, 165, 250, 0.45)' : 'rgba(96, 165, 250, 0.2)');
          arcGrad.addColorStop(1, isHighlighted ? 'rgba(147, 197, 253, 0.55)' : 'rgba(147, 197, 253, 0.25)');

          ctx.strokeStyle = arcGrad;
          ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
          ctx.stroke();

          // Traveling light particle
          const t = ((Date.now() / 2200) + idx * 0.16) % 1;
          const p0x = hqProj.px;
          const p0y = hProjClamp(hqProj.py, cy, radius);
          const partX = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * midX + t * t * destProj.px;
          const partY = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * midY + t * t * destProj.py;

          ctx.beginPath();
          ctx.arc(partX, partY, isHighlighted ? 2.2 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = isHighlighted ? '#FEF08A' : '#FCD34D';
          ctx.fill();
        }
      });

      // 5. Draw Chapter Nodes
      NETWORK_NODES.forEach((node) => {
        const p = project(node.lat, node.lon);
        if (!p.visible) return;

        const depthAlpha = Math.max(0.2, (p.z + radius) / (radius * 2));
        const isSelected = selectedNode.id === node.id;

        if (node.isHQ) {
          const pulseR = 3.5 + Math.sin(Date.now() / 320) * 2.5;
          ctx.beginPath();
          ctx.arc(p.px, p.py, pulseR + 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.45 * depthAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.px, p.py, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#F59E0B';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.px, p.py, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else {
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(p.px, p.py, 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(p.px, p.py, isSelected ? 3.5 : 2.4, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#FCD34D' : `rgba(147, 197, 253, ${0.85 * depthAlpha})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.px, p.py, 1, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }
      });

      ctx.restore();
      animFrame = requestAnimationFrame(render);
    };

    const hProjClamp = (val: number, center: number, r: number) => {
      return Math.max(center - r, Math.min(center + r, val));
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [rotationAngle, isRotating, isInteracting, targetAngle, selectedNode, activeStat]);

  // Pointer drag to spin the 3D globe freely
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsInteracting(true);
    dragStartRef.current = { x: e.clientX, angle: rotationAngle };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isInteracting) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    setRotationAngle(dragStartRef.current.angle + deltaX * 0.006);
  };

  const handlePointerUp = () => {
    setIsInteracting(false);
  };

  // Focus globe on a specific chapter node
  const handleSelectChapter = (node: NetworkNode) => {
    setSelectedNode(node);
    // Calculate angle that brings node's longitude into the front
    const target = -((node.lon * Math.PI) / 180);
    setTargetAngle(target);
  };

  // Replay count-up animation
  const handleReplay = () => {
    setAnimProgress(0);
    setIsInView(false);
    setTimeout(() => setIsInView(true), 40);
  };

  const toggleStat = (key: ActiveStatKey) => {
    setActiveStat((prev) => (prev === key ? 'none' : key));
  };

  const displayBatches = Math.floor(animProgress * 76);
  const displayAlumni = Math.floor(animProgress * 3250).toLocaleString();
  const displayCountries = Math.floor(animProgress * 18);
  const displaySpecialists = Math.floor(animProgress * 450);
  const displayEmergencyHours = Math.floor(animProgress * 24);
  const displayEmergencyDays = Math.floor(animProgress * 7);

  return (
    <section
      ref={sectionRef}
      id="network-glance-section"
      className="relative w-full py-5 sm:py-8 lg:py-10 bg-[#060C1D] text-white border-y border-blue-900/50 overflow-hidden select-none"
    >
      {/* ========================================================= */}
      {/* 1. ATMOSPHERIC 3D & REAL PHOTOGRAPHIC DEPTH LAYERS        */}
      {/* ========================================================= */}

      {/* Atmospheric radial background glow */}
      <div className="absolute inset-0 bg-radial from-blue-950/40 via-[#071126]/80 to-[#050A18] pointer-events-none" />

      {/* Subtle real NDC College Building photo blending */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.055] mix-blend-luminosity filter blur-[1px] pointer-events-none"
        style={{
          backgroundImage: "url('/src/assets/images/ndc_campus_hero_1790233370828.jpg')",
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
        }}
      />

      {/* Subtle real 75 Years Reunion Celebration Photo (Left Edge Vignette) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-64 bg-cover bg-center opacity-[0.035] mix-blend-screen filter blur-[0.5px] pointer-events-none hidden md:block"
        style={{
          backgroundImage: "url('/src/assets/images/ndc_reunion_celebration_1790233384454.jpg')",
          maskImage: 'linear-gradient(to right, black 15%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to right, black 15%, transparent 90%)',
        }}
      />

      {/* Subtle real Main Gate Photo (Right Edge Vignette) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-64 bg-cover bg-center opacity-[0.035] mix-blend-screen filter blur-[0.5px] pointer-events-none hidden md:block"
        style={{
          backgroundImage: "url('/src/assets/images/ndc_main_gate_1790748632254.jpg')",
          maskImage: 'linear-gradient(to left, black 15%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to left, black 15%, transparent 90%)',
        }}
      />

      {/* Real College Crest floating watermark */}
      <div className="absolute right-4 -bottom-6 opacity-[0.035] pointer-events-none hidden lg:block">
        <img
          src="/ndc-logo.svg"
          alt="Notre Dame Crest Watermark"
          className="w-56 h-56 object-contain filter drop-shadow-xl"
        />
      </div>

      {/* Interactive 3D Canvas Globe (Sits subtly behind cards) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing opacity-85"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        title="Click and drag to rotate the 3D globe"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full max-w-4xl max-h-[240px] sm:max-h-[340px]"
        />
      </div>

      {/* Subtle golden/blue micro particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/5 w-1 h-1 rounded-full bg-amber-400/40 animate-ping" />
        <div className="absolute top-2/3 right-1/4 w-1.5 h-1.5 rounded-full bg-blue-400/30 animate-pulse" />
      </div>

      {/* ========================================================= */}
      {/* 2. FOREGROUND CONTENT & COMPACT 5 TRANSLUCENT GLASS CARDS */}
      {/* ========================================================= */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-4 sm:mb-5">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-amber-500/30 text-amber-300 text-[10px] font-bold tracking-widest uppercase mb-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>OUR NETWORK AT A GLANCE</span>
          </div>

          {/* Main Heading */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight max-w-xl mx-auto">
            One College. 76 Batches.{' '}
            <span className="bg-gradient-to-r from-blue-200 via-amber-200 to-white bg-clip-text text-transparent">
              A Global Brotherhood.
            </span>
          </h2>
          <p className="text-xs text-slate-300/80 mt-0.5 max-w-md mx-auto">
            76 generations of Notredamians from Motijheel campus to leading global institutions.
          </p>
        </div>

        {/* Responsive Grid of Five Statistics */}
        {/* Row 1: 3 statistics on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
          {/* 1. Batches */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => toggleStat('batches')}
            className={`group relative backdrop-blur-md rounded-xl p-3 sm:p-3.5 shadow-md shadow-black/25 transition-colors duration-200 cursor-pointer ${
              activeStat === 'batches'
                ? 'bg-slate-900/90 border-2 border-amber-400/80 ring-2 ring-amber-400/20'
                : 'bg-slate-900/60 hover:bg-slate-900/80 border border-blue-400/20 hover:border-amber-400/40 hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-950/70 border border-blue-500/30 text-amber-300 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.2 rounded bg-blue-950/60 border border-blue-800/40 text-blue-300">
                1949 — 2026
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums group-hover:text-amber-200 transition-colors">
              {displayBatches}
            </div>
            <div className="text-[11px] font-bold text-slate-200 tracking-wide uppercase mt-0.5">
              Alumni Batches
            </div>
            <div className="text-[10px] font-medium text-blue-300/80">
              1949 — 2026
            </div>
          </motion.div>

          {/* 2. Verified Alumni */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => toggleStat('alumni')}
            className={`group relative backdrop-blur-md rounded-xl p-3 sm:p-3.5 shadow-md shadow-black/25 transition-colors duration-200 cursor-pointer ${
              activeStat === 'alumni'
                ? 'bg-slate-900/90 border-2 border-emerald-400/80 ring-2 ring-emerald-400/20'
                : 'bg-slate-900/60 hover:bg-slate-900/80 border border-blue-400/20 hover:border-amber-400/40 hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
                Verified
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums group-hover:text-emerald-200 transition-colors">
              {displayAlumni}+
            </div>
            <div className="text-[11px] font-bold text-slate-200 tracking-wide uppercase mt-0.5">
              Verified Alumni
            </div>
            <div className="text-[10px] font-medium text-emerald-300/80">
              Verified Profiles
            </div>
          </motion.div>

          {/* 3. Countries Worldwide */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => toggleStat('countries')}
            className={`group relative backdrop-blur-md rounded-xl p-3 sm:p-3.5 shadow-md shadow-black/25 transition-colors duration-200 cursor-pointer sm:col-span-2 lg:col-span-1 ${
              activeStat === 'countries'
                ? 'bg-slate-900/90 border-2 border-indigo-400/80 ring-2 ring-indigo-400/20'
                : 'bg-slate-900/60 hover:bg-slate-900/80 border border-blue-400/20 hover:border-amber-400/40 hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 flex items-center justify-center">
                <Globe2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300">
                Global
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums group-hover:text-indigo-200 transition-colors">
              {displayCountries}+
            </div>
            <div className="text-[11px] font-bold text-slate-200 tracking-wide uppercase mt-0.5">
              Countries Worldwide
            </div>
            <div className="text-[10px] font-medium text-indigo-300/80">
              Global Chapters
            </div>
          </motion.div>
        </div>

        {/* Row 2: 2 statistics centered on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-w-xl mx-auto">
          {/* 4. Specialists & Fellows */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.55, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => toggleStat('specialists')}
            className={`group relative backdrop-blur-md rounded-xl p-3 sm:p-3.5 shadow-md shadow-black/25 transition-colors duration-200 cursor-pointer ${
              activeStat === 'specialists'
                ? 'bg-slate-900/90 border-2 border-amber-400/80 ring-2 ring-amber-400/20'
                : 'bg-slate-900/60 hover:bg-slate-900/80 border border-blue-400/20 hover:border-amber-400/40 hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-950/70 border border-amber-500/30 text-amber-300 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300">
                Excellence
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums group-hover:text-amber-200 transition-colors">
              {displaySpecialists}+
            </div>
            <div className="text-[11px] font-bold text-slate-200 tracking-wide uppercase mt-0.5">
              Specialists & Fellows
            </div>
            <div className="text-[10px] font-medium text-amber-300/80">
              FCPS, MD, MRCP, FRCS
            </div>
          </motion.div>

          {/* 5. Emergency & Brotherhood */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => toggleStat('brotherhood')}
            className={`group relative backdrop-blur-md rounded-xl p-3 sm:p-3.5 shadow-md shadow-black/25 transition-colors duration-200 cursor-pointer ${
              activeStat === 'brotherhood'
                ? 'bg-slate-900/90 border-2 border-rose-400/80 ring-2 ring-rose-400/20'
                : 'bg-slate-900/60 hover:bg-slate-900/80 border border-blue-400/20 hover:border-amber-400/40 hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-rose-950/70 border border-rose-500/30 text-rose-300 flex items-center justify-center">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300">
                Always
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums group-hover:text-rose-200 transition-colors">
              <span className="inline-flex items-center gap-1">
                <span>
                  {displayEmergencyHours}/{displayEmergencyDays}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-200 tracking-wide uppercase mt-0.5">
              Emergency & Brotherhood
            </div>
            <div className="text-[10px] font-medium text-rose-300/80">
              Lifelong Bond
            </div>
          </motion.div>
        </div>

        {/* ========================================================= */}
        {/* 3. INTERACTIVE NETWORK DRAWER & CHAPTER EXPLORER          */}
        {/* ========================================================= */}

        {/* Active Dimension Details Drawer (Expands smoothly on click) */}
        {activeStat !== 'none' && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-900/85 border border-blue-500/30 backdrop-blur-md shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {activeStat === 'batches' && '76 Batches History Breakdown'}
                  {activeStat === 'alumni' && 'Verified Alumni Career Disciplines'}
                  {activeStat === 'countries' && 'Global Alumni Chapters Directory'}
                  {activeStat === 'specialists' && 'Specialist Medical & Academic Fellowship'}
                  {activeStat === 'brotherhood' && '24/7 Lifelong Brother Assistance'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveStat('none')}
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-md hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeStat === 'batches' && (
              <div className="text-xs text-slate-300 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/40">
                  🏛️ Pioneer Era (1949–1969): Batches 01–20
                </span>
                <span className="px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/40">
                  🌟 Golden Era (1970–1999): Batches 21–50
                </span>
                <span className="px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/40">
                  🚀 Millennium (2000–2017): Batches 51–67
                </span>
                <span className="px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/40 text-amber-300">
                  🎓 Recent Cohorts (2018–2026): Batches 68–76
                </span>
              </div>
            )}

            {activeStat === 'alumni' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/30">
                  <div className="font-bold text-emerald-300">34% Tech & AI</div>
                  <div className="text-[10px] text-slate-400">Google, Meta, MSFT, AWS</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/30">
                  <div className="font-bold text-emerald-300">26% Healthcare</div>
                  <div className="text-[10px] text-slate-400">Surgeons, Physicians, Dean</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/30">
                  <div className="font-bold text-emerald-300">22% Academics</div>
                  <div className="text-[10px] text-slate-400">BUET, DU, MIT, Harvard</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/30">
                  <div className="font-bold text-emerald-300">18% Civil & Law</div>
                  <div className="text-[10px] text-slate-400">Supreme Court, Governance</div>
                </div>
              </div>
            )}

            {activeStat === 'countries' && (
              <div>
                <p className="text-[11px] text-slate-400 mb-2">
                  Select a chapter to spotlight and rotate the 3D globe to that country:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {NETWORK_NODES.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleSelectChapter(node)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        selectedNode.id === node.id
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                          : 'bg-blue-950/70 hover:bg-blue-900/60 text-slate-300 border border-blue-800/30'
                      }`}
                    >
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{node.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeStat === 'specialists' && (
              <div className="text-xs text-slate-300 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-amber-950/70 border border-amber-800/40 text-amber-200">
                  🩺 210+ FCPS Specialists (Medicine & Surgery)
                </span>
                <span className="px-2.5 py-1 rounded-md bg-amber-950/70 border border-amber-800/40 text-amber-200">
                  🔬 140+ MD / MS Post-Graduate Doctors
                </span>
                <span className="px-2.5 py-1 rounded-md bg-amber-950/70 border border-amber-800/40 text-amber-200">
                  🇬🇧 100+ MRCP, FRCS, USMLE Board Certified
                </span>
              </div>
            )}

            {activeStat === 'brotherhood' && (
              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-rose-950/70 border border-rose-800/40 text-rose-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  Emergency Blood Donor Network (Verified in &lt; 4 mins)
                </span>
                <span className="px-2.5 py-1 rounded-md bg-rose-950/70 border border-rose-800/40 text-rose-200">
                  🌐 Worldwide Diaspora Transit & Distress Assistance
                </span>
              </div>
            )}
          </div>
        )}

        {/* Chapter Quick Bar (Always accessible, compact interactive strip) */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-blue-950/40 border border-blue-800/30 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span className="font-semibold text-white">{selectedNode.name}:</span>
            <span className="text-amber-300 font-mono font-bold">{selectedNode.alumniCount}</span>
            <span className="text-slate-500 hidden sm:inline">({selectedNode.region})</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {/* Quick rotate buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {NETWORK_NODES.slice(0, 5).map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleSelectChapter(node)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    selectedNode.id === node.id
                      ? 'bg-amber-400 text-slate-900 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {node.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Play/Pause globe rotation */}
            <button
              type="button"
              onClick={() => setIsRotating(!isRotating)}
              title={isRotating ? 'Pause globe rotation' : 'Resume globe rotation'}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Exact Closing Statement & Replay */}
        <div className="mt-4 pt-3 border-t border-blue-900/40 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-px w-6 bg-amber-400/60 hidden sm:block" />
            <p className="font-serif italic text-xs sm:text-sm text-amber-200/90 tracking-wide">
              "Once a Notre Damian, Always a Notre Damian."
            </p>
          </div>

          <button
            type="button"
            onClick={handleReplay}
            title="Replay counter animation"
            className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
          >
            <RotateCw className="w-2.5 h-2.5" />
            <span>Replay</span>
          </button>
        </div>
      </div>
    </section>
  );
};
