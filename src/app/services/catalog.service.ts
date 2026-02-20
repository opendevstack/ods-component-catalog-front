import { Injectable } from '@angular/core';
import { AppShellFilter } from '@opendevstack/ngx-appshell';
import { BehaviorSubject, firstValueFrom, from, map, Observable, switchMap } from 'rxjs';
import { Catalog, CatalogDescriptor, CatalogDescriptorsService, CatalogFiltersService, CatalogItem, CatalogItemsService, CatalogsService, FileFormat, FilesService } from '../openapi/component-catalog';
import { AppProduct } from '../models/app-product';
import { ProductActionParameter } from '../models/product-action-parameter';
import { ProductAction } from '../models/product-action';
import { AzureService } from './azure.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  public static readonly CODE_PRODUCT_TYPE = 'CODE';

  private readonly CATALOG_STORAGE_KEY = 'catalogSlug';

  private catalogDescriptors: CatalogDescriptor[] = [];

  private readonly selectedCatalogSlugSubject = new BehaviorSubject<string | null>(this.getStoredSelectedCatalogSlug());
  public selectedCatalogSlug: string | null = this.selectedCatalogSlugSubject.value;
  public readonly selectedCatalogSlug$: Observable<string | null> = this.selectedCatalogSlugSubject.asObservable();

  constructor(
    private readonly catalogDescriptorsService: CatalogDescriptorsService,
    private readonly catalogsService: CatalogsService,
    private readonly catalogItemsService: CatalogItemsService,
    private readonly catalogFiltersService: CatalogFiltersService,
    private readonly filesService: FilesService,
    private readonly azureService: AzureService
  ) {}

  setSelectedCatalogSlug(slug: string | null): void {
    const normalizedSlug = slug ? this.getSlugUrl(slug) : null;
    if (this.selectedCatalogSlugSubject.value === normalizedSlug) {
      return;
    }

    this.selectedCatalogSlug = normalizedSlug;
    this.selectedCatalogSlugSubject.next(normalizedSlug);

    try {
      if (normalizedSlug) {
        localStorage.setItem(this.CATALOG_STORAGE_KEY, normalizedSlug);
      } else {
        localStorage.removeItem(this.CATALOG_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
    }
  }

  getSelectedCatalogSlug(): string | null {
    return this.selectedCatalogSlugSubject.value;
  }

  getSelectedCatalogDescriptor(): CatalogDescriptor | undefined {
    const slug = this.getSelectedCatalogSlug();
    if (!slug) {
      return undefined;
    }
    return this.catalogDescriptors.find(catalog => this.getSlugUrl(catalog.slug!) === slug);
  }

  getSlugUrl(slug: string): string {
    return slug.trim()
      .toLowerCase() // convert string to lowercase
      .replaceAll(/[^a-z0-9 -]/g, '') // remove any non-alphanumeric characters
      .replaceAll(/\s+/g, '-') // replace spaces with hyphens
      .replaceAll(/-+/g, '-'); // remove consecutive hyphens
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

  private getStoredSelectedCatalogSlug(): string | null {
    try {
      const slug = localStorage.getItem(this.CATALOG_STORAGE_KEY);
      return slug ? this.getSlugUrl(slug) : null;
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
      return null;
    }
  }

  getCatalog(catalogId: string): Observable<Catalog> {
    return this.catalogsService.getCatalog(catalogId);
  }

  getProductsList(catalogDescriptor: CatalogDescriptor): Observable<AppProduct[]> {
    return this.catalogItemsService.getCatalogItems(catalogDescriptor.id!, 'asc').pipe(
      switchMap(items => Promise.all(items.map(async item => {
        return this.mapCatalogItemToAppProductListItem(item, catalogDescriptor.slug!);
      })))
    );
  }

  getProjectProductsList(projectKey: string, catalogDescriptor: CatalogDescriptor): Observable<AppProduct[]> {
    return from(this.azureService.getRefreshedAccessToken()).pipe(
      switchMap((accessToken) => {
        return this.catalogItemsService.getCatalogItemsForProjectKey(catalogDescriptor.id!, accessToken, 'asc', projectKey).pipe(
          switchMap(items => Promise.all(items.map(async item => {
          return this.mapCatalogItemToAppProductListItem(item, catalogDescriptor.slug!);
          })))
        );
      })
    );
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

  getProjectProduct(projectKey: string, id: string): Observable<AppProduct> {
    return from(this.azureService.getRefreshedAccessToken()).pipe(
      switchMap((accessToken) => {
        return this.catalogItemsService.getCatalogItemByIdForProjectKey(id, projectKey, accessToken).pipe(
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

  async getProductImage(img: string): Promise<string | undefined> {
    try {
      const file: Blob | string = await firstValueFrom(this.filesService.getFileById(img, FileFormat.Image, 'body', false, { httpHeaderAccept: 'application/octet-stream' }));
      return URL.createObjectURL(typeof file === 'string' ? new Blob([file]) : file);
    } catch {
      return undefined;
    }
  }

  private async mapCatalogItemToAppProductListItem(item: CatalogItem, catalogSlug: string): Promise<AppProduct> {
    return {
      id: item.id,
      title: item.title,
      shortDescription: item.shortDescription,
      description: item.descriptionFileId,
      image: item.imageFileId ? await this.getProductImage(item.imageFileId) : undefined,
      link: `${this.getSlugUrl(catalogSlug)}/item/${item.id}`,
      tags: item.tags?.map(tag => ({label: tag.label, options: tag.options ? Array.from(tag.options) : []})),
      authors: item.authors,
      date: item.authors.length > 0 ? new Date(item.date) : undefined,
    } as AppProduct
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
        requestable: action.requestable,
        restrictionMessage: action.restrictionMessage ?? '',
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