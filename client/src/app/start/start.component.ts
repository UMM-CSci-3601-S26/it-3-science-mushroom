import { Component, inject } from '@angular/core';
import { AdvancedFilterComponent } from '../SharedComponents/advanced-filter/advanced-filter.component';
import { SchemaTableComponent } from '../SharedComponents/schema-table/schema-table.component';
import { FilterField } from '../app.type';
import { InventoryService } from '../inventory/inventory.service';
import { Inventory } from '../inventory/inventory';

@Component({
  selector: 'app-start',
  standalone: true,
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss'],
  imports: [AdvancedFilterComponent, SchemaTableComponent]
})
export class StartComponent {
  private inventoryService = inject(InventoryService);

  filterFields: FilterField[] = [
    { key: 'item', label: 'Item', type: 'text' },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'material', label: 'Material', type: 'text' }
  ];

  tableColumns: FilterField[] = [
    { key: 'item', label: 'Item', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'material', label: 'Material', type: 'text' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'text' }
  ];

  inventoryItems = this.inventoryService.inventory;
  filteredItems: Inventory[] = [];
}
