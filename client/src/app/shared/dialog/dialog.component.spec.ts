// Angular Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

// Dialog Imports
import { DialogComponent } from './dialog.component';
import { DialogData } from './dialog-data';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DialogComponent>>;
  const mockDialogData: DialogData = {
    title: 'Delete Item?',
    message: 'Are you sure you want to delete this item?',
    buttonOne: 'Cancel',
    buttonTwo: 'Confirm',
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        DialogComponent,
        MatDialogModule,
        MatButtonModule,
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display dialog title from data', () => {
    const titleElement = fixture.nativeElement.querySelector(
      'h2[mat-dialog-title]'
    );
    expect(titleElement.textContent).toContain(mockDialogData.title);
  });

  it('should display dialog message from data', () => {
    const messageElement = fixture.nativeElement.querySelector(
      'mat-dialog-content p'
    );
    expect(messageElement.textContent).toContain(mockDialogData.message);
  });

  it('should display button labels from data', () => {
    const buttons = fixture.nativeElement.querySelectorAll(
      'mat-dialog-actions button'
    );
    expect(buttons[0].textContent).toContain(mockDialogData.buttonOne);
    expect(buttons[1].textContent).toContain(mockDialogData.buttonTwo);
  });

  it('should close dialog when cancel button is clicked', () => {
    const cancelButton = fixture.nativeElement.querySelectorAll(
      'mat-dialog-actions button'
    )[0];
    cancelButton.click();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should close dialog with true when confirmDialog is called', () => {
    component.confirmDialog();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
