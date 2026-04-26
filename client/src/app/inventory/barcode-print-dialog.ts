import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatCheckbox } from "@angular/material/checkbox";
import { Inventory } from './inventory';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-barcode-print-dialog',
  standalone: true,
  templateUrl: './barcode-print-dialog.html',
  styleUrls: ['./barcode-print-dialog.scss'],
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCheckbox,
    CommonModule
  ]
})

export class BarcodePrintDialog {
  private dialogRef = inject(MatDialogRef<BarcodePrintDialog>)
  data = inject<{ items: Inventory[] }>(MAT_DIALOG_DATA);
  selectedItems: Inventory[] = [];

  cancel(): void {
    this.dialogRef.close();
  }

  toggleSelectedItems(item: Inventory, checked: boolean): void {
    if (checked) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter(
        selectedItem => selectedItem.internalID != item.internalID
      )
    }
  }

  printSelectedItems(): void {
    this.dialogRef.close(this.selectedItems)
    //This will return the selected items from the dialog page to print.
  }
}
