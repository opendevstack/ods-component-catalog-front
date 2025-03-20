import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoRepositoryAccessDialogComponent } from './no-repository-access-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef } from '@angular/material/dialog';

describe('NoRepositoryAccessDialogComponent', () => {
  let component: NoRepositoryAccessDialogComponent;
  let fixture: ComponentFixture<NoRepositoryAccessDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogContent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => { },
            componentInstance: () => { }
          }
        },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoRepositoryAccessDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});