import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';


export interface DialogData {
  numReports?: number;
  reportName?: string;
}



/**
 * @title Dialog elements
 */
@Component({
  selector: 'app-dialog-component',
  templateUrl: 'dialog.component.html',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent {
  readonly dialog = inject(MatDialog);

  openDialog(numReports?: number, reportName?: string) {
    // Construct message based on passed parameters
    const message = numReports !== undefined
      ? `Are you sure you want to delete ${numReports} report(s)?`
      : `Are you sure you want to delete the report ${reportName}?`;

    this.dialog.open(DialogElements, {
      data: {
        message: message
      }
    });
  }
}

@Component({
  selector: 'app-dialog-elements',
  templateUrl: 'dialog-elements.component.html',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogElements {
  data = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);

  confirmDelete () {
    this.dialogRef.close(true);
  }
}
