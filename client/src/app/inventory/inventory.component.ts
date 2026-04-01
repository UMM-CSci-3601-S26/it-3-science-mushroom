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
import { catchError, combineLatest, debounceTime, of, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

// Inventory Imports
import { Inventory, SelectOption } from './inventory';
import { InventoryService } from './inventory.service';
import { InventoryIndex } from './inventory-index';


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
  displayedColumns: string[] = ['item', 'description', 'brand', 'color', 'size', 'type', 'material', 'count', 'quantity', 'notes'];
  dataSource = new MatTableDataSource<Inventory>([]);
  readonly page = viewChild<MatPaginator>(MatPaginator)
  readonly sort = viewChild<MatSort>(MatSort);

  private snackBar = inject(MatSnackBar);
  private inventoryService = inject(InventoryService);
  private inventoryIndex = inject(InventoryIndex);

  showScanner = false;

  constructor() {
    effect(() => {
      this.dataSource.data = this.serverFilteredInventory();
      this.dataSource.sort = this.sort();
      this.dataSource.paginator = this.page();
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

  onScanned(code: string) {
    this.inventoryService.addByScanAndUpdate(code); // This needs to be fixed
    this.showScanner = false; // optional: close scanner after scan
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

  serverFilteredInventory = toSignal(
    combineLatest([this.item$, this.brand$, this.color$, this.size$, this.type$, this.material$, this.description$, this.quantity$]).pipe(
      debounceTime(300),
      switchMap(([ item, brand, color, size, type, material]) =>
        this.inventoryService.getInventory({ item, brand, color, size, type, material})
      ),
      catchError((err) => {
        if (!(err.error instanceof ErrorEvent)) {
          this.errMsg.set(
            `Problem contacting the server – Error Code: ${err.status}\nMessage: ${err.message}`
          )
        };
        this.snackBar.open(this.errMsg(), 'OK', { duration: 6000 });
        return of<Inventory[]>([]);
      })
    ),
    { initialValue: [] }
  );
}
