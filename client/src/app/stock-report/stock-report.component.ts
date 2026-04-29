// Angular Imports
import { Component, computed, inject, ViewChild, signal } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

// RxJS Imports
import { catchError, of, tap } from 'rxjs';

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

// Dialog Imports
import { DialogService } from '../dialog/dialog.service';
import { AuthService } from '../auth/auth-service';

/**
 * StockReportComponent is responsible for displaying the Stock Reports and inventory data in a tree structure.
 * It uses StockReportService to get reports, InventoryService to get inventory data, ReportGeneratorComponent to handle report generation,
 * and converts inventory data into StockNodes for display and management in StockReportTreeComponent.
 */
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
  private dialogService = inject(DialogService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  get canManageStockReports(): boolean {
    return this.authService.hasPermission('manage_stock_reports');
  }

  @ViewChild('reportGenerator') reportGenerator!: ReportGeneratorComponent;

  // Track inventory data load errors
  inventoryError = signal<boolean>(false);

  inventory = toSignal <Inventory[]>(
    this.inventoryService.getInventory().pipe(
      tap(() => this.inventoryError.set(false)),
      catchError((error) => {
        this.inventoryError.set(true);
        this.snackBar.open(
          'Error loading inventory data from server. Please try again later.',
          'Close',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
        console.error('Error loading inventory:', error);
        return of([]);
      })
    )
  );

  reports = toSignal<StockReport[]>(
    this.reportService.reports$.pipe(
      catchError(() => of([]))
    )
  );

  // Compute PDF and XLSX reports separately for easier display
  pdfReports = computed(() => {
    return this.reports()?.filter(report => report.reportType === 'PDF') ?? [];
  });

  xlsxReports = computed(() => {
    return this.reports()?.filter(report => report.reportType === 'XLSX') ?? [];
  });

  constructor() {
    this.reportService.refreshReports().subscribe();
  }

  /**
   * Download single report as PDF/XLSX. Uses the Report Generator's method, passing along the report to download
   * @param report The report to download
   */
  downloadSingleReport(report: StockReport) {
    if (!this.reportGenerator || !report) return;

    if (report.reportType === 'PDF') {
      this.reportGenerator.downloadSingleReport(report);
      this.snackBar.open(
        `Downloading report ${report.reportName} as PDF file...`,
        `Okay`,
        { duration: 2000 }
      );
    } else if (report.reportType === 'XLSX') {
      this.reportGenerator.downloadSingleReport(report);
      this.snackBar.open(
        `Downloading report ${report.reportName} as XLSX file...`,
        `Okay`,
        { duration: 2000 }
      );
    }
  }

  /**
   * Delete a single report. Uses the Report Generator's method, passing along the report to delete
   * @param report The report to delete
   */
  deleteSingleReport(report: StockReport) {
    if (!this.canManageStockReports) {
      this.snackBar.open('You do not have permission to delete stock reports.', 'Okay', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialogService.openDialog({
      title: 'Confirm Delete Single',
      reportName: report.reportName,
      message: `Are you sure you want to delete the report ${report.reportName}?`,
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm',
    }, '400px', '200px');

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.reportGenerator || !report) return;
        this.reportGenerator.deleteSingleReport(report);
        this.snackBar.open(
          `Deleting report ${report.reportName}...`,
          `Okay`,
          { duration: 2000 }
        );
      }
    });
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
      })).sort((a, b) => a.description!.localeCompare(b.description!)) // Sort descriptions alphabetically
    })).sort((a, b) => a.item!.localeCompare(b.item!)); // Sort items alphabetically by item name
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
      ?.filter(item => item.stockState === 'Understocked') ?? [];
    return this.groupInventoryByItem(filtered);
  });

  overStockedItems = computed(() => {
    const filtered = this.inventory()
      ?.filter(item => item.stockState === 'Overstocked') ?? [];
    return this.groupInventoryByItem(filtered);
  });
}
