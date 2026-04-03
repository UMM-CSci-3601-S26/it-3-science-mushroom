// Angular Imports
import { Component, computed, inject, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
//import { MatTableDataSource } from '@angular/material/table';

// RxJS Imports
import { catchError, of} from 'rxjs';

// Inventory Imports
import { Inventory } from '../inventory/inventory';
import { InventoryService } from '../inventory/inventory.service';

// Stock Report Imports
import { StockReportTreeComponent } from './stock-report-tree.component';
import { StockNode } from './stock-report-tree.component';
import { StockReportService } from './stock-report.service';
import { StockReport } from './stock-report';

// PDF Generator Imports
import { ReportGeneratorComponent } from './report-generator/report-generator.component';

@Component({
  selector: 'app-stock-report',
  templateUrl: './stock-report.component.html',
  styleUrls: ['./stock-report.component.scss'],
  providers: [],
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatOptionModule,
    MatRadioModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    StockReportTreeComponent,
    ReportGeneratorComponent
  ],
})

export class StockReportComponent {
  private inventoryService = inject(InventoryService);
  private reportService = inject(StockReportService);

  inventory = toSignal <Inventory[]>(
    this.inventoryService.getInventory().pipe(
      catchError(() => of([]))
    )
  );

  reports = toSignal<StockReport[]>(
    this.reportService.getReports().pipe(
      catchError(() => of([]))
    )
  );

  @ViewChild('reportGenerator') reportGenerator!: ReportGeneratorComponent;
  downloadSingleReport(report: StockReport) {
    if (!this.reportGenerator || !report) return;
    this.reportGenerator.downloadSinglePdfReport(report);
  }

  /**
   * Group inventory items by their "Item" field.
   * Each group becomes a StockNode with the item name as the "item" field, and its children are the inventory items with that name.
   * Each inventory item is represented as a StockNode with the description as the "description" field.
   * Its children are the quantity, max quantity, and min quantity as StockNodes with their respective labels.
   * @param items A list of inventory items to group
   * @returns An array of StockNodes grouped by item name
   */
  private groupInventoryByItem(items: Inventory[]): StockNode[] {
    // Group items by item name
    const groupedByItem = new Map<string, Inventory[]>();
    items.forEach(item => {
      const itemKey = item.item;
      if (!groupedByItem.has(itemKey)) {
        groupedByItem.set(itemKey, []);
      }
      groupedByItem.get(itemKey)!.push(item);
    });

    // Convert grouped items to StockNodes
    return Array.from(groupedByItem.entries()).map(([itemName, itemGroup]) => ({
      item: itemName,
      children: itemGroup.map(inventoryItem => ({
        description: inventoryItem.description,
        children: [
          { quantity: inventoryItem.quantity, label: '- Current Quantity' },
          { maxQuantity: inventoryItem.maxQuantity, label: '- Max Quantity' },
          { minQuantity: inventoryItem.minQuantity, label: '- Min Quantity' },
        ]
      }))
    }));
  }

  // Compute tree nodes from inventory data
  // Each stock state gets its own, grouped by item name
  stockedItems = computed(() => {
    const filtered = this.inventory()
      ?.filter(item => item.stockState === 'Stocked') ?? [];
    return this.groupInventoryByItem(filtered);
  });

  outOfStockItems = computed(() => {
    const filtered = this.inventory()
      ?.filter(item => item.stockState === 'Out of Stock') ?? [];
    return this.groupInventoryByItem(filtered);
  });

  underStockedItems = computed(() => {
    const filtered = this.inventory()
      ?.filter(item => item.stockState === 'Under-Stocked') ?? [];
    return this.groupInventoryByItem(filtered);
  });

  overStockedItems = computed(() => {
    const filtered = this.inventory()
      ?.filter(item => item.stockState === 'Over-Stocked') ?? [];
    return this.groupInventoryByItem(filtered);
  });

  // downloadCSV() {
  //   this.familyService.exportFamilies().subscribe(csvData => {
  //     const blob = new Blob([csvData], { type: 'text/csv' });
  //     const url = window.URL.createObjectURL(blob);

  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = 'families.csv';
  //     a.click();

  //     window.URL.revokeObjectURL(url);
  //   });
  // }
}
