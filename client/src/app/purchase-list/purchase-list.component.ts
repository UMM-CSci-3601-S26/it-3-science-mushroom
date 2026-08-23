import { Component, effect, inject, OnInit, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import type { PurchaseListItem, PurchaseListSnapshot } from './purchase-list';
import { PurchaseListService } from './purchase-list.service';
import { PurchaseListSourceInfoDialogComponent } from './purchase-list-source-info-dialog.component';

@Component({
  selector: 'app-purchase-component',
  standalone: true,
  templateUrl: './purchase-list.html',
  styleUrls: ['./purchase-list.scss'],
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule
  ]
})
export class PurchaseListComponent implements OnInit {
  private purchaseListService = inject(PurchaseListService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = [
    'description',
    'totalNeeded',
    'quantityOnHand',
    'quantityToBuy',
    'fulfillmentPercent',
    'sources'
  ];
  dataSource = new MatTableDataSource<PurchaseListItem>([]);
  readonly sort = viewChild<MatSort>(MatSort);

  purchaseList = signal<PurchaseListSnapshot | null>(null);
  searchQuery = signal('');
  loading = signal(true);
  error = signal(false);
  calculating = signal(false);

  constructor() {
    this.dataSource.filterPredicate = (item, filter) =>
      item.description.toLowerCase().includes(filter);

    effect(() => {
      this.dataSource.data = this.purchaseList()?.items ?? [];
      this.dataSource.sort = this.sort();
      this.dataSource.filter = this.normalizedSearchQuery(this.searchQuery());
    });
  }

  ngOnInit(): void {
    this.fetchPurchaseList();
  }

  openSourceInfoDialog(item: PurchaseListItem): void {
    this.dialog.open(PurchaseListSourceInfoDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      data: {
        itemDescription: item.description,
        sources: item.sources ?? []
      }
    });
  }

  fetchPurchaseList(): void {
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

  calculateCurrentPurchaseList(): void {
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
        this.snackBar.open('Failed to calculate purchase list', 'OK', { duration: 8000 });
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

  unitCountLabel(quantity: number): string {
    return `${quantity} ${quantity === 1 ? 'unit' : 'units'}`;
  }

  quantityToBuyLabel(item: PurchaseListItem): string {
    return `${item.quantityToBuy} ${item.quantityToBuyUnit || this.unitWord(item.quantityToBuy)}`;
  }

  private normalizedSearchQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  private unitWord(quantity: number): string {
    return quantity === 1 ? 'unit' : 'units';
  }
}
