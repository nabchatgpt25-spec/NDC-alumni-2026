import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// SVG definition for the official Notre Dame College emblem
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 380" width="100%" height="100%">
  <defs>
    <!-- Text Paths for arched banners -->
    <path id="topRibbonArc" d="M 38,98 A 190,130 0 0,1 282,98" fill="none" />
    <path id="leftBannerArc" d="M 50,205 C 50,140 70,82 125,78" fill="none" />
    <path id="centerLumenArc" d="M 125,72 C 145,68 175,68 195,72" fill="none" />
    <path id="rightBannerArc" d="M 195,78 C 250,82 270,140 270,205" fill="none" />

    <!-- Fleur-de-lis symbol -->
    <g id="fleur">
      <!-- Central petal -->
      <path d="M 0,-8.5 C -1,-5.5 -2.5,-3 0,0 C 2.5,-3 1,-5.5 0,-8.5 Z" fill="#9C1D54" />
      <path d="M 0,-8 C -0.8,-5.5 -1.8,-3 0,-0.5 C 1.8,-3 0.8,-5.5 0,-8 Z" fill="#A8235C" />
      <!-- Left curved petal -->
      <path d="M -0.5,-1 C -3,-2.5 -6,-2 -5.5,0.5 C -5,2.5 -2.5,2.5 -0.5,1.5 Z" fill="#9C1D54" />
      <!-- Right curved petal -->
      <path d="M 0.5,-1 C 3,-2.5 6,-2 5.5,0.5 C 5,2.5 2.5,2.5 0.5,1.5 Z" fill="#9C1D54" />
      <!-- Horizontal band -->
      <rect x="-3" y="0.8" width="6" height="1.4" rx="0.5" fill="#781440" />
      <!-- Bottom base triangular flare -->
      <path d="M -1.8,2.2 L 1.8,2.2 L 0,4.8 Z" fill="#9C1D54" />
    </g>

    <!-- Paddy tuft symbol -->
    <g id="paddyTuft">
      <path d="M 0,0 C -2,-4 -5,-7 -8,-8 M 0,0 C -1,-5 -2,-9 -2,-11 M 0,0 C 1,-5 2,-9 2,-11 M 0,0 C 2,-4 5,-7 8,-8" stroke="#1E7A38" stroke-width="1.1" stroke-linecap="round" fill="none" />
    </g>

    <!-- Clip paths for shield compartments -->
    <clipPath id="shieldClip">
      <path d="M 68,135 Q 68,260 160,336 Q 252,260 252,135 Z" />
    </clipPath>
    <clipPath id="topPinkClip">
      <path d="M 68,135 L 160,135 L 160,230 L 68,230 Z" />
    </clipPath>
    <clipPath id="topRightClip">
      <path d="M 160,135 L 252,135 L 252,230 L 160,230 Z" />
    </clipPath>
    <clipPath id="bottomBlueClip">
      <path d="M 68,230 L 252,230 L 252,260 Q 252,260 160,336 Q 68,260 68,260 Z" />
    </clipPath>
  </defs>

  <!-- ========================================== -->
  <!-- 1. TOP CURVED BANNER: NOTRE DAME COLLEGE   -->
  <!-- ========================================== -->
  <g id="topRibbon">
    <!-- Ribbon Tail Left (Blue underside & gold fringe) -->
    <!-- Blue fold -->
    <path d="M 40,88 C 28,95 20,105 18,122 C 26,118 36,114 44,112 Z" fill="#6B88B4" stroke="#000" stroke-width="1.2" />
    <!-- Yellow fringe tail -->
    <path d="M 18,122 C 22,126 32,122 40,118 L 44,112 L 32,108 Z" fill="#FFDE00" stroke="#000" stroke-width="1" />
    <line x1="22" y1="123" x2="26" y2="114" stroke="#9E7D00" stroke-width="1.2" />
    <line x1="26" y1="123" x2="30" y2="114" stroke="#9E7D00" stroke-width="1.2" />
    <line x1="30" y1="122" x2="34" y2="113" stroke="#9E7D00" stroke-width="1.2" />
    <line x1="34" y1="120" x2="38" y2="112" stroke="#9E7D00" stroke-width="1.2" />

    <!-- Ribbon Tail Right (Blue underside & gold fringe) -->
    <path d="M 280,88 C 292,95 300,105 302,122 C 294,118 284,114 276,112 Z" fill="#6B88B4" stroke="#000" stroke-width="1.2" />
    <path d="M 302,122 C 298,126 288,122 280,118 L 276,112 L 288,108 Z" fill="#FFDE00" stroke="#000" stroke-width="1" />
    <line x1="298" y1="123" x2="294" y2="114" stroke="#9E7D00" stroke-width="1.2" />
    <line x1="294" y1="123" x2="290" y2="114" stroke="#9E7D00" stroke-width="1.2" />
    <line x1="290" y1="122" x2="286" y2="113" stroke="#9E7D00" stroke-width="1.2" />
    <line x1="286" y1="120" x2="282" y2="112" stroke="#9E7D00" stroke-width="1.2" />

    <!-- Main Yellow Arched Ribbon -->
    <path d="M 32,82 C 72,42 248,42 288,82 L 278,104 C 242,66 78,66 42,104 Z"
          fill="#FFE600" stroke="#000000" stroke-width="1.8" stroke-linejoin="round" />

    <!-- Top Ribbon Text: NOTRE DAME COLLEGE -->
    <text font-family="'Times New Roman', Georgia, serif" font-weight="900" font-size="20.5" fill="#FF0000" letter-spacing="1.5">
      <textPath href="#topRibbonArc" startOffset="50%" text-anchor="middle">
        NOTRE DAME COLLEGE
      </textPath>
    </text>
  </g>

  <!-- ========================================== -->
  <!-- 2. OPEN BOOK: ALPHA (A) & OMEGA (Ω)        -->
  <!-- ========================================== -->
  <g id="openBook" transform="translate(160, 110)">
    <!-- Book Backing / Cover -->
    <path d="M -34,-12 C -20,-17 -4,-13 0,-10 C 4,-13 20,-17 34,-12 L 34,14 C 20,9 4,13 0,16 C -4,13 -20,9 -34,14 Z"
          fill="#1C212B" stroke="#000" stroke-width="1.5" />
    <!-- White Pages Left -->
    <path d="M -32,-10 C -18,-15 -3,-11 0,-8 L 0,13 C -3,10 -18,7 -32,11 Z"
          fill="#FFFFFF" stroke="#8E99A8" stroke-width="0.8" />
    <!-- White Pages Right -->
    <path d="M 0,-8 C 3,-11 18,-15 32,-10 L 32,11 C 18,7 3,10 0,13 Z"
          fill="#FFFFFF" stroke="#8E99A8" stroke-width="0.8" />
    <!-- Spine Line -->
    <line x1="0" y1="-8" x2="0" y2="14" stroke="#4B5563" stroke-width="1.2" />

    <!-- Greek Letters Alpha (A) and Omega (Ω) -->
    <text x="-16" y="5" font-family="'Times New Roman', Georgia, serif" font-weight="bold" font-size="14" fill="#000000" text-anchor="middle">A</text>
    <text x="16" y="5" font-family="'Times New Roman', Georgia, serif" font-weight="bold" font-size="14" fill="#000000" text-anchor="middle">Ω</text>
  </g>

  <!-- ========================================== -->
  <!-- 3. CENTRAL SHIELD & COMPARTMENTS           -->
  <!-- ========================================== -->
  <!-- Base Shield Fill & Contour -->
  <path d="M 68,135 Q 68,260 160,336 Q 252,260 252,135 Z"
        fill="#FFFFFF" stroke="#000000" stroke-width="2.5" stroke-linejoin="round" />

  <!-- Shield Contents (Clipped) -->
  <g clip-path="url(#shieldClip)">
    <!-- 3A. TOP LEFT: PINK WITH 7 FLEURS-DE-LIS -->
    <rect x="68" y="135" width="92" height="95" fill="#EFA3B1" />

    <!-- 7 Fleurs-de-lis in 2-3-2 formation -->
    <g id="fleursGroup">
      <!-- Row 1 (2 fleurs) -->
      <use href="#fleur" x="98" y="157" transform="scale(1.35)" />
      <use href="#fleur" x="126" y="157" transform="scale(1.35)" />

      <!-- Row 2 (3 fleurs) -->
      <use href="#fleur" x="85" y="180" transform="scale(1.35)" />
      <use href="#fleur" x="112" y="180" transform="scale(1.35)" />
      <use href="#fleur" x="139" y="180" transform="scale(1.35)" />

      <!-- Row 3 (2 fleurs) -->
      <use href="#fleur" x="98" y="203" transform="scale(1.35)" />
      <use href="#fleur" x="126" y="203" transform="scale(1.35)" />
    </g>

    <!-- 3B. TOP RIGHT: SKY, RISING SUN, BOAT & PALMS -->
    <rect x="160" y="135" width="92" height="95" fill="#58C5EC" />

    <!-- Rising Sun Rays -->
    <g id="sunRays" stroke="#FFCE00" stroke-width="2.8" opacity="0.95">
      <line x1="228" y1="168" x2="228" y2="137" />
      <line x1="228" y1="168" x2="210" y2="140" />
      <line x1="228" y1="168" x2="194" y2="147" />
      <line x1="228" y1="168" x2="182" y2="158" />
      <line x1="228" y1="168" x2="175" y2="173" />
      <line x1="228" y1="168" x2="246" y2="140" />
      <line x1="228" y1="168" x2="260" y2="152" />
    </g>

    <!-- Rising Sun Semi-Disc -->
    <path d="M 215,168 A 13,13 0 0,1 241,168 Z" fill="#EE3B24" stroke="#000" stroke-width="0.8" />

    <!-- Green Riverbank & Paddy Fields (Right) -->
    <path d="M 195,168 L 255,168 L 255,230 L 190,230 Z" fill="#9AE6B4" />

    <!-- Paddy plants -->
    <use href="#paddyTuft" x="206" y="182" transform="scale(0.8)" />
    <use href="#paddyTuft" x="228" y="185" transform="scale(0.8)" />
    <use href="#paddyTuft" x="246" y="182" transform="scale(0.8)" />
    <use href="#paddyTuft" x="200" y="202" transform="scale(0.8)" />
    <use href="#paddyTuft" x="220" y="205" transform="scale(0.8)" />
    <use href="#paddyTuft" x="242" y="208" transform="scale(0.8)" />
    <use href="#paddyTuft" x="210" y="224" transform="scale(0.8)" />
    <use href="#paddyTuft" x="232" y="225" transform="scale(0.8)" />

    <!-- Left Bank Ground (under palm trees) -->
    <path d="M 160,168 L 195,168 L 190,230 L 160,230 Z" fill="#88D870" />

    <!-- Blue Meandering River -->
    <path d="M 195,168 Q 185,190 160,205 L 160,230 Q 188,212 202,168 Z" fill="#C2E4F6" stroke="#58C5EC" stroke-width="0.8" />

    <!-- Traditional Country Boat (Nouka) -->
    <g id="noukaBoat" transform="translate(185, 192) scale(0.9)">
      <!-- Black Boat Hull -->
      <path d="M -15,4 Q 0,9 15,4 Q 0,6 -15,4 Z" fill="#1C1917" stroke="#000" stroke-width="0.8" />
      <path d="M -15,4 L -18,1 Q -6,4 0,4 Q 6,4 18,1 L 15,4 Z" fill="#1C1917" />
      <!-- Oar / Helm Stick -->
      <line x1="-14" y1="2" x2="-20" y2="7" stroke="#1C1917" stroke-width="1" stroke-linecap="round" />
      <!-- Boat Hood / Chhoi (Purple/Maroon) -->
      <path d="M -4,2 Q 0,-6 6,2 Z" fill="#581C87" stroke="#000" stroke-width="0.7" />
    </g>

    <!-- Two Coconut Palm Trees (Left Bank) -->
    <g id="palmTrees">
      <!-- Tree 1 (Taller, Left) -->
      <!-- Curved Brown Trunk -->
      <path d="M 172,215 Q 170,185 174,160" stroke="#653E1B" stroke-width="3" stroke-linecap="round" fill="none" />
      <!-- Lush Green Palm Fronds -->
      <path d="M 174,160 Q 166,150 156,155" stroke="#15803D" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <path d="M 174,160 Q 164,158 158,168" stroke="#166534" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <path d="M 174,160 Q 172,148 170,142" stroke="#15803D" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <path d="M 174,160 Q 182,148 188,154" stroke="#166534" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <path d="M 174,160 Q 184,158 189,166" stroke="#15803D" stroke-width="2.2" stroke-linecap="round" fill="none" />

      <!-- Tree 2 (Slightly shorter, Right) -->
      <path d="M 183,215 Q 182,192 186,168" stroke="#653E1B" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M 186,168 Q 179,158 173,162" stroke="#15803D" stroke-width="2" stroke-linecap="round" fill="none" />
      <path d="M 186,168 Q 184,156 183,150" stroke="#166534" stroke-width="2" stroke-linecap="round" fill="none" />
      <path d="M 186,168 Q 194,156 198,162" stroke="#15803D" stroke-width="2" stroke-linecap="round" fill="none" />
      <path d="M 186,168 Q 195,165 200,173" stroke="#166534" stroke-width="2" stroke-linecap="round" fill="none" />
    </g>

    <!-- 3C. BOTTOM COMPARTMENT: DEEP SKY BLUE WITH CONGREGATION OF HOLY CROSS EMBLEM -->
    <path d="M 68,230 L 252,230 L 252,260 Q 252,260 160,336 Q 68,260 68,260 Z" fill="#3AA8DF" />

    <!-- Golden Rays behind the Cross -->
    <g id="crossRays" stroke="#FFDF00" stroke-width="3" stroke-linecap="round">
      <line x1="160" y1="270" x2="160" y2="242" />
      <line x1="160" y1="270" x2="182" y2="248" />
      <line x1="160" y1="270" x2="190" y2="270" />
      <line x1="160" y1="270" x2="182" y2="292" />
      <line x1="160" y1="270" x2="160" y2="298" />
      <line x1="160" y1="270" x2="138" y2="292" />
      <line x1="160" y1="270" x2="130" y2="270" />
      <line x1="160" y1="270" x2="138" y2="248" />
    </g>

    <!-- Two Crossed Black Naval Anchors (Holy Cross symbol of hope) -->
    <g id="crossedAnchors" stroke="#000000" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <!-- Anchor 1 (Diagonal Top-Left to Bottom-Right) -->
      <line x1="130" y1="240" x2="188" y2="298" />
      <!-- Ring at top -->
      <circle cx="127" cy="237" r="4" stroke="#000" stroke-width="3.5" fill="none" />
      <!-- Crossbar / Stock -->
      <line x1="139" y1="237" x2="125" y2="251" stroke-width="3.8" />
      <!-- Fluke / Curved Crown at bottom right -->
      <path d="M 172,308 Q 192,306 196,286" stroke-width="4" />
      <polygon points="196,286 200,290 193,293" fill="#000" />
      <polygon points="172,308 176,312 169,315" fill="#000" />

      <!-- Anchor 2 (Diagonal Top-Right to Bottom-Left) -->
      <line x1="190" y1="240" x2="132" y2="298" />
      <!-- Ring at top -->
      <circle cx="193" cy="237" r="4" stroke="#000" stroke-width="3.5" fill="none" />
      <!-- Crossbar / Stock -->
      <line x1="181" y1="237" x2="195" y2="251" stroke-width="3.8" />
      <!-- Fluke / Curved Crown at bottom left -->
      <path d="M 148,308 Q 128,306 124,286" stroke-width="4" />
      <polygon points="124,286 120,290 127,293" fill="#000" />
      <polygon points="148,308 144,312 151,315" fill="#000" />
    </g>

    <!-- Bright Red Latin Cross (Crux Spes Unica) -->
    <g id="latinCross">
      <!-- Vertical Beam -->
      <rect x="154.5" y="240" width="11" height="66" rx="1.5" fill="#FF0000" stroke="#000000" stroke-width="1.6" />
      <!-- Horizontal Beam -->
      <rect x="136" y="255" width="48" height="11" rx="1.5" fill="#FF0000" stroke="#000000" stroke-width="1.6" />
    </g>

    <!-- Black Division Lines between compartments inside shield -->
    <line x1="160" y1="135" x2="160" y2="230" stroke="#000000" stroke-width="2.5" />
    <line x1="68" y1="230" x2="252" y2="230" stroke="#000000" stroke-width="2.5" />
  </g>

  <!-- Re-stroke Shield Outline for razor-sharp edge -->
  <path d="M 68,135 Q 68,260 160,336 Q 252,260 252,135 Z"
        fill="none" stroke="#000000" stroke-width="2.6" stroke-linejoin="round" />

  <!-- ========================================== -->
  <!-- 4. INNER BANNER: DILIGITE LUMEN SAPIENTIAE -->
  <!-- ========================================== -->
  <g id="innerMottoBanner">
    <!-- Left Ribbon Fold & Tail -->
    <path d="M 40,215 L 40,185 C 40,170 52,130 92,100 L 104,118 C 74,142 62,170 62,185 L 62,215 Z"
          fill="#FF9A00" stroke="#000" stroke-width="1.6" />
    <!-- Left Fishtail cutout -->
    <polygon points="40,215 51,202 62,215 62,185 40,185" fill="#FF9A00" stroke="#000" stroke-width="1.6" />

    <!-- Right Ribbon Fold & Tail -->
    <path d="M 280,215 L 280,185 C 280,170 268,130 228,100 L 216,118 C 246,142 258,170 258,185 L 258,215 Z"
          fill="#FF9A00" stroke="#000" stroke-width="1.6" />
    <!-- Right Fishtail cutout -->
    <polygon points="280,215 269,202 258,215 258,185 280,185" fill="#FF9A00" stroke="#000" stroke-width="1.6" />

    <!-- Center Top Arch: LUMEN banner -->
    <path d="M 124,78 C 144,66 176,66 196,78 L 198,102 C 176,90 144,90 122,102 Z"
          fill="#FF9A00" stroke="#000" stroke-width="1.6" />

    <!-- Left Arch: DILIGITE banner bridge -->
    <path d="M 92,100 C 104,90 114,84 124,78 L 122,102 C 114,108 106,112 104,118 Z"
          fill="#FF9A00" stroke="#000" stroke-width="1.6" />

    <!-- Right Arch: SAPIENTIAE banner bridge -->
    <path d="M 196,78 C 206,84 216,90 228,100 L 216,118 C 212,112 206,108 198,102 Z"
          fill="#FF9A00" stroke="#000" stroke-width="1.6" />

    <!-- Banner Texts: DILIGITE, LUMEN, SAPIENTIAE -->
    <text font-family="'Times New Roman', Georgia, serif" font-weight="900" font-size="14.5" fill="#000000" letter-spacing="1.2">
      <!-- LUMEN (Centered Top) -->
      <textPath href="#centerLumenArc" startOffset="50%" text-anchor="middle">
        LUMEN
      </textPath>
    </text>

    <!-- DILIGITE (Left Arm, running upward towards LUMEN) -->
    <text font-family="'Times New Roman', Georgia, serif" font-weight="900" font-size="16" fill="#000000" letter-spacing="1">
      <textPath href="#leftBannerArc" startOffset="52%" text-anchor="middle">
        DILIGITE
      </textPath>
    </text>

    <!-- SAPIENTIAE (Right Arm, running downward from LUMEN) -->
    <text font-family="'Times New Roman', Georgia, serif" font-weight="900" font-size="14.5" fill="#000000" letter-spacing="0.8">
      <textPath href="#rightBannerArc" startOffset="48%" text-anchor="middle">
        SAPIENTIAE
      </textPath>
    </text>
  </g>

  <!-- ========================================== -->
  <!-- 5. BOTTOM TEXT: DHAKA                      -->
  <!-- ========================================== -->
  <text x="160" y="364" font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-size="15" fill="#000000" text-anchor="middle" letter-spacing="3.5">
    DHAKA
  </text>
