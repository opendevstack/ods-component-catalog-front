import * as fs from 'fs';
import * as path from 'path';

/**
 * This script generates a TypeScript file that exports a mapping of icon names to their raw SVG content.
 * It reads the 'public/assets/icons.json' (can be changed in the script manifestPath variable) manifest to find the relative paths of SVG files, then loads each SVG file's content and creates a mapping.
 * The resulting TypeScript file is written to 'src/icons-map.ts' (can be changed in the script outFile variable).
 * 
 * This allows the application to access the raw SVG content of icons at runtime without needing to load separate files.
 */

const manifestPath = 'public/assets/icons.json';

const outFile = 'src/icons-map.ts';

const raw = fs.readFileSync(manifestPath, 'utf8');

const manifest = JSON.parse(raw) as Record<string, string>;

const baseDir = path.dirname(manifestPath);

const iconMap: Record<string, string> = {};

for (const [name, relPath] of Object.entries(manifest)) {
  if (typeof relPath !== 'string') {
    console.warn(`Skipping icon '${name}' because its path is not a string.`);
    continue;
  }

  const svgPath = path.resolve(baseDir, relPath);

  if (!fs.existsSync(svgPath)) {
    console.warn(`Warning: SVG file not found: ${svgPath}`);
    continue;
  }

  const svg = fs.readFileSync(svgPath, 'utf8');
  iconMap[name] = svg;
}

const output = `
/* AUTO-GENERATED FILE — DO NOT EDIT */
export const APPSHELL_ICON_MAP: Record<string, string> = ${JSON.stringify(iconMap)};
`;

fs.writeFileSync(outFile, output);
console.log(`Generated: ${outFile} with ${Object.keys(iconMap).length} icons.`);