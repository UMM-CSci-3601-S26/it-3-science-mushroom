import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatCheckbox } from "@angular/material/checkbox";
import { Inventory } from './inventory';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-barcode-print-dialog',
  standalone: true,
  templateUrl: './barcode-print-dialog.html',
  styleUrls: ['./barcode-print-dialog.scss'],
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCheckbox,
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule
  ]
})

export class BarcodePrintDialog {
  private dialogRef = inject(MatDialogRef<BarcodePrintDialog>)
  data = inject<{ items: Inventory[] }>(MAT_DIALOG_DATA);
  selectedItems: Inventory[] = [];
  descriptionFilter = '';

  cancel(): void {
    this.dialogRef.close();
  }

  toggleSelectedItems(item: Inventory, checked: boolean): void {
    if (checked) {
      if (!this.isSelected(item)) {
        this.selectedItems.push(item);
      }
    } else {
      this.selectedItems = this.selectedItems.filter(
        selectedItem => selectedItem.internalID !== item.internalID
      )
    }
  }

  isSelected(item: Inventory): boolean {
    return this.selectedItems.some(
      selectedItem => selectedItem.internalID === item.internalID
    );
  }

  filteredItems(): Inventory[] {
    const filter = this.descriptionFilter.trim().toLowerCase();

    if (!filter) {
      return this.data.items;
    }

    return this.data.items.filter(item =>
      (item.description ?? '').toLowerCase().includes(filter)
    );
  }

  clearDescriptionFilter(): void {
    this.descriptionFilter = '';
  }

  printSelectedItems(): void {
    this.dialogRef.close(this.selectedItems)
    //This will return the selected items from the dialog page to print.
  }
}
