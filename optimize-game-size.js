import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🎮 Order Editing Game Size Optimizer');
console.log('=====================================');

// Check if we have imagemin and ffmpeg available
function checkDependencies() {
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    console.log('✅ FFmpeg found');
  } catch (error) {
    console.log('❌ FFmpeg not found. Install with: brew install ffmpeg');
    console.log('   This is needed to compress audio files.');
  }
  
  try {
    execSync('which convert', { stdio: 'ignore' });
    console.log('✅ ImageMagick found');
  } catch (error) {
    console.log('❌ ImageMagick not found. Install with: brew install imagemagick');
    console.log('   This is needed to compress images.');
  }
}

// Get file sizes
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Analyze current sizes
function analyzeCurrentSizes() {
  console.log('\n📊 Current Asset Sizes:');
  console.log('========================');
  
  const musicDir = 'public/game/Music';
  const backgroundDir = 'public/game/Background';
  
  let totalSize = 0;
  let musicSize = 0;
  let imageSize = 0;
  
  // Check music files
  if (fs.existsSync(musicDir)) {
    const musicFiles = execSync(`find ${musicDir} -name "*.mp3" -type f`).toString().split('\n').filter(f => f);
    console.log(`\n🎵 Music Files (${musicFiles.length} files):`);
    musicFiles.forEach(file => {
      const size = getFileSize(file);
      musicSize += size;
      console.log(`   ${path.basename(file)}: ${formatBytes(size)}`);
    });
    console.log(`   Total Music: ${formatBytes(musicSize)}`);
  }
  
  // Check background images
  if (fs.existsSync(backgroundDir)) {
    const imageFiles = execSync(`find ${backgroundDir} -name "*.png" -o -name "*.jpg" -type f`).toString().split('\n').filter(f => f);
    console.log(`\n🖼️  Background Images (${imageFiles.length} files):`);
    imageFiles.forEach(file => {
      const size = getFileSize(file);
      imageSize += size;
      console.log(`   ${path.basename(file)}: ${formatBytes(size)}`);
    });
    console.log(`   Total Images: ${formatBytes(imageSize)}`);
  }
  
  totalSize = musicSize + imageSize;
  console.log(`\n📦 Total Asset Size: ${formatBytes(totalSize)}`);
  console.log(`💡 Recommended mobile budget: 1.3MB`);
  console.log(`⚠️  Your assets are ${Math.round(totalSize / (1.3 * 1024 * 1024))}x larger than recommended!`);
  
  return { totalSize, musicSize, imageSize };
}

// Optimize audio files
function optimizeAudio() {
  console.log('\n🎵 Optimizing Audio Files...');
  console.log('==============================');
  
  try {
    const musicFiles = execSync(`find public/game/Music -name "*.mp3" -type f`).toString().split('\n').filter(f => f);
    
    musicFiles.forEach(file => {
      if (!file) return;
      
      const originalSize = getFileSize(file);
      const backupFile = file + '.original';
      
      // Create backup if it doesn't exist
      if (!fs.existsSync(backupFile)) {
        fs.copyFileSync(file, backupFile);
      }
      
      // Compress audio: reduce bitrate to 96kbps, mono for background music
      const isRadio = file.includes('OE-Radio');
      const bitrate = isRadio ? '128k' : '96k'; // Radio songs slightly higher quality
      const channels = isRadio ? '2' : '1'; // Radio stereo, background mono
      
      try {
        execSync(`ffmpeg -i "${backupFile}" -b:a ${bitrate} -ac ${channels} -ar 44100 -y "${file}"`, { stdio: 'ignore' });
        const newSize = getFileSize(file);
        const savings = originalSize - newSize;
        console.log(`   ✅ ${path.basename(file)}: ${formatBytes(originalSize)} → ${formatBytes(newSize)} (saved ${formatBytes(savings)})`);
      } catch (error) {
        console.log(`   ❌ Failed to compress ${path.basename(file)}`);
        // Restore original if compression failed
        if (fs.existsSync(backupFile)) {
          fs.copyFileSync(backupFile, file);
        }
      }
    });
  } catch (error) {
    console.log('❌ Error optimizing audio:', error.message);
  }
}

