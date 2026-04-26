// Angular Imports
import { Component, effect, inject, signal, viewChild, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';


// RxJS Imports
import { catchError, combineLatest, debounceTime, firstValueFrom, of, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

// Inventory Imports
import { Inventory, SelectOption } from './inventory';
import { InventoryService } from './inventory.service';
import { InventoryIndex } from './inventory-index';
import { BarcodePrintDialog } from './barcode-print-dialog';
import { MatDialog } from '@angular/material/dialog';
import { ManualEntry, ManualEntryResult } from './manual-entry';

type ScanCard = {
  id: string;
  barcode: string;
  item: Inventory | null;
  removeAmount: number;
  foundInInventory: boolean;
  mode: 'add' | 'remove';
};


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
    MatSlideToggleModule,
    ScannerComponent,
    CommonModule,
    MatButtonToggleModule
  ],
})
export class InventoryComponent {
  displayedColumnsDetailed: string[] = ['item', 'description', 'brand', 'color', 'size', 'type', 'material', 'packageSize', 'quantity', 'notes'];
  displayedColumnsSimple: string[] = ['description', 'quantity', 'notes'];
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
      const items = this.displayedInventory();
      this.dataSource.data = items;
      this.dataSource.sort = this.sort();
      this.dataSource.paginator = this.page();

      this.inventoryIndex.clear();

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
  showNAValues = signal(true);
  viewType = signal<'detailed' | 'simple'>('detailed');

  errMsg = signal<string | undefined>(undefined);

  scannerAction = signal<'add' | 'remove'>('add');
  scanCards = signal<ScanCard[]>([]);
  removeAmount: number;
  showRemovePanel = signal(false);

  //This will open the barcode print dialog page
  async openBarcodePrintDialog() {
    const dialogRef = this.dialog.open(BarcodePrintDialog, {
      data: {
        items: this.displayedInventory()
      }
    });

    const selectedItems = await firstValueFrom(dialogRef.afterClosed());

    if (selectedItems?.length) {
      this.printBarcodeItems(selectedItems);
    }
  }

  getPrintableBarcodeValue(item: Inventory): string | undefined {
    return item.internalBarcode;
  }

  printBarcodeItems(items: Inventory[]): void {
    const printableItems = items.map(
      item => ({
        item,
        barcode: this.getPrintableBarcodeValue(item)
      })
    ).filter(printable => printable.barcode);

    console.log("printable barcode items: ", printableItems)
  }

