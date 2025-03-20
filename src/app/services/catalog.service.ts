import { Injectable } from '@angular/core';
import { AppShellProduct, AppShellFilter } from '@appshell/ngx-appshell';
import { firstValueFrom, map, Observable, switchMap } from 'rxjs';
import { CatalogFiltersService, CatalogItemsService, FileFormat, FilesService } from '../openapi';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  private readonly catalogId: string;

  constructor(
    private readonly catalogItemsService: CatalogItemsService,
    private readonly catalogFiltersService: CatalogFiltersService,
    private readonly filesService: FilesService,
    private readonly appConfigService: AppConfigService
  ) {
    this.catalogId = this.appConfigService.getConfig()?.catalogId ?? '';
  }

  getProductsList(): Observable<AppShellProduct[]> {
    return this.catalogItemsService.getCatalogItems(this.catalogId, 'asc').pipe(
      switchMap(items => Promise.all(items.map(async item => {
        return {
          id: item.id,
          title: item.title,
          shortDescription: item.shortDescription,
          description: item.descriptionFileId,
          image: item.imageFileId ? await this.getProductImage(item.imageFileId) : undefined,
          link: item.itemSrc,
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
        return {
          id: item.id,
          title: item.title,
          shortDescription: item.shortDescription,
          description: description,
          image: item.imageFileId ? await this.getProductImage(item.imageFileId) : undefined,
          link: item.itemSrc,
          tags: item.tags?.map(tag => ({ label: tag.label, options: tag.options ? Array.from(tag.options) : [] })),
          authors: item.authors,
          date: new Date(item.date)
        } as AppShellProduct;
      })
    );
  }

  getFilters(): Observable<AppShellFilter[]> {
    return this.catalogFiltersService.getCatalogFilters(this.catalogId).pipe(
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
