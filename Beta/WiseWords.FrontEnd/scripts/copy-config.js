import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../../config');
const targetDir = path.resolve(__dirname, '../public/assets');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy all JSON files
try {
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.json'));

  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${file} to public/assets/`);
  });

  console.log(`✅ Copied ${files.length} config files`);
} catch (error) {
  console.error('❌ Failed to copy config files:', error.message);
  process.exit(1);
}