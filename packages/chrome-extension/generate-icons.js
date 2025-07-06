import sharp from 'sharp';
import { promises as fs } from 'fs';

// Create a simple blue square with white lines
async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.1875}" fill="#2196F3"/>
      <g stroke="white" stroke-width="${size * 0.0625}" stroke-linecap="round">
        <path d="M${size * 0.25} ${size * 0.375}h${size * 0.5}"/>
        <path d="M${size * 0.25} ${size * 0.5}h${size * 0.5}"/>
        <path d="M${size * 0.25} ${size * 0.625}h${size * 0.375}"/>
      </g>
      <circle cx="${size * 0.75}" cy="${size * 0.625}" r="${size * 0.125}" fill="#4CAF50"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/icon${size}.png`);
}

// Generate icons
Promise.all([
  generateIcon(16),
  generateIcon(48),
  generateIcon(128)
]).then(() => {
  console.log('Icons generated successfully!');
}).catch(console.error);