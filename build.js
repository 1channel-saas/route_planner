const fs = require('fs');
const path = require('path');

// Create dist directory
const outputDir = path.join(__dirname, 'dist');
fs.mkdirSync(outputDir, { recursive: true });

// Copy public directory contents to dist
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy all files from public to dist
const publicDir = path.join(__dirname, 'public');
fs.readdirSync(publicDir).forEach(file => {
  copyRecursive(path.join(publicDir, file), path.join(outputDir, file));
});

console.log('Build completed! Files copied to dist/');