  async onScanned(code: string) {
    console.log('scanned item', code);

    if (this.scannerAction() === 'remove') {
      const matched = this.matchItem(code);
      const mode = this.scannerAction();

      console.log('REMOVE LOOKUP DEBUG', {
        scannedCode: code,
        matchedInternalID: matched?.internalID,
        matchedInternalBarcode: matched?.internalBarcode,
        matchedItem: matched?.item,
        matchedBrand: matched?.brand,
        matchedExternalBarcode: matched?.externalBarcode
      });

      if (mode === 'remove' && !matched) {
        this.scannerRef()?.clearHandheldInput?.();
        this.scannerRef()?.removeScannedItem?.(code);
        this.snackBar.open("Item not found for scanned barcode", "OK", { duration: 3000});
        return;
      }
      const newCard: ScanCard = {
        id: `${code}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        barcode: code,
        item: matched ?? null,
        removeAmount: 1,
        foundInInventory: !!matched,
        mode
      };

      this.scanCards.update(cards => [...cards, newCard]);

      if (mode === 'remove') {
        this.showRemovePanel.set(true);
      }
    }
  }
  updateCardRemoveAmount(cardId: string, value: number) {
    const safeValue = Number(value);

    this.scanCards.update(cards =>
      cards.map(card =>
        card.id === cardId
          ? { ...card, removeAmount: safeValue > 0 ? safeValue : 1 }
          : card
      )
    );
  }
  confirmSingleRemove(cardId: string) {
    const card = this.scanCards().find(c => c.id === cardId);

    if (!card || card.mode !== 'remove' || !card.item) {
      this.snackBar.open("This card cannot be removed from inventory", 'OK', { duration : 3000});
      return;
    }
    if (!card.removeAmount || card.removeAmount < 1) {
      this.snackBar.open('Enter a valid remove amount.', 'OK', { duration: 3000 });
      return;
    }

    if (card.removeAmount > card.item.quantity) {
      this.snackBar.open(
        `Cannot remove more than current quantity for ${card.item.item}.`,
        'OK',
        { duration: 3000 }
      );
      return;
    }

    this.inventoryService.removeInventoryById(card.item.internalID, card.removeAmount).subscribe({
      next: () => {
        this.snackBar.open(`Removed ${card.removeAmount} from ${card.item?.item}.`, 'OK', {
          duration: 3000
        });

        this.scanCards.update(cards => cards.filter(c => c.id !== cardId));

        this.scannerRef()?.removeScannedItem?.(card.barcode);

        if (this.scanCards().length === 0) {
          this.showRemovePanel.set(false);
        }

        this.reload.update(v => v + 1);
      },
      error: (err) => {
        console.error('single remove failed', err);
        this.snackBar.open('Failed to remove inventory item.', 'OK', { duration: 4000 });
      }
    });
  }

  removeCard(cardId: string) {
    this.scanCards.update(cards => {
      const updated = cards.filter(card => card.id !== cardId);

      if (updated.length === 0) {
        this.showRemovePanel.set(false);
      }
      return updated;
    })
  }

  clearAllCards() {
    this.scanCards.set([]);
    this.showRemovePanel.set(false);
  }

  openRemoveScanner() {
    this.scannerAction.set('remove');
    this.showScanner = true;
    this.scannerProcessing = false;
    this.showRemovePanel.set(false);
    this.scanCards.set([]);
    this.scannerRef()?.clearScans?.();
  }

  confirmRemove() {
    const validRemoveCards = this.scanCards().filter(
      card => card.mode === 'remove' && card.foundInInventory && card.item
    );

    if (!validRemoveCards.length) {
      this.snackBar.open('No valid items selected for removal.', 'OK', { duration: 3000 });
      return;
    }

    for (const card of validRemoveCards) {
      if (!card.item) continue;

      if (!card.removeAmount || card.removeAmount < 1) {
        this.snackBar.open(`Invalid amount for barcode ${card.barcode}.`, 'OK', { duration: 3000 });
        return;
      }

      if (card.removeAmount > card.item.quantity) {
        this.snackBar.open(
          `Cannot remove more than current quantity for ${card.item.item}.`,
          'OK',
          { duration: 3000 }
        );
        return;
      }
    }

    const requests = validRemoveCards.map(card =>
      firstValueFrom(
        this.inventoryService.removeInventoryById(card.item!.internalID, card.removeAmount)
      )
    );

    Promise.all(requests)
      .then(() => {
        this.snackBar.open('Inventory updated.', 'OK', { duration: 3000 });
        this.scanCards.set([]);
        this.showRemovePanel.set(false);
        this.showScanner = false;
        this.scannerProcessing = false;
        this.scannerRef()?.clearScans?.();
        this.reload.update(v => v + 1);
      })
      .catch((err) => {
        console.error('remove failed', err);
        this.snackBar.open('Failed to remove inventory.', 'OK', { duration: 4000 });
      });
  }

  cancelRemove() {
    this.scanCards.set([]);
    this.showRemovePanel.set(false);
  }

  async onManualEntryNeeded(event: { barcode: string; quantity: number}) {
    const dialogRef = this.dialog.open(ManualEntry, { data: { barcode: event.barcode, quantity: event.quantity}});
    const result: ManualEntryResult | null = await firstValueFrom(dialogRef.afterClosed());
    this.scannerRef()?.resolveManualEntry(result ?? undefined);
    this.reload.update(v => v + 1);
  }

  toggleScanner() {
    if (this.showScanner) {
      this.showScanner = false;
      return;
    }
    this.scannerAction.set('add');
    this.showScanner = true;
    this.scannerProcessing = false;
    this.showRemovePanel.set(false);
    this.scanCards.set([]);
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
  trackByScanCard(index: number, card: ScanCard): string {
    return card.id;
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

  displayedInventory = computed(() => {
    return this.serverFilteredInventory();
  });

  displayCellValue(value: string | number | null | undefined): string | number {
    if (typeof value === 'string' && !this.showNAValues() && value.trim().toLowerCase() === 'n/a') {
      return '';
    }

    return value ?? '';
  }

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
