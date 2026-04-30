import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DeleteFamilyRequestDialogComponent } from './delete-family-request-dialog.component';

describe('DeleteFamilyRequestDialogComponent', () => {
  let component: DeleteFamilyRequestDialogComponent;
  let fixture: ComponentFixture<DeleteFamilyRequestDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<DeleteFamilyRequestDialogComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DeleteFamilyRequestDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            guardianName: 'Jordan Guardian'
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteFamilyRequestDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('trims message getter', () => {
    component.message = '  please review this request  ';

    expect(component.trimmedMessage).toBe('please review this request');
  });

  it('cancel closes dialog without payload', () => {
    component.cancel();

    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });

  it('submit does not close dialog for blank message', () => {
    component.message = '   ';

    component.submit();

    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('submit closes dialog with trimmed message', () => {
    component.message = '  duplicate family record  ';

    component.submit();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      message: 'duplicate family record'
    });
  });
});
