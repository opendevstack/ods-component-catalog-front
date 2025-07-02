import { Injectable } from '@angular/core';
import { AppShellProduct, AppShellFilter } from '@appshell/ngx-appshell';
import { firstValueFrom, map, Observable, switchMap } from 'rxjs';
import { Catalog, CatalogDescriptor, CatalogDescriptorsService, CatalogFiltersService, CatalogItemsService, CatalogsService, FileFormat, FilesService } from '../openapi';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  public static readonly CODE_PRODUCT_TYPE = 'code';
  public static readonly NO_PERMISSION_CODE_LINK = 'USER_WITHOUT_PERMISSION';

  private catalogDescriptors: CatalogDescriptor[] = [];

  constructor(
    private readonly catalogDescriptorsService: CatalogDescriptorsService,
    private readonly catalogsService: CatalogsService,
    private readonly catalogItemsService: CatalogItemsService,
    private readonly catalogFiltersService: CatalogFiltersService,
    private readonly filesService: FilesService
  ) {}

  getSlugUrl(slug: string): string {
    return slug.trim()
      .toLowerCase() // convert string to lowercase
      .replace(/[^a-z0-9 -]/g, '') // remove any non-alphanumeric characters
      .replace(/\s+/g, '-') // replace spaces with hyphens
      .replace(/-+/g, '-'); // remove consecutive hyphens
  }

  retrieveCatalogDescriptors(): Observable<CatalogDescriptor[]> {
    return this.catalogDescriptorsService.getCatalogDescriptors();
  }

  getCatalogDescriptors(): CatalogDescriptor[] {
    return this.catalogDescriptors;
  }

  setCatalogDescriptors(catalogs: CatalogDescriptor[]): void {
    this.catalogDescriptors = catalogs;
  }

  getCatalog(catalogId: string): Observable<Catalog> {
    return this.catalogsService.getCatalog(catalogId);
  }

  getProductsList(catalogDescriptor: CatalogDescriptor): Observable<AppShellProduct[]> {
    return this.catalogItemsService.getCatalogItems(catalogDescriptor.id!, 'asc').pipe(
      switchMap(items => Promise.all(items.map(async item => {
        return {
          id: item.id,
          title: item.title,
          shortDescription: item.shortDescription,
          description: item.descriptionFileId,
          image: item.imageFileId ? await this.getProductImage(item.imageFileId) : undefined,
          link: `${this.getSlugUrl(catalogDescriptor.slug!)}/item/${item.id}`,
          tags: item.tags?.map(tag => ({label: tag.label, options: tag.options ? Array.from(tag.options) : []})),
          authors: item.authors,
          date: new Date(item.date)
        } as AppShellProduct
      })))
    );
  }

  async getProductImage(img: string): Promise<string | undefined> {
    try {
      const file = await firstValueFrom(this.filesService.getFileById(img, FileFormat.Image, 'body', false, { httpHeaderAccept: 'application/octet-stream' }));
      return URL.createObjectURL(new Blob([file]));
    } catch (error: any) {
      return undefined;
    }
  }


  getProduct(id: string): Observable<AppShellProduct> {
    return this.catalogItemsService.getCatalogItemById(id).pipe(
      switchMap(async (item) => {
        let description = '';
        try {
          description = await firstValueFrom(this.filesService.getFileById(item.descriptionFileId!, FileFormat.Markdown, 'body', false, { httpHeaderAccept: 'text/*' }));
        } catch (error: any) {
          if (error.status !== 422) {
            throw error;
          }
        }

        let itemLink = undefined;
        let itemDate = undefined
        
        if (item.type === CatalogService.CODE_PRODUCT_TYPE) {
          if (item.itemSrc) {
            itemLink = item.itemSrc
          } else {
            itemLink = CatalogService.NO_PERMISSION_CODE_LINK;
          }
          itemDate = new Date(item.date);
        }

        return {
          id: item.id,
          title: item.title,
          shortDescription: item.shortDescription,
          description: description,
          image: item.imageFileId ? await this.getProductImage(item.imageFileId) : undefined,
          link: itemLink,
          tags: item.tags?.map(tag => ({ label: tag.label, options: tag.options ? Array.from(tag.options) : [] })),
          authors: item.authors,
          date: itemDate
        } as AppShellProduct;
      })
    );
  }

  getFilters(catalogId: string): Observable<AppShellFilter[]> {
    return this.catalogFiltersService.getCatalogFilters(catalogId).pipe(
      map(filters => filters.map(filter => {
        return {
          label: filter.label,
          options: filter.options ? Array.from(filter.options).sort((a, b) => a.localeCompare(b)) : [],
          placeholder: 'Select options'
        } as AppShellFilter
      }))
    );
  }

}