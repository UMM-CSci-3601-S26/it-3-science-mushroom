import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';

import { Inventory } from '../inventory/inventory';
import { InventoryService } from '../inventory/inventory.service';
import { ScanService } from '../scanner/scan-service';
import { ToteEntryView, Tote } from './tote';
import { ToteService } from './tote.service';

@Component({
  selector: 'app-tote',
  standalone: true,
  templateUrl: './tote.component.html',
  styleUrls: ['./tote.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatTableModule
  ]
})
export class ToteComponent implements OnInit {
  private toteService = inject(ToteService);
  private inventoryService = inject(InventoryService);
  private scanService = inject(ScanService);
  private snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['item', 'brand', 'size', 'quantity', 'actions'];

  readonly loading = signal(false);
  readonly errMsg = signal<string | undefined>(undefined);
  readonly inventoryItems = signal<Inventory[]>([]);
  readonly currentTote = signal<Tote | undefined>(undefined);
  readonly resolvedItem = signal<Inventory | undefined>(undefined);

  toteBarcodeInput = '';
  newToteName = '';
  newToteNotes = '';

  itemBarcodeInput = '';
  itemQuantity = 1;

  moveTargetBarcode = '';
  moveQuantity = 1;
  readonly moveItemInternalID = signal('');

  readonly inventoryMap = computed(() => {
    return new Map(this.inventoryItems().map(item => [item.internalID, item]));
  });

  readonly contentsView = computed<ToteEntryView[]>(() => {
    const currentTote = this.currentTote();
    if (!currentTote) {
      return [];
    }

    const inventoryMap = this.inventoryMap();

    return currentTote.contents.map(entry => {
      const item = inventoryMap.get(entry.internalID);

      return {
        ...entry,
        item: item?.item ?? entry.internalID,
        brand: item?.brand ?? 'Unknown',
        size: item?.size ?? 'Unknown',
        color: item?.color ?? 'Unknown',
        type: item?.type ?? 'Unknown',
        material: item?.material ?? 'Unknown',
        description: item?.description ?? 'Item details unavailable',
        internalBarcode: item?.internalBarcode
      };
    });
  });

  readonly moveItem = computed(() => {
    if (!this.moveItemInternalID()) {
      return undefined;
    }

    return this.contentsView().find(entry => entry.internalID === this.moveItemInternalID());
  });

  ngOnInit(): void {
    void this.refreshInventory();
  }

  async refreshInventory(): Promise<void> {
    try {
      const items = await firstValueFrom(this.inventoryService.getInventory());
      this.inventoryItems.set(items);
    } catch (error) {
      this.handleError('Unable to load inventory for tote management.', error);
    }
  }

  async openTote(): Promise<void> {
    const toteBarcode = this.normalizeToteBarcode(this.toteBarcodeInput);
    if (!toteBarcode) {
      this.handleError('Scan or enter a tote barcode first.');
      return;
    }

    this.loading.set(true);
    this.errMsg.set(undefined);

    try {
      const tote = await firstValueFrom(this.toteService.getTote(toteBarcode));
      this.currentTote.set(tote);
      this.toteBarcodeInput = tote.toteBarcode;
      this.newToteName = tote.name ?? '';
      this.newToteNotes = tote.notes ?? '';
      this.clearResolvedItem();
      this.moveItemInternalID.set('');
      this.showMessage(`Opened ${tote.toteBarcode}.`);
    } catch (error) {
      this.currentTote.set(undefined);
      this.handleError(`Could not find tote ${toteBarcode}. Create it first if it does not exist.`, error);
    } finally {
      this.loading.set(false);
    }
  }

  async createTote(): Promise<void> {
    const toteBarcode = this.normalizeToteBarcode(this.toteBarcodeInput);
    if (!toteBarcode) {
      this.handleError('Scan or enter a tote barcode before creating a tote.');
      return;
    }

    this.loading.set(true);
    this.errMsg.set(undefined);

    try {
      const tote = await firstValueFrom(
        this.toteService.createTote(toteBarcode, this.cleanOptionalText(this.newToteName), this.cleanOptionalText(this.newToteNotes))
      );
      this.currentTote.set(tote);
      this.toteBarcodeInput = tote.toteBarcode;
      this.clearResolvedItem();
      this.moveItemInternalID.set('');
      this.showMessage(`Created ${tote.toteBarcode}.`);
    } catch (error) {
      this.handleError(`Unable to create tote ${toteBarcode}.`, error);
    } finally {
      this.loading.set(false);
    }
  }

