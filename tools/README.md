# Icon Generation Tools

This directory contains scripts for generating icon manifests and TypeScript files from SVG icons.

## Prerequisites

- SVG icon files must be placed in `public/assets/icons/` directory.
- Node.js must be installed

## Execution Order

### Step 1: Generate Icon Manifest (Required First)

```bash
node tools/generate-icons-json.ts
```

**What it does:**
- Scans `public/assets/icons/` directory for all `.svg` files
- Creates a mapping of icon names to file paths
- Outputs `public/assets/icons.json`

**Icon Name Aliases:**
The script automatically creates convenient aliases to make the company's icon library compatible with material icons.

### Step 2: Generate Icon Assets (Choose One)

After generating the manifest, you can run **either** of these scripts depending on your needs:

#### Option A: SVG Sprite

```bash
node tools/generate-sprites.ts
```

**What it does:**
- Reads `public/assets/icons.json` manifest
- Combines all SVG icons into a single sprite
- Extracts viewBox from each icon
- Outputs `src/icons-sprite.ts` with `APPSHELL_ICON_SPRITE` export

**Use when:** You want to use an SVG sprite for efficient runtime icon rendering by referencing symbols.

#### Option B: Raw SVG Map

```bash
node tools/generate-icons.mts
```

**What it does:**
- Reads `public/assets/icons.json` manifest
- Creates a TypeScript map of icon names to their raw SVG content
- Outputs `src/icons-map.ts` with `APPSHELL_ICON_MAP` export

**Use when:** You need direct access to individual icon SVG content at runtime.

## Quick Start

```bash
# 1. Add your SVG icons to public/assets/icons/
# 2. Generate the manifest
node tools/generate-icons-json.ts

# 3. Generate sprites (recommended for most cases)
node tools/generate-sprites.ts
```

⚠️ **Note:** All generated files are marked as `AUTO-GENERATED` and should not be edited manually.

## Production Deployment

### When using Sprite or Map options

If you choose to use **Option A (SVG Sprite)** or **Option B (Raw SVG Map)** instead of the JSON manifest approach, you should **remove the original SVG assets** before building for production:

**Files to remove:**
- `public/assets/icons/` directory (all SVG files)
- `public/assets/icons.json` (auto-generated manifest)

**Why?** The sprite (`icons-sprite.ts`) or map (`icons-map.ts`) already contains all icon data embedded in your JavaScript bundle. Keeping the original SVG files would:
- Unnecessarily increase your deployment package size
- Create redundant assets that won't be used at runtime

**When to remove:**
- Before running your production build command
- Before uploading/packing your application
