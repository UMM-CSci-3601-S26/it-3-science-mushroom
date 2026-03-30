// Angular Imports
import { Component, inject } from '@angular/core';
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
import { RouterLink } from '@angular/router';

// RxJS Imports
import { catchError, of} from 'rxjs';

// Inventory Imports
import { Inventory } from '../inventory/inventory';
import { InventoryService } from '../inventory/inventory.service';
import { MatTableDataSource } from '@angular/material/table';

// Stock Report Imports
import { StockReportTreeComponent } from './stock-report-tree.component';

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
    RouterLink,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    StockReportTreeComponent
  ],
})

export class StockReportComponent {
  private inventoryService = inject(InventoryService);

  dataSource = new MatTableDataSource<Inventory>([]);

  inventory = toSignal <Inventory[]>(
    this.inventoryService.getInventory().pipe(
      catchError(() => of([]))
    )
  );

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

  downloadPDF() {
    console.log('PDF downloaded!');
  }

  finalizeReport() {
    console.log('Report finalized!');
  }
}
