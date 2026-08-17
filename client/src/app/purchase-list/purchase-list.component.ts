import { Component, effect, inject, OnInit, signal, viewChild } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";


// Services
import { PurchaseListService } from "./purchase-list.service";

// Types
import type { PurchaseListItem, PurchaseListSnapshot } from "./purchase-list";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";

@Component({
  selector: 'app-purchase-component',
  standalone: true,
  templateUrl: './purchase-list.html',
  styleUrls: ['./purchase-list.scss'],
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSortModule,
    MatTableModule,
    MatButtonModule
  ],
})
export class PurchaseListComponent implements OnInit {

  private purchaseListService = inject(PurchaseListService);
  private snackBar = inject(MatSnackBar);
  displayedColumns: string[] = [
    "description",
    "totalNeeded",
    "quantityOnHand",
    "quantityToBuy",
    "fulfillmentPercent"
  ];
  expandedDetailColumns: string[] = [
    "expandedDetail"
  ];
  dataSource = new MatTableDataSource<PurchaseListItem>([]);
  readonly sort = viewChild<MatSort>(MatSort);

  purchaseList = signal<PurchaseListSnapshot | null >(null);
  searchQuery = signal('');
  loading = signal(true);
  error = signal(false);
  calculating = signal(false);
  expandedRow = signal<PurchaseListItem | null>(null);

  constructor() {
    this.dataSource.filterPredicate = (item, filter) =>
      this.searchablePurchaseItemDescription(item).includes(filter);

    effect(() => {
      this.dataSource.data = this.purchaseList()?.items ?? [];
      this.dataSource.sort = this.sort();
      this.dataSource.filter = this.normalizedSearchQuery(this.searchQuery());
    });
  }

  fetchPurchaseList() {
    this.purchaseListService.getPurchaseList().subscribe({
      next: purchaseList => {
        this.purchaseList.set(purchaseList);
        this.error.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.purchaseList.set(null);
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  calculateCurrentPurchaseList() {
    this.calculating.set(true);
    this.purchaseListService.calculatePurchaseList().subscribe({
      next: purchaseList => {
        this.purchaseList.set(purchaseList);
        this.calculating.set(false);
        this.loading.set(false);
        this.error.set(false);
        this.snackBar.open('Calculated purchase list', 'OK', { duration: 6000 });
      },
      error: () => {
        this.calculating.set(false);
        this.loading.set(false);
        this.snackBar.open('Failed to calculate purchase list', 'OK', { duration : 8000 });
      }
    });
  }

  applySearch(query: string): void {
    this.searchQuery.set(query);
    this.dataSource.filter = this.normalizedSearchQuery(query);
  }

  clearSearch(): void {
    this.applySearch('');
  }

  hasMultipleFulfillmentOptions(item: PurchaseListItem): boolean {
    return item.linkedInventoryIds.length > 1;
  }

  toggleExpansion(row: PurchaseListItem): void {
    if (!this.isExpandable(row)) {
      return;
    }

    this.expandedRow.set(this.expandedRow() === row ? null : row);
  }

  ngOnInit(): void {
    this.fetchPurchaseList();
  }

  isExpandable(item: PurchaseListItem): boolean {
    return this.hasMultipleFulfillmentOptions(item);
  }

  private searchablePurchaseItemDescription(item: PurchaseListItem): string {
    return item.description.toLowerCase();
  }

  private normalizedSearchQuery(query: string): string {
    return query.trim().toLowerCase();
  }
}
