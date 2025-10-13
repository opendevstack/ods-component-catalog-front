import { Injectable } from '@angular/core';
import { AppShellFilter } from '@appshell/ngx-appshell';
import { firstValueFrom, map, Observable, switchMap } from 'rxjs';
import { Catalog, CatalogDescriptor, CatalogDescriptorsService, CatalogFiltersService, CatalogItem, CatalogItemsService, CatalogsService, FileFormat, FilesService } from '../openapi';
import { AppProduct } from '../models/app-product';
import { ProductActionParameter } from '../models/product-action-parameter';
import { ProductAction } from '../models/product-action';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  public static readonly CODE_PRODUCT_TYPE = 'CODE';

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

  getProductsList(catalogDescriptor: CatalogDescriptor): Observable<AppProduct[]> {
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
          date: item.authors.length > 0 ? new Date(item.date) : undefined,
        } as AppProduct
      })))
    );
  }

  async getProductImage(img: string): Promise<string | undefined> {
    try {
      const file: Blob | string = await firstValueFrom(this.filesService.getFileById(img, FileFormat.Image, 'body', false, { httpHeaderAccept: 'application/octet-stream' }));
      return URL.createObjectURL(typeof file === 'string' ? new Blob([file]) : file);
    } catch {
      return undefined;
    }
  }


  getProduct(id: string): Observable<AppProduct> {
    return this.catalogItemsService.getCatalogItemById(id).pipe(
      switchMap(async (item) => {
        let description = '';
        try {
          description = await firstValueFrom(this.filesService.getFileById(item.descriptionFileId!, FileFormat.Markdown, 'body', false, { httpHeaderAccept: 'text/*' }));
        } catch (error: unknown) {
          if (typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status !== 422) {
            throw error;
          }
        }
        const productImage = item.imageFileId ? await this.getProductImage(item.imageFileId) : undefined;

        return this.mapCatalogItemToAppProduct(item, description, productImage);
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

  private mapCatalogItemToAppProduct(item: CatalogItem, description: string, image: string | undefined): AppProduct {
    return {
      id: item.id,
      title: item.title,
      shortDescription: item.shortDescription,
      description: description,
      image: image,
      tags: item.tags?.map(tag => ({ label: tag.label, options: tag.options ? Array.from(tag.options) : [] })),
      authors: item.authors,
      date: item.authors.length > 0 ? new Date(item.date) : undefined,
      actions: item.userActions?.map(action => ({
        id: action.id,
        label: action.displayName,
        url: action.url,
        triggerMessage: action.triggerMessage,
        parameters: action.parameters?.map(param => ({
          name: param.name,
          type: param.type,
          required: param.required,
          defaultValue: param.defaultValue,
          defaultValues: param.defaultValues ?? [],
          options: param.options ?? [],
          locations: param.locations?.map(location => ({
            location: location.location,
            value: location.value
          })) || [],
          label: param.label,
          visible: param.visible,
          hint: param.hint,
          placeholder: param.placeholder,
          validations: param.validations?.map(validation => ({
            regex: validation.regex,
            errorMessage: validation.errorMessage,
          })) || []
        } as ProductActionParameter)) ?? []
      } as ProductAction))
    } as AppProduct;
  }

}