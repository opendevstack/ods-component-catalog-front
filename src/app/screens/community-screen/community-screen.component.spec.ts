import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommunityScreenComponent } from './community-screen.component';
import { provideHttpClient } from '@angular/common/http';
import { provideMarkdown } from 'ngx-markdown';
import { Catalog, FilesService, FilesServiceInterface } from '../../openapi';
import { of, Subject, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';

describe('CommunityScreenComponent', () => {
  let component: CommunityScreenComponent;
  let fixture: ComponentFixture<CommunityScreenComponent>;
  let filesServiceSpy: jasmine.SpyObj<FilesServiceInterface>;
  let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteSubject = new Subject();
  let mockCatalogService: jasmine.SpyObj<CatalogService>;

  beforeEach(async () => {
    filesServiceSpy = jasmine.createSpyObj('FilesService', ['getFileById']);
    filesServiceSpy.getFileById.and.returnValue(of('mock file content'));
    mockCatalogService = jasmine.createSpyObj('CatalogService', ['getCatalogDescriptors', 'getCatalog', 'getSlugUrl']);
    activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {'params': activatedRouteSubject});
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CommunityScreenComponent],
      providers: [
        provideHttpClient(), 
        provideMarkdown(),
        { provide: FilesService, useValue: filesServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: Router, useValue: routerSpy },
        { provide: CatalogService, useValue: mockCatalogService },
      ],
    })
    .compileComponents();
    
    mockCatalogService.getCatalogDescriptors.and.returnValue([{slug: 'catalog', id: 'fake'}]);
    mockCatalogService.getCatalog.and.returnValue(of({communityPageId: 'fake'} as Catalog));
    mockCatalogService.getSlugUrl.and.callFake((id: string) => {return id;});

    fixture = TestBed.createComponent(CommunityScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    activatedRouteSubject.next({'catalogSlug': 'catalog'});
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map the response correctly in the constructor', () => {
    fixture.whenStable().then(() => {
      expect(component.pageContent).toEqual('mock file content');
    });
  });

  it('should handle error 422 scenario in the constructor', fakeAsync(() => {
    filesServiceSpy.getFileById.and.returnValue(throwError(() => {
      const error: any = new Error('Unprocessable Entity');
      error.status = 422;
      return error;
    }));
    activatedRouteSubject.next({'catalogSlug': 'catalog'});
    tick();
    fixture.whenStable().then(() => {
      expect(component.pageContent).toEqual('');
      expect(component.noProductsHtmlMessage).toBeUndefined();
      expect(component.noProductsIcon).toBeUndefined();
    });
  }));

  it('should handle error scenario in the constructor', fakeAsync(() => {
    filesServiceSpy.getFileById.and.returnValue(throwError(() => new Error('Error loading file')));
    activatedRouteSubject.next({'catalogSlug': 'catalog'});
    tick();
    fixture.whenStable().then(() => {
      expect(component.pageContent).toEqual('');
      expect(component.noProductsHtmlMessage).toBe('Sorry, we are having trouble loading the page.<br/>Please check back in a few minutes.');
      expect(component.noProductsIcon).toBe('bi-smiley-sad-icon');
    });
  }));

  it('should redirect to / if there is no valid catalog in the route params', () => {
    activatedRouteSubject.next({});
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });
  
});