// Angular Imports
import { MatDialog } from '@angular/material/dialog';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';

// Dialog Imports
import { DialogService } from './dialog.service';
import { DialogComponent } from './dialog.component';
import { DialogData } from './dialog-data';

describe('DialogService', () => {
  let service: DialogService;
  let dialog: MatDialog;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      providers: [DialogService],
    });

    service = TestBed.inject(DialogService);
    dialog = TestBed.inject(MatDialog);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open dialog with provided data', () => {
    const dialogSpy = spyOn(dialog, 'open').and.returnValue(
      jasmine.createSpyObj('MatDialogRef', ['afterClosed'])
    );
    const testData: DialogData = {
      title: 'Test Dialog',
      message: 'Test message',
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm',
    };

    service.openDialog(testData);

    expect(dialogSpy).toHaveBeenCalledWith(
      DialogComponent,
      jasmine.objectContaining({
        data: testData,
        width: '400px',
        height: '200px',
        disableClose: false,
      })
    );
  });

  it('should open dialog with custom dimensions', () => {
    const dialogSpy = spyOn(dialog, 'open').and.returnValue(
      jasmine.createSpyObj('MatDialogRef', ['afterClosed'])
    );
    const testData: DialogData = {
      title: 'Test',
      message: 'Message',
    };

    service.openDialog(testData, '500px', '300px');

    expect(dialogSpy).toHaveBeenCalledWith(
      DialogComponent,
      jasmine.objectContaining({
        data: testData,
        width: '500px',
        height: '300px',
        disableClose: false,
      })
    );
  });
});