  async resolveItemBarcode(): Promise<void> {
    const barcode = this.normalizeBarcode(this.itemBarcodeInput);
    if (!barcode) {
      this.handleError('Scan or enter an item barcode first.');
      return;
    }

    try {
      const item = await firstValueFrom(this.inventoryService.lookUpByBarcode(barcode));
      this.resolvedItem.set(item);
      this.itemBarcodeInput = barcode;
      this.showMessage(`Selected ${item.item}.`);
    } catch (error) {
      this.resolvedItem.set(undefined);
      this.handleError(`No inventory item was found for barcode ${barcode}.`, error);
    }
  }

  async addResolvedItemToTote(): Promise<void> {
    const tote = this.currentTote();
    const item = this.resolvedItem();

    if (!tote) {
      this.handleError('Open a tote before adding items.');
      return;
    }

    if (!item) {
      this.handleError('Resolve an item barcode before adding to a tote.');
      return;
    }

    const quantity = this.normalizeQuantity(this.itemQuantity);

    try {
      await firstValueFrom(this.toteService.addToTote(tote.toteBarcode, item.internalID, quantity));
      await this.reloadCurrentTote();
      this.showMessage(`Added ${quantity} of ${item.item} to ${tote.toteBarcode}.`);
    } catch (error) {
      this.handleError(`Unable to add ${item.item} to ${tote.toteBarcode}.`, error);
    }
  }

  async removeResolvedItemFromTote(): Promise<void> {
    const tote = this.currentTote();
    const item = this.resolvedItem();

    if (!tote) {
      this.handleError('Open a tote before removing items.');
      return;
    }

    if (!item) {
      this.handleError('Choose an item before removing it from a tote.');
      return;
    }

    const quantity = this.normalizeQuantity(this.itemQuantity);

    try {
      await firstValueFrom(this.toteService.removeFromTote(tote.toteBarcode, item.internalID, quantity));
      await this.reloadCurrentTote();
      this.showMessage(`Removed ${quantity} of ${item.item} from ${tote.toteBarcode}.`);
    } catch (error) {
      this.handleError(`Unable to remove ${item.item} from ${tote.toteBarcode}.`, error);
    }
  }

  useEntryForAction(entry: ToteEntryView): void {
    const item = this.inventoryMap().get(entry.internalID);
    if (!item) {
      this.handleError('That inventory item could not be resolved from the local inventory list.');
      return;
    }

    this.resolvedItem.set(item);
    this.itemBarcodeInput = item.internalBarcode ?? entry.internalID;
    this.itemQuantity = 1;
  }

  prepareMove(entry: ToteEntryView): void {
    this.moveItemInternalID.set(entry.internalID);
    this.moveQuantity = 1;
  }

  async moveSelectedItem(): Promise<void> {
    const currentTote = this.currentTote();
    const moveItem = this.moveItem();
    const destinationBarcode = this.normalizeToteBarcode(this.moveTargetBarcode);

    if (!currentTote) {
      this.handleError('Open a tote before moving items.');
      return;
    }

    if (!moveItem) {
      this.handleError('Choose an item from the tote before moving it.');
      return;
    }

    if (!destinationBarcode) {
      this.handleError('Scan or enter the destination tote barcode.');
      return;
    }

    const quantity = this.normalizeQuantity(this.moveQuantity);

    try {
      await firstValueFrom(this.toteService.moveBetweenTotes({
        formToteBarcode: currentTote.toteBarcode,
        toToteBarcode: destinationBarcode,
        internalID: moveItem.internalID,
        quantity
      }));
      await this.reloadCurrentTote();
      this.showMessage(`Moved ${quantity} of ${moveItem.item} to ${destinationBarcode}.`);
      this.moveTargetBarcode = '';
      this.moveQuantity = 1;
      this.moveItemInternalID.set('');
    } catch (error) {
      this.handleError(`Unable to move ${moveItem.item} to ${destinationBarcode}.`, error);
    }
  }

  clearResolvedItem(): void {
    this.resolvedItem.set(undefined);
    this.itemBarcodeInput = '';
    this.itemQuantity = 1;
  }

  private async reloadCurrentTote(): Promise<void> {
    const tote = this.currentTote();
    if (!tote) {
      return;
    }

    const refreshed = await firstValueFrom(this.toteService.getTote(tote.toteBarcode));
    this.currentTote.set(refreshed);
  }

  private normalizeBarcode(value: string): string {
    return this.scanService.normalizeBarcode(value ?? '');
  }

  private normalizeToteBarcode(value: string): string {
    return this.normalizeBarcode(value);
  }

  private normalizeQuantity(value: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 1;
    }
    return Math.floor(parsed);
  }

  private cleanOptionalText(value: string): string | undefined {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 2500 });
  }

  private handleError(message: string, error?: unknown): void {
    if (error) {
      console.error(message, error);
    }
    this.errMsg.set(message);
    this.snackBar.open(message, 'OK', { duration: 4000 });
  }
}
