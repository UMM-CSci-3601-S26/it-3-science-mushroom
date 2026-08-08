import { Component, effect, inject, OnInit, signal, viewChild } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";


// Services
import { PurchaseListService } from "./purchase-list.service";

// Types
import type { PurchaseListItem, PurchaseListSnapshot } from "./purchase-list";

@Component({
  selector: 'app-purchase-component',
  standalone: true,
  templateUrl: './purchase-list.html',
  styleUrls: ['./purchase-list.scss'],
  imports: [
    MatCardModule,
    MatIconModule,
    MatSortModule,
    MatTableModule
  ],
})
export class PurchaseListComponent implements OnInit {

  private purchaseListService = inject(PurchaseListService);

  displayedColumns: string[] = ["description", "quantityToBuy", "fulfillmentPercent"];
  dataSource = new MatTableDataSource<PurchaseListItem>([]);
  readonly sort = viewChild<MatSort>(MatSort);

  purchaseList = signal<PurchaseListSnapshot | null >(null);
  loading = signal(true);
  error = signal(false);

  constructor() {
    effect(() => {
      this.dataSource.data = this.purchaseList()?.items ?? [];
      this.dataSource.sort = this.sort();
    });
  }

  ngOnInit(): void {
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
}
