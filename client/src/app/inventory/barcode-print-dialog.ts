import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatAnchor } from "@angular/material/button";
import { MatCheckbox } from "@angular/material/checkbox";
import { Inventory } from './inventory';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-barcode-print-dialog',
  standalone: true,
  templateUrl: './barcode-print-dialog.html',
  styleUrls: ['./barcode-print-dialog.scss'],
  imports: [
    MatDialogModule,
    MatAnchor,
    MatCheckbox,
    CommonModule
  ]
})

export class BarcodePrintDialog {
  private dialogRef = inject(MatDialogRef<BarcodePrintDialog>)
  data = inject<{ items: Inventory[] }>(MAT_DIALOG_DATA);

  cancel(): void {
    this.dialogRef.close();
  }
}
