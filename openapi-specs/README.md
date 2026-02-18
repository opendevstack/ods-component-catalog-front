# OpenAPI Client Generation

This directory contains all OpenAPI specifications and generator configurations for the Component Catalog Frontend.

## Directory Structure

```
openapi/
├── specs/              # OpenAPI specification files (YAML)
│   ├── component-catalog-v1.0.0.yaml
│   ├── component-provisioner-v1.0.0.yaml
│   └── projects-info-service-v1.0.0.yaml
└── README.md          # This file
```

Generator configurations are defined in the root `openapitools.json` file.

## Backend Services

This project integrates with three backend services:

1. **Component Catalog** - Main catalog service for component management
2. **Component Provisioner** - Service for provisioning components
3. **Projects Info Service** - Service for project information

## Usage

### Generate All API Clients

```bash
npm run generate-api-client
```

This will:
1. Clean existing generated clients (`src/app/openapi/`)
2. Generate the Component Catalog client
3. Generate the Component Provisioner client
4. Generate the Projects Info Service client

### Generate Individual API Clients

Generate clients individually when you only need to update one:

```bash
# Component Catalog
npm run generate-api-client:catalog

# Component Provisioner
npm run generate-api-client:provisioner

# Projects Info Service
npm run generate-api-client:projects-info-service
```

### Clean Generated Clients

```bash
npm run generate-api-client:clean
```

## Adding a New Backend Service

To add a new backend service:

1. **Add the OpenAPI spec** to `openapi-specs/`:
   ```bash
   cp path/to/new-service-v1.0.0.yaml openapi-specs/
   ```

2. **Add generator config** to root `openapitools.json`:
   ```json
   {
     "generator-cli": {
       "version": "7.11.0",
       "generators": {
         "new-service-client": {
           "generatorName": "typescript-angular",
           "inputSpec": "openapi-specs/new-service-v1.0.0.yaml",
           "output": "src/app/openapi/new-service",
           "additionalProperties": {
             "fileNaming": "kebab-case",
             "withInterfaces": true,
             "generateAliasAsModel": true
           }
         }
       }
     }
   }
   ```

3. **Add npm script** in `package.json`:
   ```json
   "generate-api-client:new-service": "openapi-generator-cli generate --generator-key new-service-client"
   ```

4. **Update main generation script** to include the new service:
   ```json
   "generate-api-client": "npm run generate-api-client:clean && npm run generate-api-client:catalog && npm run generate-api-client:provisioner && npm run generate-api-client:projects-info-service && npm run generate-api-client:new-service"
   ```

## Configuration

All generators use the TypeScript Angular generator with these settings:

- **fileNaming**: `kebab-case` - Generated files use kebab-case naming
- **withInterfaces**: `true` - Generates TypeScript interfaces for models
- **generateAliasAsModel**: `true` - Treats type aliases as separate models

Generated clients are output to: `src/app/openapi/<service-name>/`

## Generator Version

Using OpenAPI Generator CLI version: **7.11.0**

To update the generator version, modify the `version` field in the root `openapitools.json`.

## Troubleshooting

### Generation fails
- Ensure the OpenAPI spec files are valid YAML
- Check that all paths in generator configs are correct
- Verify OpenAPI Generator CLI is installed: `npx openapi-generator-cli version`

### Old generated code remains
- Run `npm run generate-api-client:clean` before regenerating
- Ensure no files in `src/app/openapi/` are open in your editor

### Module not found errors
- Regenerate clients after pulling spec updates
- Restart the Angular dev server after generating clients
