import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Inventory } from '../../inventory/inventory';
import { InventoryService } from '../../inventory/inventory.service';

export interface SupplyListInventoryLinkFilters {
  item?: string;
  brand?: string;
  color?: string;
  size?: string;
  type?: string;
  material?: string;
}

export interface SupplyListInventoryLinkDialogData {
  requirementLabel: string;
  selectedInventoryIds: string[];
  actionLabel?: string;
  filters: SupplyListInventoryLinkFilters;
}

@Component({
  selector: 'app-supply-list-inventory-link-dialog',
  standalone: true,
  templateUrl: './supply-list-inventory-link-dialog.component.html',
  styleUrls: ['./supply-list-inventory-link-dialog.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ]
})
export class SupplyListInventoryLinkDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<SupplyListInventoryLinkDialogComponent, string[]>);
  private inventoryService = inject(InventoryService);
  readonly data = inject<SupplyListInventoryLinkDialogData>(MAT_DIALOG_DATA);

  itemFilter = this.data.filters.item ?? '';
  brandFilter = this.data.filters.brand ?? '';
  colorFilter = this.data.filters.color ?? '';
  sizeFilter = this.data.filters.size ?? '';
  typeFilter = this.data.filters.type ?? '';
  materialFilter = this.data.filters.material ?? '';

  readonly inventory = signal<Inventory[]>([]);
  readonly selectedInventoryIds = signal<string[]>(this.sanitizeInventoryIds(this.data.selectedInventoryIds));
  readonly loading = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly actionLabel = this.data.actionLabel ?? 'Save Links';

  ngOnInit(): void {
    this.searchInventory();
  }

  searchInventory(): void {
    this.loading.set(true);
    this.error.set(undefined);

    this.inventoryService.getInventory(this.currentFilters()).subscribe({
      next: inventory => {
        this.inventory.set(inventory);
        this.loading.set(false);
      },
      error: () => {
        this.inventory.set([]);
        this.loading.set(false);
        this.error.set('Inventory search failed.');
      }
    });
  }

  clearFilters(): void {
    this.itemFilter = '';
    this.brandFilter = '';
    this.colorFilter = '';
    this.sizeFilter = '';
    this.typeFilter = '';
    this.materialFilter = '';
    this.searchInventory();
  }

  toggleInventory(item: Inventory, checked: boolean): void {
    if (!item.internalID) {
      return;
    }

    if (checked) {
      this.selectedInventoryIds.update(ids => this.sanitizeInventoryIds([...ids, item.internalID]));
    } else {
      this.removeInventoryId(item.internalID);
    }
  }

  removeInventoryId(inventoryId: string): void {
    this.selectedInventoryIds.update(ids => ids.filter(id => id !== inventoryId));
  }

  selectVisibleInventory(): void {
    const visibleIds = this.inventory()
      .map(item => item.internalID)
      .filter((id): id is string => !!id);
    this.selectedInventoryIds.update(ids => this.sanitizeInventoryIds([...ids, ...visibleIds]));
  }

  clearSelectedInventory(): void {
    this.selectedInventoryIds.set([]);
  }

  isSelected(item: Inventory): boolean {
    return !!item.internalID && this.selectedInventoryIds().includes(item.internalID);
  }

  selectedInventoryLabel(inventoryId: string): string {
    const item = this.inventory().find(inv => inv.internalID === inventoryId);
    if (!item) {
      return inventoryId;
    }
    return `${this.bestDescription(item)} - ${inventoryId}`;
  }

  bestDescription(item: Inventory): string {
    return item.description || item.item || 'Inventory item';
  }

  inventoryDetails(item: Inventory): string {
    return [
      item.internalID,
      `${item.quantity} on hand`,
      item.packageSize && item.packageSize > 1 ? `${item.packageSize} count` : undefined
    ].filter(Boolean).join(' - ');
  }

  save(): void {
    this.dialogRef.close(this.selectedInventoryIds());
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private currentFilters(): SupplyListInventoryLinkFilters {
    return {
      item: this.cleanFilter(this.itemFilter),
      brand: this.cleanFilter(this.brandFilter),
      color: this.cleanFilter(this.colorFilter),
      size: this.cleanFilter(this.sizeFilter),
      type: this.cleanFilter(this.typeFilter),
      material: this.cleanFilter(this.materialFilter)
    };
  }

  private cleanFilter(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed && trimmed !== 'N/A' ? trimmed : undefined;
  }

  private sanitizeInventoryIds(ids: string[] | undefined): string[] {
    const sanitized: string[] = [];

    for (const id of ids ?? []) {
      const trimmed = id?.trim();
      if (trimmed && !sanitized.includes(trimmed)) {
        sanitized.push(trimmed);
      }
    }

    return sanitized;
  }
}
