// Angular Imports
import { Component, effect, inject, signal, viewChild, computed } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ScannerComponent } from '../scanner/scanner.component';
import { CommonModule } from '@angular/common';

// RxJS Imports
import { catchError, combineLatest, debounceTime, firstValueFrom, of, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

// Inventory Imports
import { Inventory, SelectOption } from './inventory';
import { InventoryService } from './inventory.service';
import { InventoryIndex } from './inventory-index';

import { MatDialog } from '@angular/material/dialog';
import { ManualEntry, ManualEntryResult } from './manual-entry';


@Component({
  selector: 'app-inventory-component',
  standalone: true,
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
  imports: [
    MatTableModule,
    MatSortModule,
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
    MatPaginatorModule,
    MatAutocompleteModule,
    ScannerComponent,
    CommonModule
  ],
})
export class InventoryComponent {
  displayedColumns: string[] = ['item', 'description', 'brand', 'color', 'size', 'type', 'material', 'packageSize', 'quantity', 'notes'];
  dataSource = new MatTableDataSource<Inventory>([]);
  readonly page = viewChild<MatPaginator>(MatPaginator)
  readonly sort = viewChild<MatSort>(MatSort);

  readonly scannerRef = viewChild(ScannerComponent);

  private snackBar = inject(MatSnackBar);
  private inventoryService = inject(InventoryService);
  private inventoryIndex = inject(InventoryIndex);
  private dialog = inject(MatDialog);

  reload = signal(0);
  showScanner = false;
  scannerProcessing = false;
  constructor() {
    effect(() => {
      const items = this.serverFilteredInventory();
      this.dataSource.data = this.serverFilteredInventory();
      this.dataSource.sort = this.sort();
      this.dataSource.paginator = this.page();

      for (const item of items) {
        this.inventoryIndex.registerItem(item);
      }
    });
  }

  item = signal<string | undefined>(undefined);
  brand = signal<string | undefined>(undefined);
  color = signal<string | undefined>(undefined);
  size = signal<string | undefined>(undefined);
  type = signal<string | undefined>(undefined);
  material = signal<string | undefined>(undefined);
  description = signal<string | undefined>(undefined);
  quantity = signal<number | undefined>(undefined);

  errMsg = signal<string | undefined>(undefined);

  async onScanned(code: string) {
    console.log('scanned item', code)
  }

  async onManualEntryNeeded(event: { barcode: string; quantity: number}) {
    const dialogRef = this.dialog.open(ManualEntry, { data: { barcode: event.barcode, quantity: event.quantity}});
    const result: ManualEntryResult | null = await firstValueFrom(dialogRef.afterClosed());
    this.scannerRef()?.resolveManualEntry(result ?? null);
    this.reload.update(v => v + 1);
  }

  toggleScanner() {
    if (this.showScanner) {
      this.showScanner = false;
    } else {
      this.showScanner = true;
      this.scannerProcessing = false
    }
  }

  onScannerDone() {
    this.scannerProcessing = false;
    this.showScanner = false;
    this.reload.update(v => v + 1);
  }

  addItem(item: Inventory) {
    this.inventoryService.addInventory(item).subscribe(() => {
      this.reload.update(v => v + 1);
    })
  }

  matchItem(barcode: string): Inventory | null {
    return this.inventoryIndex.getByBarcode(barcode);
  }

  private filterOptions(options: SelectOption[], input:string): SelectOption[] {
    if (!input) return options;
    const lower = input.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(lower)||
      option.value.toLowerCase().includes(lower)
    )
  }

  filteredItemOptions = computed(() =>
    this.filterOptions(this.inventoryService.itemOptions(), (this.item() || '').toLowerCase())
  );

  filteredBrandOptions = computed(() =>
    this.filterOptions(this.inventoryService.brandOptions(), (this.brand() || '').toLowerCase())
  );

  filteredColorOptions = computed(() =>
    this.filterOptions(this.inventoryService.colorOptions(), (this.color() || '').toLowerCase())
  );

  filteredSizeOptions = computed(() =>
    this.filterOptions(this.inventoryService.sizeOptions(), (this.size() || '').toLowerCase())
  );

  filteredTypeOptions = computed(() =>
    this.filterOptions(this.inventoryService.typeOptions(), (this.type() || '').toLowerCase())
  );

  filteredMaterialOptions = computed(() =>
    this.filterOptions(this.inventoryService.materialOptions(), (this.material() || '').toLowerCase())
  );


  private item$ = toObservable(this.item);
  private brand$ = toObservable(this.brand);
  private color$ = toObservable(this.color);
  private size$ = toObservable(this.size);
  private type$ = toObservable(this.type);
  private material$ = toObservable(this.material);
  private description$ = toObservable(this.description);
  private quantity$ = toObservable(this.quantity);
  private reload$ = toObservable(this.reload);

  serverFilteredInventory = toSignal(
    combineLatest([this.item$, this.brand$, this.color$, this.size$, this.type$, this.material$, this.description$, this.quantity$, this.reload$]).pipe(
      debounceTime(300),
      switchMap(([ item, brand, color, size, type, material, description, quantity]) =>
        this.inventoryService.getInventory({ item, brand, color, size, type, material, description, quantity})
      ),
      catchError((err) => {
        let message = "Unknown Error";
        if (!(err.error instanceof ErrorEvent)) {
          message = `Problem contacting the server – Error Code: ${err.status}\nMessage: ${err.message}`;
          this.errMsg.set(message);
        }

        this.snackBar.open(message, 'OK', { duration: 6000 });
        return of<Inventory[]>([]);
      })
    ),
    { initialValue: [] }
  );
}
