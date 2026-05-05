import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '..', 'icons');

// NES Super Mario Bros palette
const COLORS = {
  '.': [0,    0,    0,    0  ], // transparent
  'K': [0,    0,    0,    255], // black outline
  'D': [0,    0x78, 0,    255], // #007800 dark shadow
  'M': [0,    0xB8, 0,    255], // #00B800 mid body
  'L': [0x58, 0xF8, 0x98, 255], // #58F898 light highlight
};

// 16x16 master grid — rows 0-4: full-width lip, rows 5-15: narrower shaft
const GRID = [
  'KKKKKKKKKKKKKKKK',
  'KLLMMMMMMMMMMDDK',
  'KLMMMMMMMMMMMMDK',
  'KLMMMMMMMMMMMMDK',
  'KKKKKKKKKKKKKKKK',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KLMMMMMMMMMMDK.',
  '.KKKKKKKKKKKKKK.',
];

for (const size of [16, 48, 128]) {
  const scale = size / 16;
  const png = new PNG({ width: size, height: size });

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const [r, g, b, a] = COLORS[GRID[Math.floor(py / scale)][Math.floor(px / scale)]];
      const i = (py * size + px) * 4;
      png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = a;
    }
  }

  const outPath = path.join(ICONS_DIR, `icon${size}.png`);
  await new Promise((resolve, reject) =>
    png.pack().pipe(fs.createWriteStream(outPath)).on('finish', resolve).on('error', reject)
  );
  console.log(`Wrote icon${size}.png`);
}
