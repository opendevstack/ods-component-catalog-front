// tools/generate-icons.ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * This script generates a TypeScript file that contains an SVG sprite with all icons defined in the 'public/assets/icons.json' (can be changed in the script manifestPath variable) manifest.
 * It reads the manifest to find the relative paths of SVG files, then loads each SVG file's content, extracts the viewBox and inner content, and creates a <symbol> for each icon.
 * The resulting sprite is written to 'src/icons-sprite.ts' (can be changed in the script outFile variable) as a TypeScript export.
 * 
 * This allows the application to use an SVG sprite for icons, which can be more efficient than loading individual SVG files at runtime.
 */

const manifestPath = 'public/assets/icons.json';
const outFile = 'src/icons-sprite.ts';

const manifest = JSON.parse(
  fs.readFileSync(manifestPath, 'utf8')
) as Record<string, string>;

const baseDir = path.dirname(manifestPath);

let symbols = '';

function extractViewBox(svg: string): string {
  const match = svg.match(/viewBox="([^"]+)"/i);
  return match ? match[1] : '0 0 24 24'; // fallback if missing
}

function stripInnerSvg(content: string): string {
  return content
    .replaceAll(/<svg[^>]*>/i, '')
    .replaceAll(/<\/svg>/i, '')
    .trim();
}

for (const [name, relPath] of Object.entries(manifest)) {
  const svgPath = path.resolve(baseDir, relPath);

  if (!fs.existsSync(svgPath)) {
    console.warn(`⚠ Missing SVG: ${svgPath}`);
    continue;
  }

  const raw = fs.readFileSync(svgPath, 'utf8');

  const viewBox = extractViewBox(raw);
  const inner = stripInnerSvg(raw);

  symbols += `<symbol id="${name}" viewBox="${viewBox}">${inner}</symbol>`;
}

const sprite =
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">` +
  symbols +
  `</svg>`;

const outputTs = `
/* AUTO-GENERATED FILE — DO NOT EDIT */
export const APPSHELL_ICON_SPRITE = ${JSON.stringify(sprite)};
`;

fs.writeFileSync(outFile, outputTs);
console.log(
  `Generated sprite with ${Object.keys(manifest).length} icons → ${outFile}`
);