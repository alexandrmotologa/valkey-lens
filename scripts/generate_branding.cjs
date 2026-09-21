const fs = require('fs');
const path = require('path');
const { Resvg } = require('B:/workgit/parquet-lens/node_modules/@resvg/resvg-js');

function buildLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <!-- Gradients -->
    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <linearGradient id="slate-body-light" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>

    <linearGradient id="slate-body-mid" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>

    <linearGradient id="slate-body-dark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0b0f19"/>
    </linearGradient>

    <linearGradient id="titanium-muzzle" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>

    <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.16" />
    </filter>
  </defs>

  <!-- Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#subtle-shadow)">

      <!-- Hexagonal Architectural Gateway -->
      <polygon points="
        0,-390
        338,-195
        338,195
        0,390
        -338,195
        -338,-195
      " fill="none" stroke="#0f172a" stroke-width="40" stroke-linejoin="round" />

      <!-- Inner Dashed Cyan Accent Hexagon -->
      <polygon points="
        0,-355
        307,-177
        307,177
        0,355
        -307,177
        -307,-177
      " fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.45" stroke-dasharray="16, 12" />

      <!-- Watertight Base Silhouette for Apex Lynx -->
      <path d="
        M 0 -290
        L 75 -250
        L 135 -345
        L 165 -360
        L 160 -290
        L 185 -160
        L 245 -40
        L 270 90
        L 220 180
        L 150 255
        L 90 280
        L 0 295
        L -90 280
        L -150 255
        L -220 180
        L -270 90
        L -245 -40
        L -185 -160
        L -160 -290
        L -165 -360
        L -135 -345
        L -75 -250
        Z
      " fill="#0b0f19" />

      <!-- Lynx Ear Tuft Accents (Top Brush) -->
      <polygon points="135,-345 165,-360 160,-290 145,-305" fill="#00f5ff" opacity="0.9" />
      <polygon points="-135,-345 -165,-360 -160,-290 -145,-305" fill="#00f5ff" opacity="0.9" />

      <!-- Crown & Brow Facets -->
      <polygon points="0,-290 75,-250 45,-190 0,-215" fill="url(#slate-body-light)" />
      <polygon points="0,-290 -75,-250 -45,-190 0,-215" fill="url(#slate-body-mid)" />

      <polygon points="75,-250 145,-305 130,-210 45,-190" fill="url(#slate-body-mid)" />
      <polygon points="-75,-250 -145,-305 -130,-210 -45,-190" fill="url(#slate-body-dark)" />

      <!-- Outer Ear Structure -->
      <polygon points="145,-305 160,-290 185,-160 130,-210" fill="url(#slate-body-dark)" />
      <polygon points="-145,-305 -160,-290 -185,-160 -130,-210" fill="url(#slate-body-dark)" />

      <!-- Inner Ear Cyan Aperture Cavity -->
      <polygon points="75,-250 130,-210 100,-185" fill="#00f5ff" opacity="0.25" />
      <polygon points="-75,-250 -130,-210 -100,-185" fill="#00f5ff" opacity="0.18" />

      <!-- Forehead & Center Brow (Observability Core) -->
      <polygon points="0,-215 45,-190 0,-115" fill="url(#slate-body-light)" />
      <polygon points="0,-215 -45,-190 0,-115" fill="url(#slate-body-mid)" />

      <polygon points="45,-190 100,-185 85,-105 0,-115" fill="url(#slate-body-mid)" />
      <polygon points="-45,-190 -100,-185 -85,-105 0,-115" fill="url(#slate-body-dark)" />

      <!-- Temple & Upper Cheekbones -->
      <polygon points="100,-185 185,-160 170,-70 85,-105" fill="url(#slate-body-light)" />
      <polygon points="-100,-185 -185,-160 -170,-70 -85,-105" fill="url(#slate-body-dark)" />

      <polygon points="185,-160 245,-40 180,-10 170,-70" fill="url(#slate-body-mid)" />
      <polygon points="-185,-160 -245,-40 -180,-10 -170,-70" fill="url(#slate-body-dark)" />

      <!-- Mid Bridge & Nose Core -->
      <polygon points="0,-115 40,-75 0,15" fill="url(#slate-body-light)" />
      <polygon points="0,-115 -40,-75 0,15" fill="url(#slate-body-mid)" />

      <!-- Almond Predator Eyes (Observability Lens Optics) -->
      <!-- Left Eye Socket -->
      <polygon points="-40,-75 -85,-105 -135,-65 -80,-45" fill="#0b0f19" />
      <!-- Left Glowing Cyan Eye -->
      <polygon points="-48,-70 -82,-92 -125,-65 -78,-50" fill="url(#cyan-glow)" />
      <!-- Left Aperture Pupil & Focus -->
      <polygon points="-75,-78 -88,-70 -78,-62" fill="#0b0f19" />
      <circle cx="-82" cy="-70" r="4" fill="#ffffff" />

      <!-- Right Eye Socket -->
      <polygon points="40,-75 85,-105 135,-65 80,-45" fill="#0b0f19" />
      <!-- Right Glowing Cyan Eye -->
      <polygon points="48,-70 82,-92 125,-65 78,-50" fill="url(#cyan-glow)" />
      <!-- Right Aperture Pupil & Focus -->
      <polygon points="75,-78 88,-70 78,-62" fill="#0b0f19" />
      <circle cx="82" cy="-70" r="4" fill="#ffffff" />

      <!-- Under-Eye Geometric Facets -->
      <polygon points="40,-75 80,-45 45,-5 0,15" fill="url(#slate-body-light)" />
      <polygon points="-40,-75 -80,-45 -45,-5 0,15" fill="url(#slate-body-mid)" />

      <polygon points="80,-45 135,-65 140,15 45,-5" fill="url(#slate-body-mid)" />
      <polygon points="-80,-45 -135,-65 -140,15 -45,-5" fill="url(#slate-body-dark)" />

      <!-- Wide Lynx Flared Cheek Ruffs (Signature Field Mark) -->
      <polygon points="170,-70 180,-10 245,-40 270,90 190,75" fill="url(#slate-body-light)" />
      <polygon points="-170,-70 -180,-10 -245,-40 -270,90 -190,75" fill="url(#slate-body-dark)" />

      <polygon points="180,-10 140,15 190,75" fill="url(#slate-body-mid)" />
      <polygon points="-180,-10 -140,15 -190,75" fill="url(#slate-body-dark)" />

      <polygon points="190,75 270,90 220,180 160,150" fill="url(#slate-body-mid)" />
      <polygon points="-190,75 -270,90 -220,180 -160,150" fill="url(#slate-body-dark)" />

      <!-- Geometric Slate Muzzle (No Buck Teeth, Horizontal Refinement) -->
      <!-- Nose Leather -->
      <polygon points="0,15 28,38 0,55 -28,38" fill="#0f172a" />
      <polygon points="0,22 18,36 0,48 -18,36" fill="#00f5ff" opacity="0.75" />

      <!-- Whisker Pads & Muzzle Slates -->
      <polygon points="0,55 28,38 75,55 45,100 0,95" fill="url(#titanium-muzzle)" />
      <polygon points="0,55 -28,38 -75,55 -45,100 0,95" fill="url(#titanium-muzzle)" />

      <polygon points="28,38 45,-5 140,15 110,95 75,55" fill="url(#slate-body-light)" />
      <polygon points="-28,38 -45,-5 -140,15 -110,95 -75,55" fill="url(#slate-body-mid)" />

      <!-- Chin & Lower Ruff Structure -->
      <polygon points="0,95 45,100 25,145 0,155" fill="url(#slate-body-mid)" />
      <polygon points="0,95 -45,100 -25,145 0,155" fill="url(#slate-body-dark)" />

      <polygon points="45,100 110,95 125,170 25,145" fill="url(#slate-body-mid)" />
      <polygon points="-45,100 -110,95 -125,170 -25,145" fill="url(#slate-body-dark)" />

      <polygon points="110,95 160,150 125,170" fill="url(#slate-body-dark)" />
      <polygon points="-110,95 -160,150 -125,170" fill="url(#slate-body-dark)" />

      <!-- Neck & Chest Obsidian Armor (Data Flow Vectors) -->
      <polygon points="0,155 25,145 75,220 0,250" fill="url(#slate-body-light)" />
      <polygon points="0,155 -25,145 -75,220 0,250" fill="url(#slate-body-mid)" />

      <polygon points="25,145 125,170 150,255 75,220" fill="url(#slate-body-mid)" />
      <polygon points="-25,145 -125,170 -150,255 -75,220" fill="url(#slate-body-dark)" />

      <polygon points="125,170 220,180 150,255" fill="url(#slate-body-dark)" />
      <polygon points="-125,170 -220,180 -150,255" fill="url(#slate-body-dark)" />

      <!-- Lower Hex Apex Vane -->
      <polygon points="0,250 75,220 90,280 0,295" fill="url(#slate-body-mid)" />
      <polygon points="0,250 -75,220 -90,280 0,295" fill="url(#slate-body-dark)" />
      <polygon points="75,220 150,255 90,280" fill="url(#slate-body-dark)" />
      <polygon points="-75,220 -150,255 -90,280" fill="url(#slate-body-dark)" />

      <!-- Subtle Cyan Focus Ring on Forehead (RESP3 Engine Pulse) -->
      <circle cx="0" cy="-115" r="8" fill="none" stroke="#00f5ff" stroke-width="2.5" opacity="0.8" />
      <circle cx="0" cy="-115" r="3" fill="#00f5ff" opacity="0.9" />
    </g>
  </g>
</svg>`;
}

async function main() {
  const docsImagesDir = path.join(__dirname, '..', 'docs', 'images');
  if (!fs.existsSync(docsImagesDir)) {
    fs.mkdirSync(docsImagesDir, { recursive: true });
  }

  const svg = buildLogoSvg();
  const svgPath = path.join(docsImagesDir, 'logo.svg');
  const pngPath = path.join(docsImagesDir, 'logo.png');

  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log('Saved SVG to:', svgPath);

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 }
  });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(pngPath, pngData);
  console.log('Saved PNG to:', pngPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