// Optimize images
function optimizeImages() {
  console.log('\n🖼️  Optimizing Images...');
  console.log('=========================');
  
  try {
    const imageFiles = execSync(`find public/game/Background -name "*.png" -o -name "*.jpg" -type f`).toString().split('\n').filter(f => f);
    
    imageFiles.forEach(file => {
      if (!file) return;
      
      const originalSize = getFileSize(file);
      const backupFile = file + '.original';
      
      // Create backup if it doesn't exist
      if (!fs.existsSync(backupFile)) {
        fs.copyFileSync(file, backupFile);
      }
      
      try {
        // Compress images: reduce quality and resize if too large
        const ext = path.extname(file).toLowerCase();
        if (ext === '.png') {
          // PNG: reduce quality and convert to smaller format if possible
          execSync(`convert "${backupFile}" -quality 85 -resize 1920x1080> "${file}"`, { stdio: 'ignore' });
        } else if (ext === '.jpg' || ext === '.jpeg') {
          // JPG: reduce quality
          execSync(`convert "${backupFile}" -quality 75 -resize 1920x1080> "${file}"`, { stdio: 'ignore' });
        }
        
        const newSize = getFileSize(file);
        const savings = originalSize - newSize;
        console.log(`   ✅ ${path.basename(file)}: ${formatBytes(originalSize)} → ${formatBytes(newSize)} (saved ${formatBytes(savings)})`);
      } catch (error) {
        console.log(`   ❌ Failed to compress ${path.basename(file)}`);
        // Restore original if compression failed
        if (fs.existsSync(backupFile)) {
          fs.copyFileSync(backupFile, file);
        }
      }
    });
  } catch (error) {
    console.log('❌ Error optimizing images:', error.message);
  }
}

// Create WebP versions of images
function createWebPVersions() {
  console.log('\n🔄 Creating WebP versions...');
  console.log('=============================');
  
  try {
    const imageFiles = execSync(`find public/game/Background -name "*.png" -o -name "*.jpg" -type f | grep -v ".original"`).toString().split('\n').filter(f => f);
    
    imageFiles.forEach(file => {
      if (!file) return;
      
      const webpFile = file.replace(/\.(png|jpg|jpeg)$/i, '.webp');
      
      try {
        execSync(`convert "${file}" -quality 80 "${webpFile}"`, { stdio: 'ignore' });
        const originalSize = getFileSize(file);
        const webpSize = getFileSize(webpFile);
        console.log(`   ✅ ${path.basename(webpFile)}: ${formatBytes(webpSize)} (${Math.round((webpSize/originalSize)*100)}% of original)`);
      } catch (error) {
        console.log(`   ❌ Failed to create WebP for ${path.basename(file)}`);
      }
    });
  } catch (error) {
    console.log('❌ Error creating WebP versions:', error.message);
  }
}

// Generate loading recommendations
function generateRecommendations() {
  console.log('\n💡 Loading Optimization Recommendations:');
  console.log('=========================================');
  console.log('1. 🎵 Lazy-load radio music - only load when radio is opened');
  console.log('2. 🎮 Preload only essential game music (background + game over)');
  console.log('3. 🖼️  Use WebP images with PNG/JPG fallbacks');
  console.log('4. 📦 Enable Gzip/Brotli compression on your server');
  console.log('5. 🔄 Consider streaming audio instead of downloading all files');
  console.log('6. 📱 Show loading progress bar for better UX');
  console.log('7. 🎯 Load game assets progressively (menu → game → radio)');
}

// Main execution
async function main() {
  checkDependencies();
  
  const before = analyzeCurrentSizes();
  
  console.log('\n🚀 Starting Optimization...');
  console.log('============================');
  
  optimizeAudio();
  optimizeImages();
  createWebPVersions();
  
  console.log('\n📊 Final Results:');
  console.log('==================');
  const after = analyzeCurrentSizes();
  
  const totalSavings = before.totalSize - after.totalSize;
  console.log(`💾 Total savings: ${formatBytes(totalSavings)}`);
  console.log(`📉 Size reduction: ${Math.round((totalSavings/before.totalSize)*100)}%`);
  
  generateRecommendations();
  
  console.log('\n✅ Optimization complete!');
  console.log('\n⚠️  Note: Original files backed up with .original extension');
  console.log('🔄 Run "npm run build" to rebuild with optimized assets');
}

main().catch(console.error); 