</svg>`;

async function main() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const srcAssetsDir = path.resolve(process.cwd(), 'src/assets');
  const distDir = path.resolve(process.cwd(), 'dist');

  // 1. Write SVG file to public/ndc-logo.svg
  fs.writeFileSync(path.join(publicDir, 'ndc-logo.svg'), svgContent);
  console.log('Created public/ndc-logo.svg');

  // Also write SVG to src/assets/ndc-logo.svg
  fs.writeFileSync(path.join(srcAssetsDir, 'ndc-logo.svg'), svgContent);
  console.log('Created src/assets/ndc-logo.svg');

  // 2. Render high-resolution PNGs with sharp
  const svgBuffer = Buffer.from(svgContent);

  // 512x512 PNG for high res
  const png512 = await sharp(svgBuffer, { density: 300 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 192x192 PNG for PWA
  const png192 = await sharp(svgBuffer, { density: 300 })
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Save to public/ndc-logo.png
  fs.writeFileSync(path.join(publicDir, 'ndc-logo.png'), png512);
  fs.writeFileSync(path.join(srcAssetsDir, 'ndc-logo.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);

  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'ndc-logo.svg'), svgContent);
    fs.writeFileSync(path.join(distDir, 'ndc-logo.png'), png512);
  }

  console.log('Successfully generated public/ndc-logo.png and all PWA icons!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
