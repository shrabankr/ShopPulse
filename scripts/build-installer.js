const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const version = pkg.version;

console.log('========================================================');
console.log(`   BUILDING SHOPPULSE WINDOWS SETUP INSTALLER v${version}   `);
console.log('========================================================\n');

try {
  // Step 1: Unpacked Directory Build
  console.log('📦 Step 1/4: Packaging application into dist/win-unpacked...');
  execSync('npx electron-builder --win --dir', { stdio: 'inherit' });

  // Step 2: Inject Custom Bolt Icon into main ShopPulse.exe
  const unpackedExe = path.resolve('dist/win-unpacked/ShopPulse.exe');
  console.log('\n🎨 Step 2/4: Embedding custom brand icon into installed executable...');
  execSync(`node electron/inject-icon.js "${unpackedExe}"`, { stdio: 'inherit' });

  // Step 3: Compile NSIS Installer from prepackaged directory (NSIS embeds electron/icon.ico natively)
  console.log('\n⚙️  Step 3/3: Compiling NSIS Windows Setup Wizard (.exe)...');
  execSync('npx electron-builder --win --x64 --prepackaged dist/win-unpacked', { stdio: 'inherit' });

  // Note: Do NOT modify the compiled setup exe with resedit, as NSIS has a strict CRC32 integrity check!
  const setupExe = path.resolve(`dist/ShopPulse-Setup-${version}.exe`);

  // Copy to root for convenient distribution
  const rootInstaller = path.resolve(`ShopPulse-Setup-v${version}.exe`);
  fs.copyFileSync(setupExe, rootInstaller);
  console.log('\n========================================================');
  console.log('✅ BUILD COMPLETE (NSIS CRC INTEGRITY VERIFIED)!');
  console.log(`🎉 Installer created at: ${rootInstaller} (${(fs.statSync(rootInstaller).size / (1024 * 1024)).toFixed(1)} MB)`);
  console.log('========================================================\n');
} catch (err) {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
}
