import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type {
  PurchaseListFulfillmentAllocation,
  PurchaseListFulfillmentOption
} from './purchase-list';

export interface PurchaseListFulfillmentAllocationDialogData {
  itemDescription: string;
  totalNeeded: number;
  options: PurchaseListFulfillmentOption[];
  existingAllocations: PurchaseListFulfillmentAllocation[];
}

type PurchaseListFulfillmentAllocationRow = {
  option: PurchaseListFulfillmentOption;
  quantity: number | string;
};

@Component({
  selector: 'app-purchase-list-fulfillment-allocation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>Allocate Fulfillment</h2>

    <mat-dialog-content class="purchase-allocation-dialog">
      <div class="purchase-allocation-summary">
        <span class="purchase-allocation-item">{{ data.itemDescription }}</span>
        <span class="purchase-allocation-count">{{ allocatedTotal() }} / {{ data.totalNeeded }}</span>
      </div>

      <div class="purchase-allocation-rows">
        @for (row of rows; track row.option.internalId) {
          <div class="purchase-allocation-row">
            <div class="purchase-allocation-option">
              <span class="purchase-allocation-description">{{ row.option.description }}</span>
              <span class="purchase-allocation-meta">{{ row.option.quantityOnHand }} on hand</span>
            </div>

            <mat-form-field appearance="outline" class="purchase-allocation-input">
              <mat-label>Quantity</mat-label>
              <input
                matInput
                type="number"
                min="1"
                step="1"
                [(ngModel)]="row.quantity"
                (ngModelChange)="clearError()">
            </mat-form-field>
          </div>
        }
      </div>

      @if (error) {
        <p class="purchase-allocation-error">{{ error }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" type="button" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .purchase-allocation-dialog {
        display: grid;
        gap: 1rem;
        min-width: min(34rem, 82vw);
      }

      .purchase-allocation-summary,
      .purchase-allocation-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .purchase-allocation-summary {
        color: var(--app-text-muted);
        font-weight: 800;
      }

      .purchase-allocation-item,
      .purchase-allocation-description {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .purchase-allocation-count {
        flex: 0 0 auto;
      }

      .purchase-allocation-rows {
        display: grid;
        gap: 0.75rem;
      }

      .purchase-allocation-option {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .purchase-allocation-description {
        font-weight: 800;
      }

      .purchase-allocation-meta,
      .purchase-allocation-error {
        color: var(--app-text-muted);
        font-size: 0.82rem;
        font-weight: 700;
      }

      .purchase-allocation-error {
        margin: 0;
        color: var(--app-warn, #b00020);
      }

      .purchase-allocation-input {
        width: 8rem;
        flex: 0 0 auto;
      }

      @media (max-width: 640px) {
        .purchase-allocation-dialog {
          min-width: 0;
        }

        .purchase-allocation-summary,
        .purchase-allocation-row {
          align-items: stretch;
          flex-direction: column;
        }

        .purchase-allocation-input {
          width: 100%;
        }
      }
    `
  ]
})
export class PurchaseListFulfillmentAllocationDialogComponent {
  private dialogRef = inject(MatDialogRef<
    PurchaseListFulfillmentAllocationDialogComponent,
    PurchaseListFulfillmentAllocation[]
  >);
  readonly data = inject<PurchaseListFulfillmentAllocationDialogData>(MAT_DIALOG_DATA);

  rows: PurchaseListFulfillmentAllocationRow[] = this.initialRows();
  error = '';

  allocatedTotal(): number {
    return this.rows.reduce((total, row) => total + this.normalizedQuantity(row.quantity), 0);
  }

  clearError(): void {
    this.error = '';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    const allocatedTotal = this.allocatedTotal();
    const allocations = this.rows.map(row => ({
      internalId: row.option.internalId,
      quantity: this.normalizedQuantity(row.quantity)
    }));

    if (allocations.some(allocation => allocation.quantity <= 0)) {
      this.error = 'Each selected item needs a quantity.';
      return;
    }

    if (allocatedTotal > this.data.totalNeeded) {
      this.error = `Allocated quantity cannot exceed ${this.data.totalNeeded}.`;
      return;
    }

    this.dialogRef.close(allocations);
  }

  private initialRows(): PurchaseListFulfillmentAllocationRow[] {
    const existingQuantities = new Map(
      this.data.existingAllocations.map(allocation => [allocation.internalId, allocation.quantity]));
    const hasExistingAllocations = this.data.options.some(option =>
      (existingQuantities.get(option.internalId) ?? 0) > 0);
    const defaultQuantities = this.defaultQuantities();

    return this.data.options.map((option, index) => ({
      option,
      quantity: hasExistingAllocations
        ? existingQuantities.get(option.internalId) ?? 0
        : defaultQuantities[index]
    }));
  }

  private defaultQuantities(): number[] {
    const optionCount = Math.max(1, this.data.options.length);
    const baseQuantity = Math.floor(this.data.totalNeeded / optionCount);
    let remainder = this.data.totalNeeded % optionCount;

    return this.data.options.map(() => {
      const quantity = baseQuantity + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      return quantity;
    });
  }

  private normalizedQuantity(quantity: number | string): number {
    const safeQuantity = Math.floor(Number(quantity));

    if (!Number.isFinite(safeQuantity)) {
      return 0;
    }

    return safeQuantity;
  }
}
