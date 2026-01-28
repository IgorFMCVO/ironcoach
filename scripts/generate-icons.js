// scripts/generate-icons.js
// Execute: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// SVG base do ícone
const createSvg = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="108" fill="url(#gradient)"/>
  <text x="256" y="340" font-family="Arial, Helvetica, sans-serif" font-size="280" font-weight="900" fill="white" text-anchor="middle">I</text>
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF3B30"/>
      <stop offset="100%" stop-color="#FF6347"/>
    </linearGradient>
  </defs>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Criar diretório se não existir
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Salvar SVGs (para conversão manual se necessário)
sizes.forEach(size => {
  const svg = createSvg(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`✓ Created ${filename}`);
});

console.log('\n📱 SVGs criados! Para converter para PNG:');
console.log('   - Use https://cloudconvert.com/svg-to-png');
console.log('   - Ou instale sharp: npm install sharp');
console.log('   - Ou use ImageMagick: convert icon.svg icon.png');
