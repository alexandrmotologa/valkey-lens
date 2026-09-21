const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

function buildLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <!-- Gradients for Volumetric Lighting & Optics -->
    <linearGradient id="cyan-iris" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <linearGradient id="tuft-glow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#00f5ff"/>
    </linearGradient>

    <linearGradient id="facet-lit" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>

    <linearGradient id="facet-bright" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>

    <linearGradient id="facet-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>

    <linearGradient id="facet-deep" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#06090e"/>
    </linearGradient>

    <filter id="luxury-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.16" />
    </filter>
  </defs>

  <!-- Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#luxury-shadow)">

      <!-- Hexagonal Architectural Gateway (Valkey 16,384 Hash Slot Topology) -->
      <polygon points="
        0,-410
        355,-205
        355,205
        0,410
        -355,205
        -355,-205
      " fill="none" stroke="#0f172a" stroke-width="36" stroke-linejoin="round" />

      <!-- Inner Telemetry Scan Ring -->
      <polygon points="
        0,-375
        325,-187
        325,187
        0,375
        -325,187
        -325,-187
      " fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.45" stroke-dasharray="16, 12" />

      <!-- 1. Solid Watertight Base Silhouette: Nordic Valkey Lynx -->
      <path d="
        M 0,-255
        L 68,-230
        L 125,-245
        L 190,-415
        L 205,-440
        L 218,-350
        L 248,-185
        L 288,-70
        L 328,25
        L 298,90
        L 318,155
        L 248,240
        L 120,315
        L 0,340
        L -120,315
        L -248,240
        L -318,155
        L -298,90
        L -328,25
        L -288,-70
        L -248,-185
        L -218,-350
        L -205,-440
        L -190,-415
        L -125,-245
        L -68,-230
        Z
      " fill="#070a10" />

      <!-- 2. Ear Tufts: Iconic Nordic Lynx Feathers -->
      <!-- Right Ear Tuft (Lit side) -->
      <polygon points="125,-245 190,-415 205,-440 170,-325" fill="#0284c7" />
      <polygon points="190,-415 205,-440 218,-350" fill="url(#tuft-glow)" />
      <polygon points="170,-325 205,-440 218,-350" fill="#0f172a" />

      <!-- Left Ear Tuft (Shadow side) -->
      <polygon points="-125,-245 -190,-415 -205,-440 -170,-325" fill="#0369a1" />
      <polygon points="-190,-415 -205,-440 -218,-350" fill="#0284c7" />
      <polygon points="-170,-325 -205,-440 -218,-350" fill="#06090e" />

      <!-- Ear Shells -->
      <polygon points="125,-245 170,-325 218,-350 195,-215" fill="url(#facet-shadow)" />
      <polygon points="125,-245 195,-215 140,-175" fill="url(#facet-lit)" />
      <polygon points="140,-175 195,-215 170,-130" fill="#00f5ff" opacity="0.25" />

      <polygon points="-125,-245 -170,-325 -218,-350 -195,-215" fill="url(#facet-deep)" />
      <polygon points="-125,-245 -195,-215 -140,-175" fill="url(#facet-shadow)" />
      <polygon points="-140,-175 -195,-215 -170,-130" fill="#0284c7" opacity="0.2" />

      <!-- Crown & Brow Plates -->
      <polygon points="0,-255 68,-230 65,-155 0,-175" fill="url(#facet-lit)" />
      <polygon points="0,-255 -68,-230 -65,-155 0,-175" fill="url(#facet-shadow)" />

      <polygon points="68,-230 125,-245 140,-175 65,-155" fill="url(#facet-bright)" />
      <polygon points="-68,-230 -125,-245 -140,-175 -65,-155" fill="url(#facet-deep)" />

      <!-- Forehead Central Diamond & Lens Telemetry Sensor -->
      <polygon points="0,-175 65,-155 55,-90 0,-110" fill="#1e293b" />
      <polygon points="0,-175 -65,-155 -55,-90 0,-110" fill="#0f172a" />
      <polygon points="0,-110 55,-90 0,-50 -55,-90" fill="#0b0f19" />

      <!-- Concentric Telemetry Lens Aperture (The Observability Eye) -->
      <circle cx="0" cy="-90" r="16" fill="#070a10" stroke="#00f5ff" stroke-width="4" />
      <circle cx="0" cy="-90" r="8" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
      <circle cx="0" cy="-90" r="3.5" fill="#00f5ff" />

      <!-- Temples & Orbital Rims -->
      <polygon points="140,-175 248,-185 195,-105" fill="url(#facet-lit)" />
      <polygon points="65,-155 140,-175 195,-105 130,-80" fill="url(#facet-bright)" />

      <polygon points="-140,-175 -248,-185 -195,-105" fill="url(#facet-deep)" />
      <polygon points="-65,-155 -140,-175 -195,-105 -130,-80" fill="url(#facet-shadow)" />

      <!-- Brow Ridge (Imparts Focused Predatory Cant) -->
      <polygon points="55,-90 130,-80 142,-55 48,-35" fill="#1e293b" />
      <polygon points="-55,-90 -130,-80 -142,-55 -48,-35" fill="#0f172a" />

      <!-- ================= PREDATOR OPTICS (ALMOND SHAPE) ================= -->
      <!-- Right Eye Snug Socket Rim -->
      <path d="
        M 46,-30
        Q 95,-60 144,-50
        Q 95,-12 46,-30
        Z
      " fill="#070a10" />
      <!-- Right Eye Almond Sclera & Iris (Electric Cyan) -->
      <path d="
        M 52,-32
        Q 95,-55 138,-47
        Q 95,-18 52,-32
        Z
      " fill="url(#cyan-iris)" />
      <!-- Right Slit Pupil (Piercing Predator Vertical Eye) -->
      <polygon points="90,-50 98,-48 96,-25 88,-27" fill="#070a10" />
      <!-- Specular Highlight Point -->
      <circle cx="84" cy="-40" r="2.5" fill="#ffffff" />

      <!-- Left Eye Snug Socket Rim -->
      <path d="
        M -46,-30
        Q -95,-60 -144,-50
        Q -95,-12 -46,-30
        Z
      " fill="#06090e" />
      <!-- Left Eye Almond Sclera & Iris (Electric Cyan) -->
      <path d="
        M -52,-32
        Q -95,-55 -138,-47
        Q -95,-18 -52,-32
        Z
      " fill="url(#cyan-iris)" />
      <!-- Left Slit Pupil -->
      <polygon points="-90,-50 -98,-48 -96,-25 -88,-27" fill="#06090e" />
      <!-- Specular Highlight Point -->
      <circle cx="-84" cy="-40" r="2.5" fill="#ffffff" />

      <!-- Upper Cheekbone directly under eyes -->
      <polygon points="46,-30 144,-50 140,-15 95,15 45,35 35,-10" fill="url(#facet-lit)" />
      <polygon points="-46,-30 -144,-50 -140,-15 -95,15 -45,35 -35,-10" fill="url(#facet-shadow)" />

      <!-- ================= NOSE & SNOUT ================= -->
      <!-- Nose Bridge -->
      <polygon points="0,-50 45,-48 35,35 0,25" fill="url(#facet-lit)" />
      <polygon points="0,-50 -45,-48 -35,35 0,25" fill="url(#facet-shadow)" />

      <!-- Nasal Flanks -->
      <polygon points="45,-48 50,-18 95,20 35,35" fill="url(#facet-bright)" />
      <polygon points="-45,-48 -50,-18 -95,20 -35,35" fill="url(#facet-deep)" />

      <!-- Muzzle & Whisker Pads (Refined Lateral Slate Planes, No Buck Teeth) -->
      <polygon points="0,25 35,35 48,70 0,60" fill="#64748b" />
      <polygon points="0,25 -35,35 -48,70 0,60" fill="#334155" />

      <polygon points="35,35 95,20 115,75 48,70" fill="#475569" />
      <polygon points="-35,35 -95,20 -115,75 -48,70" fill="#1e293b" />

      <!-- Compact Obsidian Nose Tip with Cyan Accent Underline -->
      <polygon points="0,60 26,62 0,85 -26,62" fill="#0b0f19" />
      <polygon points="0,60 22,62 0,80 -22,62" fill="#070a10" stroke="#00f5ff" stroke-width="1.8" />

      <!-- Whisker Pad Lateral Expansion -->
      <polygon points="0,85 26,62 48,70 95,100 48,130 0,110" fill="#475569" />
      <polygon points="0,85 -26,62 -48,70 -95,100 -48,130 0,110" fill="#1e293b" />

      <polygon points="48,70 115,75 150,135 95,100" fill="#64748b" />
      <polygon points="-48,70 -115,75 -150,135 -95,100" fill="#0f172a" />

      <!-- ================= FLARED ZYGOMATIC CHEEKS (LYNX RUFFS) ================= -->
      <!-- Right Flared Fur Spikes -->
      <polygon points="195,-105 248,-185 288,-70 215,-25" fill="url(#facet-shadow)" />
      <polygon points="130,-80 195,-105 215,-25 145,-45" fill="url(#facet-lit)" />

      <polygon points="215,-25 288,-70 328,25 235,45" fill="url(#facet-bright)" />
      <polygon points="145,-45 215,-25 235,45 135,-15" fill="url(#facet-lit)" />

      <polygon points="135,-15 235,45 240,115 95,20" fill="url(#facet-shadow)" />
      <polygon points="235,45 328,25 298,90 240,115" fill="url(#facet-bright)" />

      <polygon points="240,115 298,90 318,155 220,185" fill="url(#facet-lit)" />
      <polygon points="95,20 240,115 220,185 150,135" fill="url(#facet-bright)" />
      <polygon points="150,135 220,185 248,240 130,225" fill="url(#facet-shadow)" />

      <!-- Left Flared Fur Spikes -->
      <polygon points="-195,-105 -248,-185 -288,-70 -215,-25" fill="url(#facet-deep)" />
      <polygon points="-130,-80 -195,-105 -215,-25 -145,-45" fill="url(#facet-shadow)" />

      <polygon points="-215,-25 -288,-70 -328,25 -235,45" fill="url(#facet-shadow)" />
      <polygon points="-145,-45 -215,-25 -235,45 -135,-15" fill="url(#facet-deep)" />

      <polygon points="-135,-15 -235,45 -240,115 -95,20" fill="url(#facet-deep)" />
      <polygon points="-235,45 -328,25 -298,90 -240,115" fill="url(#facet-shadow)" />

      <polygon points="-240,115 -298,90 -318,155 -220,185" fill="url(#facet-shadow)" />
      <polygon points="-95,20 -240,115 -220,185 -150,135" fill="url(#facet-deep)" />
      <polygon points="-150,135 -220,185 -248,240 -130,225" fill="url(#facet-deep)" />

      <!-- ================= CHIN & LOWER JAW ================= -->
      <!-- Chin Median -->
      <polygon points="0,110 48,130 35,185 0,170" fill="url(#facet-lit)" />
      <polygon points="0,110 -48,130 -35,185 0,170" fill="url(#facet-deep)" />

      <polygon points="48,130 95,100 150,135 130,225 75,200 35,185" fill="url(#facet-bright)" />
      <polygon points="-48,130 -95,100 -150,135 -130,225 -75,200 -35,185" fill="url(#facet-deep)" />

      <!-- Chin Taper & Apex -->
      <polygon points="0,170 35,185 45,265 0,285" fill="url(#facet-shadow)" />
      <polygon points="0,170 -35,185 -45,265 0,285" fill="url(#facet-deep)" />

      <polygon points="35,185 75,200 130,225 120,315 55,295 45,265" fill="url(#facet-shadow)" />
      <polygon points="-35,185 -75,200 -130,225 -120,315 -55,295 -45,265" fill="url(#facet-deep)" />

      <polygon points="0,285 55,295 120,315 0,340" fill="url(#facet-shadow)" />
      <polygon points="0,285 -55,295 -120,315 0,340" fill="url(#facet-deep)" />

      <!-- Cyan Inlay Core (Active Shard Node) -->
      <polygon points="0,205 18,228 0,250 -18,228" fill="url(#cyan-iris)" />
      <circle cx="0" cy="228" r="3" fill="#ffffff" />

    </g>
  </g>
</svg>`;
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'docs', 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svg = buildLogoSvg();
  const svgPath = path.join(outputDir, 'logo.svg');
  const pngPath = path.join(outputDir, 'logo.png');

  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log('Written SVG to', svgPath);

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 }
  });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(pngPath, pngData);
  console.log('Rendered 1024x1024 PNG to', pngPath, '(' + pngData.length + ' bytes)');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
