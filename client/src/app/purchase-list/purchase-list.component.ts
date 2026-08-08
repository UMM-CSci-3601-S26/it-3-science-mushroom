import { Component, inject, OnInit, signal } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";


// Services
import { PurchaseListService } from "./purchase-list.service";

// Types
import type { PurchaseListSnapshot } from "./purchase-list";

@Component({
  selector: 'app-purchase-component',
  standalone: true,
  templateUrl: './purchase-list.html',
  styleUrls: ['./purchase-list.scss'],
  imports: [
    MatCardModule,
    MatIconModule
  ],
})
export class PurchaseListComponent implements OnInit {

  private purchaseListService = inject(PurchaseListService);

  purchaseList = signal<PurchaseListSnapshot | null >(null);
  loading = signal(true);
  error = signal(false);

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
