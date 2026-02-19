import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * This script generates a JSON manifest of icon names to their relative SVG paths.
 * It scans the 'public/assets/icons' (can be changed in the script iconDir variable) directory for SVG files and creates a mapping
 * where the key is a normalized icon name (lowercase, underscores) and the value
 * is the relative path to the SVG file.
 * 
 * It also adds specific aliases for certain icons to ensure compatibility with existing code.
 * The resulting JSON is written to 'public/assets/icons.json' (can be changed in the script outputFile variable).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main(): void {
    const rootDir = path.join(__dirname, '..');
    const iconsDir = path.join(rootDir, 'public', 'assets', 'icons');
    const outputFile = path.join(rootDir, 'public', 'assets', 'icons.json');

    try {
        if (!fs.existsSync(iconsDir)) {
            console.warn(`[generate-icons-json] Icons directory not found: ${iconsDir}`);
            writeJson(outputFile, {});
            console.log(`[generate-icons-json] Wrote empty icons.json to ${outputFile}`);
            return;
        }

        const files = fs.readdirSync(iconsDir, { withFileTypes: true });
        const mapping: Record<string, string> = {};

        for (const entry of files) {
            if (!entry.isFile()) continue;
            const fileName = entry.name;
            const lower = fileName.toLowerCase();
            if (!lower.endsWith('.svg')) continue;

            const base = fileName.replace(/\.svg$/i, '');
            const key = base
                .toLowerCase()
                .replaceAll(/[\s-]+/g, '_');
            const relPath = path.posix.join('icons', fileName);
            mapping[key] = relPath;

            // Add specific required alias for chevron-down
            if (key === 'chevron_down') {
                mapping['expand_more'] = relPath;
            }
            if (key === 'chevron_up') {
                mapping['expand_less'] = relPath;
            }
            if (key === 'cross_circle') {
                mapping['x_circle'] = relPath;
            }
            if (key === 'circle_i') {
                mapping['info'] = relPath;
            }
            if (key === 'bell') {
                mapping['notifications'] = relPath;
            }
            if (key === 'magnifying_glass') {
                mapping['search'] = relPath;
            }
            if (key === 'cross') {
                mapping['close'] = relPath;
            }
            if (key === 'padlock-locked') {
                mapping['lock'] = relPath;
            }
            if (key === 'headset') {
                mapping['headset_mic'] = relPath;
            }
            if (key === 'chain-linked') {
                mapping['link'] = relPath;
            }
        }

        // Sort mapping alphabetically by keys
        const sortedMapping = Object.keys(mapping)
            .sort()
            .reduce((acc, key) => {
                acc[key] = mapping[key];
                return acc;
            }, {} as Record<string, string>);
        
        writeJson(outputFile, sortedMapping);
        console.log(`[generate-icons-json] Wrote ${Object.keys(mapping).length} icons to ${outputFile}`);
    } catch (err) {
        console.error('[generate-icons-json] Error generating icons.json:', err);
        process.exitCode = 1;
    }
}

function writeJson(filePath: string, obj: Record<string, string>): void {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const data = JSON.stringify(obj, null, 2) + '\n';
    fs.writeFileSync(filePath, data, 'utf8');
}

main();
