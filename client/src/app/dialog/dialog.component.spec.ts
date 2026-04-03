/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DialogComponent, DialogElements } from './dialog.component';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
  let dialog: MatDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogComponent, DialogElements, MatDialogModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    dialog = TestBed.inject(MatDialog);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('openDialog', () => {
    it('should open dialog with single report name', () => {
      const dialogSpy = spyOn(dialog, 'open').and.returnValue({
        afterClosed: () => ({ subscribe: () => {} })
      } as any);

      component.openDialog(undefined, 'Test Report');

      expect(dialogSpy).toHaveBeenCalled();
      expect(dialogSpy).toHaveBeenCalledWith(DialogElements, jasmine.objectContaining({
        data: jasmine.objectContaining({
          message: jasmine.stringContaining('Test Report')
        })
      }));
    });

    it('should open dialog with report count', () => {
      const dialogSpy = spyOn(dialog, 'open').and.returnValue({
        afterClosed: () => ({ subscribe: () => {} })
      } as any);

      component.openDialog(5);

      expect(dialogSpy).toHaveBeenCalledWith(DialogElements, jasmine.objectContaining({
        data: jasmine.objectContaining({
          message: jasmine.stringContaining('5')
        })
      }));
    });
  });
});

describe('DialogElements', () => {
  let component: DialogElements;
  let fixture: ComponentFixture<DialogElements>;
  let mockDialogRef: jasmine.Spy;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DialogElements],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { message: 'Test deletion confirmation' } },
        { provide: MatDialogRef, useValue: mockDialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DialogElements);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display message from data', () => {
    const content = fixture.nativeElement.querySelector('mat-dialog-content');
    expect(content.textContent).toContain(component.data.message);
  });
});
