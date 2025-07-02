# Component Catalog Configuration Instructions

In order to define a component catalog, you must configure a repository to keep the catalog configuration. And different repositories for the different catalog item configurations.

## Catalogs collection
The catalog collection is an special catalog file, that references all the catalogs that are available in the system.
Each link will represent a catalog repository described below.

### Expected Repository Structure

    └── CatalogsCollection.yaml

### CatalogsCollection.yaml
There MUST be a CatalogsCollection.yaml file to configure the catalog that has the following structure:

```
---
kind: CatalogCollections       # This is a CatalogCollections object
metadata:                     
  name: Catalog collections    # The name of the CatalogCollections
 
# Specifications for the CatalogCollections
spec:
  # The targets, or sources, for the CatalogCollections. These are direct links to specific versions of the CatalogItem, determined by branch, tag, or commit SHA.
  targets:
     # A dictionary for each target allow us to add extra configuration
    - url: https://bitbucket.biscrum.com/projects/machine-learning-model-catalog/repos/model-catalog/raw/machine-learning-catalog/catalog.yaml?at=refs%2Ftags%2Fv0.2
      slug: catalog-1
      conf: ...... # extra configuration
    - url: https://bitbucket.biscrum.com/projects/other-catalog/repos/catalog-definition/raw/catalog.yaml?at=refs%2Ftags%2Fv0.2 # URL to another specific version of the CatalogItem
      slug: catalog-2
```
Properties:
- **kind**: Constant value that needs to be set as CatalogCollections
- **metadata**:
  - **name**: Name of the catalogs collection. This information is only to get some extra context to understand this repository. Does not get reflected in the UI.
  - **spec**:
    - **targets**: 
      - **url**: A list of url references to the catalog repositories that will appear in the catalogs collection. The frontend will show them in the specified order. The URLs must be complete, containing the protocol (http/s), the host (bitbucket.biscrum.com), the link must be to the "browse" file (not "raw") and must contain the references to choose the branch to be used.
      - **slug**: A slug is a URL-friendly version of the catalog name. It is used to create a unique identifier for the catalog in the system. The slug should be lowercase and can contain letters, numbers, and hyphens.


## Catalog Repository
The main catalog repository (entry point) can have any name but it must contain the following 2 files:

### Expected Repository Structure

    │── Catalog.yaml
    └── community.md

### Catalog.yaml
There MUST be a Catalog.yaml file to configure the catalog that has the following structure:

```
--- 
kind: Catalog 
metadata: 
  name: Name of the catalog
  description: Description of the catalog
  communityPage: ./community.md path or url
  spec: 
    links:
    - url: http://www.boheringer.com
      name: boehringer
    - url: http://www.google.com
      name: google
    tags:
      - Category1
      - Category2
      - Category3
    targets:
      - url: https://bitbucket.biscrum.com/projects/DSMC/repos/xxxx/browse/CatalogItem.yaml?at=refs%2Fheads%2Fmaster
      - url: https://bitbucket.biscrum.com/projects/DSMC/repos/yyyy/browse/CatalogItem.yaml?at=refs%2Fheads%2Fmaster
```

Properties:
- **kind**: Constant value that needs to be set as Catalog
- **metadata**:
    - **name**: Name of the catalog. This information is only to get some extra context to understand this repository. Does not get reflected in the UI.
    - **description**: Description of the catalog. This information is only to get some extra context to understand this repository. Does not get reflected in the UI.
    - **communityPage**: Reference to a markdown (.md) file from the same repository. The contents of that file will be rendered (using markdown) in the community page.
    - **spec**:
        - **links**: A list of links that will appear in the left block of the catalog page. The frontend will show them in alphabetical order. The URLs must be complete, containing the protocol (http/s), the host (bitbucket.biscrum.com), the link must be to the "browse" file (not "raw") and must contain the references to choose the branch to be used.
        - **tags**: A list of strings that will be the filters appearing on the top of the catalog page. The names will appear in the UI as you define them here, being case sensitive and in the same exact order you define them in the catalog. This same values will need to be aligned in the catalog items repositories. The options of the select fields will be all the values from all the catalog items for that specific label. They will be ordered alphabetically and cannot have repeated values in the same filter options.
        - **targets**: A list of url references to the catalog items that will appear in the catalog. The frontend will show them in alphabetical order. The URLs must be complete, containing the protocol (http/s), the host (bitbucket.biscrum.com), the link must be to the "browse" file (not "raw") and must contain the references to choose the branch to be used.

### community.md
There MUST be a community.md file that contains any useful information for the users about your community.  
The contents of this file will be rendered using the markdown syntax in a dedicated "Community" screen that will appear in the side menu.  
If keeping empty, the page will still be displayed but the content will look empty, so we encourage you to add some content.

## Catalog Item Repository
Each catalog item must be in a dedicated repository. The repository can have any name but must contain some specific files.

### Expected Repository Structure

    │── CatalogItem.yaml
    │── CODEOWNERS
    │── icon.png (optional and optional name)
    └── README.md

### CatalogItem.yaml
Each catalog item repository must contain a CatalogItem.yaml with the following format (and some inherited files we'll see):  
```
--- 
kind: CatalogItem 
metadata: 
  name: Item Name
  shortDescription: Short description shown in the item card
  description: README.md
  contributors: CODEOWNERS
  image: icon.png
  tags:
    Category1: 
      - value1
    Category2: 
      - value 2
      - value 3 
    Category3: 
      - value 4
```
Properties:  
- **kind**: Constant value that needs to be set as CatalogItem
- **metadata**:
    - **name**: Name of the catalog item that will be shown in the UI (case sensitive).
    - **shortDescription**: Short description for the item that will be shown in the cards in the UI.
    - **description**: Reference to a markdown (.md) file from the same repository. The contents of that file will be rendered (using markdown) in the item details page.
    - **contributors**: Reference to a CODEOWNERS file from the same repository. The contents of that file must follow the same format as the github CONTRIBUTING file https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors#adding-a-contributing-file 
    - **image**: Optional reference to an image file from the same repository. If the item doesn't have any image, you can remove this property from the yaml. In case you define an image, we encourage you to use PNG for a better looking interface. 
    - **tags**: For each category defined in the main catalog.yaml file, you can set values that apply to the current item. These options (values) are case sensitive and will appear both as labels for the items and as options in the main catalog filters.

### README.md, CODEOWNERS and image
From the previous instructions, you can see that a part from the CatalogItem.yaml, you will also need a markdown file for the description, a CODEOWNERS file and an optional image.

#### Images in the description
Since catalog item descriptions are defined using Markdown, they can include images. To ensure images are displayed correctly for all users:  
- If the image is stored within the same repository, use a relative URL (e.g., ./assets/icon.png).
- If the image is hosted on a public URL, use the absolute URL (e.g., https://...).  

Note: Using an absolute URL to an image in a private repository (not accessible by everyone in the company) will result in a broken image in the description.
