import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate grayscale versions of the icons
const sizes = [16, 48, 128];

async function generateGrayIcons() {
  for (const size of sizes) {
    const inputPath = path.join(__dirname, 'public', `icon${size}.png`);
    const outputPath = path.join(__dirname, 'public', `icon${size}-gray.png`);
    
    try {
      await sharp(inputPath)
        .grayscale()
        .modulate({ brightness: 0.7 }) // Make it a bit darker
        .toFile(outputPath);
      
      console.log(`Generated ${outputPath}`);
    } catch (err) {
      console.error(`Error generating gray icon for size ${size}:`, err);
    }
  }
}

generateGrayIcons().catch(console.error);