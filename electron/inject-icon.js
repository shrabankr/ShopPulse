const resedit = require('resedit');
const fs = require('fs');
const path = require('path');

const exePath = path.resolve('dist/ShopPulse-win32-x64/ShopPulse.exe');
const iconPath = path.resolve('electron/icon.ico');

if (!fs.existsSync(exePath)) {
  console.error('Exe not found at:', exePath);
  process.exit(1);
}

if (!fs.existsSync(iconPath)) {
  console.error('Icon not found at:', iconPath);
  process.exit(1);
}

console.log('Loading executable:', exePath);
const exe = resedit.NtExecutable.from(fs.readFileSync(exePath));
const res = resedit.NtExecutableResource.from(exe);

const existingIconGroups = resedit.Resource.IconGroupEntry.fromEntries(res.entries);
console.log('Found existing icon groups:', existingIconGroups.length);

if (existingIconGroups.length === 0) {
  console.error('No icon groups found in executable');
  process.exit(1);
}

const iconFile = resedit.Data.IconFile.from(fs.readFileSync(iconPath));
console.log('Replacing icon group with', iconFile.icons.length, 'icons...');

resedit.Resource.IconGroupEntry.replaceIconsForResource(
  res.entries,
  existingIconGroups[0].id,
  existingIconGroups[0].lang,
  iconFile.icons.map(item => item.data)
);

res.outputResource(exe);
const newBin = Buffer.from(exe.generate());

fs.writeFileSync(exePath, newBin);
console.log('Successfully updated ShopPulse.exe icon! Output size:', newBin.length);
