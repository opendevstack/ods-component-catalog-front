import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommunityScreenComponent } from './community-screen.component';
import { provideHttpClient } from '@angular/common/http';
import { provideMarkdown } from 'ngx-markdown';
import { FilesService, FilesServiceInterface } from '../../openapi';
import { of, throwError } from 'rxjs';

describe('CommunityScreenComponent', () => {
  let component: CommunityScreenComponent;
  let fixture: ComponentFixture<CommunityScreenComponent>;
  let filesServiceSpy: jasmine.SpyObj<FilesServiceInterface>;

  beforeEach(async () => {
    filesServiceSpy = jasmine.createSpyObj('FilesService', ['getFileById']);
    filesServiceSpy.getFileById.and.returnValue(of('mock file content'));

    await TestBed.configureTestingModule({
      imports: [CommunityScreenComponent],
      providers: [
        provideHttpClient(), 
        provideMarkdown(),
        { provide: FilesService, useValue: filesServiceSpy },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommunityScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map the response correctly in the constructor', (done) => {
    component.pageContent.subscribe((content) => {
      expect(content).toBe('mock file content');
      done();
    });
  });

  it('should handle error 422 scenario in the constructor', (done) => {
    filesServiceSpy.getFileById.and.returnValue(throwError(() => {
      const error: any = new Error('Unprocessable Entity');
      error.status = 422;
      return error;
    }));
    fixture = TestBed.createComponent(CommunityScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.pageContent.subscribe((content) => {
      expect(content).toBe('');
      expect(component.noProductsHtmlMessage).toBeUndefined();
      expect(component.noProductsIcon).toBeUndefined();
      done();
    });
  });

  it('should handle error scenario in the constructor', (done) => {
    filesServiceSpy.getFileById.and.returnValue(throwError(() => new Error('Error loading file')));
    fixture = TestBed.createComponent(CommunityScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.pageContent.subscribe((content) => {
      expect(content).toBe('');
      expect(component.noProductsHtmlMessage).toBe('Sorry, we are having trouble loading the page.<br/>Please check back in a few minutes.');
      expect(component.noProductsIcon).toBe('bi-smiley-sad-icon');
      done();
    });
  });
  
});
