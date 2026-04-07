// Angular Imports
import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
//import { MatIcon } from '@angular/material/icon'; // Keeping this (just commented out) in case we want to add icons to dialog in the future

// Dialog Imports
import { DialogData } from './dialog-data';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
  imports: [
    //MatIcon,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
  ],
})
export class DialogComponent {
  dialogData = inject(MAT_DIALOG_DATA) as DialogData;
  dialogRef = inject(MatDialogRef);

  /**
   * Closes dialog and returns true to the caller. Used for confirmation actions in dialog.
   */
  confirmDialog() {
    this.dialogRef.close(true);
  }
}
