// Angular Imports
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from './dialog.component';

// Dialog Imports
import { DialogData } from './dialog-data';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  readonly dialog = inject(MatDialog);

  /**
   * Opens a dialog with provided data and optional dimensions
   * @param data Data to be passed to DialogComponent for display. DialogData interface is in dialog-data.ts
   * @param width Optional width for dialog box (default is 400px)
   * @param height Optional height for dialog box (default is 200px)
   * @returns A reference to the opened dialog, which can be subscribed to
   */
  openDialog(data: DialogData, width: string = '400px', height: string = '200px') {
    return this.dialog
      .open(DialogComponent, {
        data,
        width,
        height,
        disableClose: false,
      })
  }
}
