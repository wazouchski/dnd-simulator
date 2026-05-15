const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");
const iconPngPath = path.join(buildDir, "icon.png");
const iconIcoPath = path.join(buildDir, "icon.ico");
const sizes = [256, 128, 64, 48, 32, 16];

function iconSvg(size) {
  const scale = size / 256;
  const fontSize = Math.max(18, Math.round(66 * scale));
  const smallFontSize = Math.max(8, Math.round(23 * scale));
  const stroke = Math.max(1.4, 3.2 * scale);
  const glow = Math.max(2, 7 * scale);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="bg" cx="50%" cy="48%" r="64%">
          <stop offset="0%" stop-color="#16245f"/>
          <stop offset="48%" stop-color="#080b25"/>
          <stop offset="100%" stop-color="#02040a"/>
        </radialGradient>
        <linearGradient id="edge" x1="17%" y1="16%" x2="83%" y2="84%">
          <stop offset="0%" stop-color="#58f4ff"/>
          <stop offset="46%" stop-color="#2d78ff"/>
          <stop offset="72%" stop-color="#d84bff"/>
          <stop offset="100%" stop-color="#ff66ef"/>
        </linearGradient>
        <filter id="outerGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="${glow}" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.13 0 0 0 0 0.75 0 0 0 0 1 0 0 0 0.95 0"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="pinkGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${Math.max(1.5, 4 * scale)}" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1 0 0 0 0 0.15 0 0 0 0 0.95 0 0 0 0.85 0"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="${size}" height="${size}" rx="${Math.round(44 * scale)}" fill="url(#bg)"/>
      <circle cx="${128 * scale}" cy="${126 * scale}" r="${94 * scale}" fill="#0b1648" opacity="0.7"/>
      <g filter="url(#outerGlow)" stroke-linecap="round" stroke-linejoin="round">
        <path d="M ${128 * scale} ${23 * scale} L ${221 * scale} ${88 * scale} L ${186 * scale} ${212 * scale} L ${70 * scale} ${212 * scale} L ${35 * scale} ${88 * scale} Z" fill="#101b59" fill-opacity="0.68" stroke="url(#edge)" stroke-width="${stroke}"/>
        <path d="M ${128 * scale} ${23 * scale} L ${100 * scale} ${98 * scale} L ${35 * scale} ${88 * scale}" fill="none" stroke="#72f6ff" stroke-width="${stroke * 0.7}" opacity="0.92"/>
        <path d="M ${128 * scale} ${23 * scale} L ${156 * scale} ${98 * scale} L ${221 * scale} ${88 * scale}" fill="none" stroke="#c458ff" stroke-width="${stroke * 0.7}" opacity="0.92"/>
        <path d="M ${35 * scale} ${88 * scale} L ${100 * scale} ${98 * scale} L ${70 * scale} ${212 * scale}" fill="none" stroke="#58f4ff" stroke-width="${stroke * 0.72}" opacity="0.9"/>
        <path d="M ${221 * scale} ${88 * scale} L ${156 * scale} ${98 * scale} L ${186 * scale} ${212 * scale}" fill="none" stroke="#ff66ef" stroke-width="${stroke * 0.72}" opacity="0.9"/>
        <path d="M ${100 * scale} ${98 * scale} L ${128 * scale} ${169 * scale} L ${156 * scale} ${98 * scale}" fill="none" stroke="#e6edff" stroke-width="${stroke * 0.58}" opacity="0.82"/>
        <path d="M ${70 * scale} ${212 * scale} L ${128 * scale} ${169 * scale} L ${186 * scale} ${212 * scale}" fill="none" stroke="#ba6bff" stroke-width="${stroke * 0.78}" opacity="0.95"/>
      </g>
      <g font-family="Georgia, 'Times New Roman', serif" text-anchor="middle" fill="#f4edff" filter="url(#pinkGlow)">
        <text x="${128 * scale}" y="${151 * scale}" font-size="${fontSize}" font-weight="700">20</text>
        <text x="${79 * scale}" y="${122 * scale}" font-size="${smallFontSize}" transform="rotate(-17 ${79 * scale} ${122 * scale})">8</text>
        <text x="${178 * scale}" y="${122 * scale}" font-size="${smallFontSize}" transform="rotate(17 ${178 * scale} ${122 * scale})">14</text>
        <text x="${101 * scale}" y="${194 * scale}" font-size="${smallFontSize}" transform="rotate(-28 ${101 * scale} ${194 * scale})">10</text>
        <text x="${157 * scale}" y="${194 * scale}" font-size="${smallFontSize}" transform="rotate(28 ${157 * scale} ${194 * scale})">16</text>
      </g>
    </svg>
  `;
}

function createIco(pngEntries) {
  const headerSize = 6;
  const entrySize = 16;
  const imageOffset = headerSize + pngEntries.length * entrySize;
  let offset = imageOffset;
  const header = Buffer.alloc(imageOffset);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngEntries.length, 4);

  pngEntries.forEach((entry, index) => {
    const cursor = headerSize + index * entrySize;
    header.writeUInt8(entry.size >= 256 ? 0 : entry.size, cursor);
    header.writeUInt8(entry.size >= 256 ? 0 : entry.size, cursor + 1);
    header.writeUInt8(0, cursor + 2);
    header.writeUInt8(0, cursor + 3);
    header.writeUInt16LE(1, cursor + 4);
    header.writeUInt16LE(32, cursor + 6);
    header.writeUInt32LE(entry.buffer.length, cursor + 8);
    header.writeUInt32LE(offset, cursor + 12);
    offset += entry.buffer.length;
  });

  return Buffer.concat([header, ...pngEntries.map((entry) => entry.buffer)]);
}

async function main() {
  fs.mkdirSync(buildDir, { recursive: true });

  const pngEntries = [];
  for (const size of sizes) {
    const buffer = await sharp(Buffer.from(iconSvg(size))).png().toBuffer();
    pngEntries.push({ size, buffer });

    if (size === 256) {
      fs.writeFileSync(iconPngPath, buffer);
    }
  }

  fs.writeFileSync(iconIcoPath, createIco(pngEntries));
  console.log(`Generated ${path.relative(root, iconIcoPath)} and ${path.relative(root, iconPngPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
