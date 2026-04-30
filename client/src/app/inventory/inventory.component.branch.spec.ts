import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick} from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { InventoryComponent } from './inventory.component';
import { Inventory } from './inventory';
import { InventoryService } from './inventory.service';
import { InventoryIndex } from './inventory-index';
import { SelectOption } from './inventory';
import { SettingsService } from '../settings/settings.service';
import { ManualEntryResult } from './manual-entry/manual-entry';
import { AuthService } from '../auth/auth-service';

type ScanCard = {
  id: string;
  barcode: string;
  item: Inventory | null;
  removeAmount: number;
  foundInInventory: boolean;
  mode: 'add' | 'remove';
};

type ScannerStub = {
  clearHandheldInput: jasmine.Spy;
  removeScannedItem: jasmine.Spy;
  clearScans: jasmine.Spy;
  resolveManualEntry: jasmine.Spy;
  deactivateMode: jasmine.Spy;
};

describe('InventoryComponent branch coverage', () => {
  let fixture: ComponentFixture<InventoryComponent>;
  let component: InventoryComponent;

  let inventoryServiceSpy: jasmine.SpyObj<InventoryService>;
  let inventoryIndexSpy: jasmine.SpyObj<InventoryIndex>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let settingsServiceSpy: jasmine.SpyObj<SettingsService>;
  let scannerStub: ScannerStub;

  const itemA: Inventory = {
    internalID: '1',
    internalBarcode: 'ITEM-00001',
    externalBarcode: ['UPC-1'],
    item: 'Markers',
    description: 'Washable markers',
    brand: 'Crayola',
    color: 'Blue',
    packageSize: 8,
    size: 'Large',
    type: 'School',
    material: 'Plastic',
    quantity: 5,
    notes: 'Keep sealed',
    maxQuantity: 20,
    minQuantity: 1,
    stockState: 'In Stock'
  };

  const itemB: Inventory = {
    internalID: '2',
    internalBarcode: 'ITEM-00002',
    externalBarcode: ['UPC-2'],
    item: 'Pencils',
    description: 'No. 2 pencils',
    brand: 'Ticonderoga',
    color: 'Yellow',
    packageSize: 12,
    size: 'Standard',
    type: 'Writing',
    material: 'Wood',
    quantity: 10,
    notes: 'Sharpened',
    maxQuantity: 30,
    minQuantity: 2,
    stockState: 'Low'
  };

  function makeCard(
    overrides: Partial<ScanCard> = {}
  ): ScanCard {
    return {
      id: 'card-1',
      barcode: 'UPC-1',
      item: itemA,
      removeAmount: 1,
      foundInInventory: true,
      mode: 'remove',
      ...overrides
    };
  }

  function setScannerRef(
    target: InventoryComponent,
    scanner: ScannerStub | undefined
  ): void {
    Object.defineProperty(target, 'scannerRef', {
      configurable: true,
      value: () => scanner
    });
  }

  beforeEach(fakeAsync(() => {
    inventoryServiceSpy = jasmine.createSpyObj<InventoryService>('InventoryService', [
      'getInventory',
      'removeItemQuantityById',
      'addInventory',
      'itemOptions',
      'brandOptions',
      'colorOptions',
      'sizeOptions',
      'typeOptions',
      'materialOptions'
    ]);

    inventoryIndexSpy = jasmine.createSpyObj<InventoryIndex>('InventoryIndex', [
      'getByBarcode',
      'clear',
      'registerItem'
    ]);

    snackBarSpy = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    settingsServiceSpy = jasmine.createSpyObj<SettingsService>('SettingsService', ['getSettings']);
    settingsServiceSpy.getSettings.and.returnValue(of({
      schools: [],
      timeAvailability: {
        earlyMorning: '',
        lateMorning: '',
        earlyAfternoon: '',
        lateAfternoon: ''
      },
      supplyOrder: [],
      availableSpots: 0,
      barcodePrintWarningLimit: 25
    }));

    scannerStub = {
      clearHandheldInput: jasmine.createSpy('clearHandheldInput'),
      removeScannedItem: jasmine.createSpy('removeScannedItem'),
      clearScans: jasmine.createSpy('clearScans'),
      resolveManualEntry: jasmine.createSpy('resolveManualEntry'),
      deactivateMode: jasmine.createSpy('deactivateMode')
    };

    inventoryServiceSpy.getInventory.and.returnValue(of([]));
    inventoryServiceSpy.removeItemQuantityById.and.returnValue(of({}));
    inventoryServiceSpy.addInventory.and.returnValue(of(itemA));

    inventoryServiceSpy.itemOptions.and.returnValue([]);
    inventoryServiceSpy.brandOptions.and.returnValue([]);
    inventoryServiceSpy.colorOptions.and.returnValue([]);
    inventoryServiceSpy.sizeOptions.and.returnValue([]);
    inventoryServiceSpy.typeOptions.and.returnValue([]);
    inventoryServiceSpy.materialOptions.and.returnValue([]);

    TestBed.configureTestingModule({
      imports: [InventoryComponent],
      providers: [
        { provide: InventoryService, useValue: inventoryServiceSpy },
        { provide: InventoryIndex, useValue: inventoryIndexSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: AuthService, useValue: { hasPermission: () => true } }
      ]
    });

    TestBed.overrideComponent(InventoryComponent, {
      set: {
        template: ''
      }
    });

    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
    setScannerRef(component, scannerStub);

    fixture.detectChanges();
    tick(301);

    inventoryServiceSpy.getInventory.calls.reset();
    inventoryServiceSpy.removeItemQuantityById.calls.reset();
    inventoryServiceSpy.addInventory.calls.reset();
    inventoryIndexSpy.clear.calls.reset();
    inventoryIndexSpy.registerItem.calls.reset();
    inventoryIndexSpy.getByBarcode.calls.reset();
    snackBarSpy.open.calls.reset();
    dialogSpy.open.calls.reset();
    scannerStub.clearHandheldInput.calls.reset();
    scannerStub.removeScannedItem.calls.reset();
    scannerStub.clearScans.calls.reset();
    scannerStub.resolveManualEntry.calls.reset();
    scannerStub.deactivateMode.calls.reset();
  }));

  it('should refresh the data source and register items in the index', fakeAsync(() => {
    inventoryServiceSpy.getInventory.and.returnValue(of([itemA, itemB]));

    component.item.set('Markers');
    fixture.detectChanges();
    tick(301);
    fixture.detectChanges();

    expect(component.serverFilteredInventory()).toEqual([itemA, itemB]);
    expect(component.dataSource.data).toEqual([itemA, itemB]);
    expect(inventoryIndexSpy.clear).toHaveBeenCalled();
    expect(inventoryIndexSpy.registerItem).toHaveBeenCalledTimes(2);
    expect(inventoryIndexSpy.registerItem).toHaveBeenCalledWith(itemA);
    expect(inventoryIndexSpy.registerItem).toHaveBeenCalledWith(itemB);
  }));

  it('should set a detailed error message for non-ErrorEvent failures', fakeAsync(() => {
    inventoryServiceSpy.getInventory.and.returnValue(
      throwError(() => ({
        status: 500,
        message: 'Server exploded',
        error: {}
      }))
    );

    component.item.set('Markers');
    fixture.detectChanges();
    tick(301);
    fixture.detectChanges();

    expect(component.serverFilteredInventory()).toEqual([]);
    expect(component.errMsg()).toContain('Problem contacting the server');
    expect(component.errMsg()).toContain('500');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringMatching('Problem contacting the server'),
      'OK',
      { duration: 6000 }
    );
  }));

  it('should keep Unknown Error for ErrorEvent failures', fakeAsync(() => {
    inventoryServiceSpy.getInventory.and.returnValue(
      throwError(() => ({
        status: 0,
        message: 'Network down',
        error: new ErrorEvent('NetworkError')
      }))
    );

    component.item.set('Markers');
    fixture.detectChanges();
    tick(301);
    fixture.detectChanges();

    expect(component.serverFilteredInventory()).toEqual([]);
    expect(component.errMsg()).toBeUndefined();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Unknown Error',
      'OK',
      { duration: 6000 }
    );
  }));

  it('should ignore scanned items while in add mode', async () => {
    component.scannerAction.set('add');

    await component.onScanned('UPC-1');

    expect(component.scanCards()).toEqual([]);
    expect(component.showRemovePanel()).toBeFalse();
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });

  it('should show an error when a remove scan is not found', async () => {
    component.scannerAction.set('remove');
    inventoryIndexSpy.getByBarcode.and.returnValue(null);

    await component.onScanned('UPC-MISSING');

    expect(scannerStub.clearHandheldInput).toHaveBeenCalled();
    expect(scannerStub.removeScannedItem).toHaveBeenCalledWith('UPC-MISSING');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Item not found for scanned barcode',
      'OK',
      { duration: 3000 }
    );
    expect(component.scanCards()).toEqual([]);
    expect(component.showRemovePanel()).toBeFalse();
  });

  it('should still handle a missing remove scan when scannerRef is undefined', async () => {
    component.scannerAction.set('remove');
    inventoryIndexSpy.getByBarcode.and.returnValue(null);
    setScannerRef(component, undefined);

    await component.onScanned('UPC-MISSING');

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Item not found for scanned barcode',
      'OK',
      { duration: 3000 }
    );
    expect(component.scanCards()).toEqual([]);
  });

  it('should add a remove card when the scanned item matches inventory', async () => {
    component.scannerAction.set('remove');
    inventoryIndexSpy.getByBarcode.and.returnValue(itemA);

    await component.onScanned('UPC-1');

    const cards = component.scanCards();
    expect(cards.length).toBe(1);
    expect(cards[0].barcode).toBe('UPC-1');
    expect(cards[0].item).toEqual(itemA);
    expect(cards[0].removeAmount).toBe(1);
    expect(cards[0].foundInInventory).toBeTrue();
    expect(cards[0].mode).toBe('remove');
    expect(component.showRemovePanel()).toBeTrue();
  });

  it('should update remove amount and fall back to 1 for invalid values', () => {
    component.scanCards.set([makeCard()]);

    component.updateCardRemoveAmount('card-1', 4);
    expect(component.scanCards()[0].removeAmount).toBe(4);

    component.updateCardRemoveAmount('card-1', 0);
    expect(component.scanCards()[0].removeAmount).toBe(1);
  });

  it('should reject single remove when the card does not exist', () => {
    component.scanCards.set([]);

    component.confirmSingleRemove('missing-card');

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'This card cannot be removed from inventory',
      'OK',
      { duration: 3000 }
    );
    expect(inventoryServiceSpy.removeItemQuantityById).not.toHaveBeenCalled();
  });

  it('should reject single remove when the card mode is not remove', () => {
    component.scanCards.set([makeCard({ mode: 'add' })]);

    component.confirmSingleRemove('card-1');

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'This card cannot be removed from inventory',
      'OK',
      { duration: 3000 }
    );
    expect(inventoryServiceSpy.removeItemQuantityById).not.toHaveBeenCalled();
  });

  it('should reject single remove when the card has no item', () => {
    component.scanCards.set([makeCard({ item: null })]);

    component.confirmSingleRemove('card-1');

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'This card cannot be removed from inventory',
      'OK',
      { duration: 3000 }
    );
    expect(inventoryServiceSpy.removeItemQuantityById).not.toHaveBeenCalled();
  });

  it('should reject single remove when the remove amount is invalid', () => {
    component.scanCards.set([makeCard({ removeAmount: 0 })]);

    component.confirmSingleRemove('card-1');

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Enter a valid remove amount.',
      'OK',
      { duration: 3000 }
    );
    expect(inventoryServiceSpy.removeItemQuantityById).not.toHaveBeenCalled();
  });

  it('should reject single remove when the amount exceeds inventory quantity', () => {
    component.scanCards.set([makeCard({ removeAmount: 99 })]);

    component.confirmSingleRemove('card-1');

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Cannot remove more than current quantity for Markers.',
      'OK',
      { duration: 3000 }
    );
    expect(inventoryServiceSpy.removeItemQuantityById).not.toHaveBeenCalled();
  });

  it('should remove a single card and keep the panel open when cards remain', () => {
    component.scanCards.set([
      makeCard({ id: 'card-1' }),
      makeCard({ id: 'card-2', barcode: 'UPC-2', item: itemB })
    ]);
    component.showRemovePanel.set(true);

    component.confirmSingleRemove('card-1');

    expect(inventoryServiceSpy.removeItemQuantityById).toHaveBeenCalledWith('1', 1);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Removed 1 from Markers.',
      'OK',
      { duration: 3000 }
    );
    expect(component.scanCards().length).toBe(1);
    expect(component.scanCards()[0].id).toBe('card-2');
    expect(component.showRemovePanel()).toBeTrue();
  });

  it('should remove the last card and hide the panel', () => {
    component.scanCards.set([makeCard()]);
    component.showRemovePanel.set(true);

    component.confirmSingleRemove('card-1');

    expect(component.scanCards()).toEqual([]);
    expect(component.showRemovePanel()).toBeFalse();
  });

  it('should show an error snackbar when single remove fails', () => {
    spyOn(console, 'error');
    inventoryServiceSpy.removeItemQuantityById.and.returnValue(
      throwError(() => new Error('remove failed'))
    );
    component.scanCards.set([makeCard()]);

    component.confirmSingleRemove('card-1');

    expect(console.error).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Failed to remove inventory item.',
      'OK',
      { duration: 4000 }
    );
  });

  it('should remove a card without hiding the panel when other cards remain', () => {
    component.scanCards.set([
      makeCard({ id: 'card-1' }),
      makeCard({ id: 'card-2', barcode: 'UPC-2', item: itemB })
    ]);
    component.showRemovePanel.set(true);

    component.removeCard('card-1');

    expect(component.scanCards().length).toBe(1);
    expect(component.scanCards()[0].id).toBe('card-2');
    expect(component.showRemovePanel()).toBeTrue();
  });

  it('should hide the panel when removing the last card', () => {
    component.scanCards.set([makeCard()]);
    component.showRemovePanel.set(true);

    component.removeCard('card-1');

    expect(component.scanCards()).toEqual([]);
    expect(component.showRemovePanel()).toBeFalse();
  });

  it('should clear all cards and hide the panel', () => {
    component.scanCards.set([makeCard()]);
    component.showRemovePanel.set(true);

    component.clearAllCards();

    expect(component.scanCards()).toEqual([]);
    expect(component.showRemovePanel()).toBeFalse();
  });

  it('should open the remove scanner and reset scanner state', () => {
    component.showScanner = false;
    component.scannerProcessing = true;
    component.showRemovePanel.set(true);
    component.scanCards.set([makeCard()]);
    component.scannerAction.set('add');

    component.openRemoveScanner();

    expect(component.scannerAction()).toBe('remove');
    expect(component.showScanner).toBeTrue();
    expect(component.scannerProcessing).toBeFalse();
    expect(component.showRemovePanel()).toBeFalse();
    expect(component.scanCards()).toEqual([]);
    expect(scannerStub.clearScans).toHaveBeenCalled();
  });

  it('should reject confirmRemove when there are no valid remove cards', () => {
    component.scanCards.set([
      makeCard({ mode: 'add' }),
      makeCard({ foundInInventory: false }),
      makeCard({ item: null })
    ]);

    component.confirmRemove();

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'No valid items selected for removal.',
      'OK',
      { duration: 3000 }
    );
    expect(inventoryServiceSpy.removeItemQuantityById).not.toHaveBeenCalled();
  });

  it('should reject confirmRemove when a card amount is invalid', () => {
    component.scanCards.set([makeCard({ removeAmount: 0 })]);

    component.confirmRemove();

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Invalid amount for barcode UPC-1.',
      'OK',
      { duration: 3000 }
    );
    expect(inventoryServiceSpy.removeItemQuantityById).not.toHaveBeenCalled();
  });

  it('should reject confirmRemove when a card amount exceeds quantity', () => {
    component.scanCards.set([makeCard({ removeAmount: 99 })]);

    component.confirmRemove();

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Cannot remove more than current quantity for Markers.',
      'OK',
      { duration: 3000 }
    );
    expect(inventoryServiceSpy.removeItemQuantityById).not.toHaveBeenCalled();
  });

  it('should confirm remove and reset scanner state on success', fakeAsync(() => {
    component.scanCards.set([
      makeCard({ id: 'card-1' }),
      makeCard({ id: 'card-2', barcode: 'UPC-2', item: itemB, removeAmount: 2 })
    ]);
    component.showRemovePanel.set(true);
    component.showScanner = true;
    component.scannerProcessing = true;

    const beforeReload = component.reload();

    component.confirmRemove();
    flushMicrotasks();

    expect(inventoryServiceSpy.removeItemQuantityById).toHaveBeenCalledTimes(2);
    expect(inventoryServiceSpy.removeItemQuantityById).toHaveBeenCalledWith('1', 1);
    expect(inventoryServiceSpy.removeItemQuantityById).toHaveBeenCalledWith('2', 2);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Inventory updated.',
      'OK',
      { duration: 3000 }
    );
    expect(component.scanCards()).toEqual([]);
    expect(component.showRemovePanel()).toBeFalse();
    expect(component.showScanner).toBeFalse();
    expect(component.scannerProcessing).toBeFalse();
    expect(scannerStub.clearScans).toHaveBeenCalled();
    expect(component.reload()).toBe(beforeReload + 1);
  }));

  it('should show an error snackbar when confirmRemove fails', fakeAsync(() => {
    spyOn(console, 'error');
    inventoryServiceSpy.removeItemQuantityById.and.returnValue(
      throwError(() => new Error('remove failed'))
    );
    component.scanCards.set([makeCard()]);
    component.showRemovePanel.set(true);

    component.confirmRemove();
    flushMicrotasks();

    expect(console.error).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Failed to remove inventory.',
      'OK',
      { duration: 4000 }
    );
  }));

  it('should cancel remove and reset cards and panel state', () => {
    component.scanCards.set([makeCard()]);
    component.showRemovePanel.set(true);

    component.cancelRemove();

    expect(component.scanCards()).toEqual([]);
    expect(component.showRemovePanel()).toBeFalse();
  });

  it('should resolve manual entry results back to the scanner', async () => {
    const dialogResult: ManualEntryResult = {
      mode: 'match',
      selectedItem: itemA,
      quantity: 3
    };

    dialogSpy.open.and.returnValue({
      afterClosed: () => of(dialogResult)
    } as unknown as ReturnType<MatDialog['open']>);

    const beforeReload = component.reload();

    await component.onManualEntryNeeded({ barcode: 'UPC-1', quantity: 3 });

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(scannerStub.resolveManualEntry).toHaveBeenCalledWith(dialogResult);
    expect(component.reload()).toBe(beforeReload + 1);
  });

  it('should resolve undefined when manual entry closes with null', async () => {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(null)
    } as unknown as ReturnType<MatDialog['open']>);

    await component.onManualEntryNeeded({ barcode: 'UPC-1', quantity: 2 });

    expect(scannerStub.resolveManualEntry).toHaveBeenCalledWith(undefined);
  });

  it('should close the add scanner when toggleScanner is called while add mode is open', () => {
    component.showScanner = true;
    component.scannerProcessing = true;
    component.activeScannerMode = 'handheld';
    component.scannerAction.set('add');

    component.toggleScanner();

    expect(scannerStub.deactivateMode).toHaveBeenCalled();
    expect(component.showScanner).toBeFalse();
    expect(component.scannerProcessing).toBeFalse();
    expect(component.activeScannerMode).toBeNull();
  });

  it('should close the remove scanner when openRemoveScanner is called while remove mode is open', () => {
    component.showScanner = true;
    component.scannerProcessing = true;
    component.activeScannerMode = 'camera';
    component.scannerAction.set('remove');
    component.scanCards.set([makeCard()]);

    component.openRemoveScanner();

    expect(scannerStub.deactivateMode).toHaveBeenCalled();
    expect(component.showScanner).toBeFalse();
    expect(component.scannerProcessing).toBeFalse();
    expect(component.activeScannerMode).toBeNull();
    expect(component.scanCards()).toEqual([makeCard()]);
  });

  it('should open the scanner in add mode when toggleScanner is called while closed', () => {
    component.showScanner = false;
    component.scannerProcessing = true;
    component.showRemovePanel.set(true);
    component.scanCards.set([makeCard()]);
    component.scannerAction.set('remove');

    component.toggleScanner();

    expect(component.scannerAction()).toBe('add');
    expect(component.showScanner).toBeTrue();
    expect(component.scannerProcessing).toBeFalse();
    expect(component.showRemovePanel()).toBeFalse();
    expect(component.scanCards()).toEqual([]);
  });

  it('should complete the scanner workflow in onScannerDone', () => {
    const beforeReload = component.reload();
    component.showScanner = true;
    component.scannerProcessing = true;

    component.onScannerDone();

    expect(component.scannerProcessing).toBeFalse();
    expect(component.showScanner).toBeFalse();
    expect(component.reload()).toBe(beforeReload + 1);
  });

  it('should add an item and reload after addItem succeeds', () => {
    const beforeReload = component.reload();

    component.addItem(itemA);

    expect(inventoryServiceSpy.addInventory).toHaveBeenCalledWith(itemA);
    expect(component.reload()).toBe(beforeReload + 1);
  });

  it('should delegate matchItem to InventoryIndex', () => {
    inventoryIndexSpy.getByBarcode.and.returnValue(itemA);

    const result = component.matchItem('UPC-1');

    expect(inventoryIndexSpy.getByBarcode).toHaveBeenCalledWith('UPC-1');
    expect(result).toEqual(itemA);
  });

  it('should track scan cards by id', () => {
    const card = makeCard({ id: 'scan-card-123' });

    expect(component.trackByScanCard(0, card)).toBe('scan-card-123');
  });

  it('should return all options when filterOptions gets empty input', () => {
    const access = component as unknown as {
      filterOptions: (options: SelectOption[], input: string) => SelectOption[];
    };

    const options: SelectOption[] = [
      { label: 'Markers', value: 'Markers' },
      { label: 'Folder', value: 'Folder' }
    ];

    expect(access.filterOptions(options, '')).toEqual(options);
  });

  it('should filter options by label or value', () => {
    const access = component as unknown as {
      filterOptions: (options: SelectOption[], input: string) => SelectOption[];
    };

    const options: SelectOption[] = [
      { label: 'Crayola', value: 'brand-1' },
      { label: 'Notebook', value: 'nb-42' },
      { label: 'Markers', value: 'mkr-9000' }
    ];

    expect(access.filterOptions(options, 'note')).toEqual([
      { label: 'Notebook', value: 'nb-42' }
    ]);

    expect(access.filterOptions(options, 'mkr')).toEqual([
      { label: 'Markers', value: 'mkr-9000' }
    ]);
  });

  it('should compute filtered options for all option groups with defined signals', () => {
    inventoryServiceSpy.itemOptions.and.returnValue([
      { label: 'Markers', value: 'Markers' },
      { label: 'Folder', value: 'Folder' }
    ]);
    inventoryServiceSpy.brandOptions.and.returnValue([
      { label: 'Crayola', value: 'Crayola' },
      { label: 'OfficeCo', value: 'OfficeCo' }
    ]);
    inventoryServiceSpy.colorOptions.and.returnValue([
      { label: 'Blue', value: 'Blue' },
      { label: 'Yellow', value: 'Yellow' }
    ]);
    inventoryServiceSpy.sizeOptions.and.returnValue([
      { label: 'Large', value: 'Large' },
      { label: 'Small', value: 'Small' }
    ]);
    inventoryServiceSpy.typeOptions.and.returnValue([
      { label: 'School', value: 'School' },
      { label: 'Writing', value: 'Writing' }
    ]);
    inventoryServiceSpy.materialOptions.and.returnValue([
      { label: 'Plastic', value: 'Plastic' },
      { label: 'Wood', value: 'Wood' }
    ]);

    component.item.set('mark');
    component.brand.set('cray');
    component.color.set('blu');
    component.size.set('lar');
    component.type.set('sch');
    component.material.set('plas');

    expect(component.filteredItemOptions()).toEqual([
      { label: 'Markers', value: 'Markers' }
    ]);
    expect(component.filteredBrandOptions()).toEqual([
      { label: 'Crayola', value: 'Crayola' }
    ]);
    expect(component.filteredColorOptions()).toEqual([
      { label: 'Blue', value: 'Blue' }
    ]);
    expect(component.filteredSizeOptions()).toEqual([
      { label: 'Large', value: 'Large' }
    ]);
    expect(component.filteredTypeOptions()).toEqual([
      { label: 'School', value: 'School' }
    ]);
    expect(component.filteredMaterialOptions()).toEqual([
      { label: 'Plastic', value: 'Plastic' }
    ]);
  });

  it('should compute all options when the filter signals are undefined', () => {
    inventoryServiceSpy.itemOptions.and.returnValue([
      { label: 'Markers', value: 'Markers' }
    ]);
    inventoryServiceSpy.brandOptions.and.returnValue([
      { label: 'Crayola', value: 'Crayola' }
    ]);
    inventoryServiceSpy.colorOptions.and.returnValue([
      { label: 'Blue', value: 'Blue' }
    ]);
    inventoryServiceSpy.sizeOptions.and.returnValue([
      { label: 'Large', value: 'Large' }
    ]);
    inventoryServiceSpy.typeOptions.and.returnValue([
      { label: 'School', value: 'School' }
    ]);
    inventoryServiceSpy.materialOptions.and.returnValue([
      { label: 'Plastic', value: 'Plastic' }
    ]);

    component.item.set(undefined);
    component.brand.set(undefined);
    component.color.set(undefined);
    component.size.set(undefined);
    component.type.set(undefined);
    component.material.set(undefined);

    expect(component.filteredItemOptions()).toEqual([
      { label: 'Markers', value: 'Markers' }
    ]);
    expect(component.filteredBrandOptions()).toEqual([
      { label: 'Crayola', value: 'Crayola' }
    ]);
    expect(component.filteredColorOptions()).toEqual([
      { label: 'Blue', value: 'Blue' }
    ]);
    expect(component.filteredSizeOptions()).toEqual([
      { label: 'Large', value: 'Large' }
    ]);
    expect(component.filteredTypeOptions()).toEqual([
      { label: 'School', value: 'School' }
    ]);
    expect(component.filteredMaterialOptions()).toEqual([
      { label: 'Plastic', value: 'Plastic' }
    ]);
  });
});
