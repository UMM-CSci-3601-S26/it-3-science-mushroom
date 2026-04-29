import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BarcodePrintQuantitySelection } from './barcode-print-item';
import { Inventory } from '../inventory';

type BarcodePrintQuantityRow = {
  item: Inventory;
  quantity: number | string;
};

@Component({
  selector: 'app-barcode-print-quantity-dialog',
  standalone: true,
  templateUrl: './barcode-print-quantity-dialog.html',
  styleUrls: ['./barcode-print-quantity-dialog.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class BarcodePrintQuantityDialog {
  readonly defaultWarningLimit = 25;

  private dialogRef = inject(MatDialogRef<BarcodePrintQuantityDialog>);
  data = inject<{ items: Inventory[]; warningLimit?: number }>(MAT_DIALOG_DATA);

  rows: BarcodePrintQuantityRow[] = this.data.items.map(item => ({
    item,
    quantity: 1
  }));

  cancel(): void {
    this.dialogRef.close();
  }

  print(): void {
    const selections: BarcodePrintQuantitySelection[] = this.rows.map(row => ({
      item: row.item,
      quantity: this.normalizeQuantity(row.quantity)
    }));
    const warningLimit = this.normalizeWarningLimit(this.data.warningLimit);
    const highQuantitySelections = selections.filter(selection => selection.quantity > warningLimit);

    if (highQuantitySelections.length) {
      const itemNames = highQuantitySelections.map(selection =>
        `${selection.item.item} (${selection.quantity})`
      ).join(', ');
      const confirmed = window.confirm(
        `You are printing more than ${warningLimit} labels for: ${itemNames}. Continue?`
      );

      if (!confirmed) {
        return;
      }
    }

    this.dialogRef.close(selections);
  }

  trackByInternalID(index: number, row: BarcodePrintQuantityRow): string {
    return row.item.internalID;
  }

  private normalizeQuantity(quantity: number | string): number {
    const safeQuantity = Math.floor(Number(quantity));

    if (!Number.isFinite(safeQuantity) || safeQuantity < 1) {
      return 1;
    }

    return safeQuantity;
  }

  private normalizeWarningLimit(limit: number | string | undefined): number {
    const safeLimit = Math.floor(Number(limit));

    if (!Number.isFinite(safeLimit) || safeLimit < 1) {
      return this.defaultWarningLimit;
    }

    return safeLimit;
  }
}
