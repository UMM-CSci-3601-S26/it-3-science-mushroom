// Angular Imports
import { ComponentFixture, TestBed, waitForAsync, tick, fakeAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InventoryService } from './inventory.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatTableHarness } from '@angular/material/table/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';

// RxJS Imports
import { Observable, of, throwError } from 'rxjs';

// Dialog Imports
import { DialogService } from '../dialog/dialog.service';

// Inventory Imports
import { MockInventoryService } from 'src/testing/inventory.service.mock';
import { Inventory, SelectOption } from './inventory';
import { InventoryComponent } from './inventory.component';
import { BarcodePrintWindowService } from './barcode/barcode-print-window.service';
import { SettingsService } from '../settings/settings.service';
import { AuthService } from '../auth/auth-service';

const mockSettingsService = {
  getSettings: () => of({ barcodePrintWarningLimit: 25 })
};

const mockAuthService = {
  hasPermission: () => true
};

describe('Inventory Table', () => {
  let inventoryTable: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>
  let inventoryService: InventoryService;
  let loader: HarnessLoader
  const baseInventory: Inventory = {
    item: '',
    description: '',
    brand: '',
    color: '',
    size: '',
    type: '',
    material: '',
    quantity: 0,
    notes: '',
    internalID: '',
    minQuantity: 0,
    maxQuantity: 0,
    stockState: 'Unknown'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InventoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InventoryService, useClass: MockInventoryService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([])
      ],
    });
  });

  beforeEach(waitForAsync(() => {
    TestBed.compileComponents().then(() => {
      fixture = TestBed.createComponent(InventoryComponent);
      inventoryTable = fixture.componentInstance;
      inventoryService = TestBed.inject(InventoryService);
      fixture.detectChanges();
      loader = TestbedHarnessEnvironment.loader(fixture);
    });
  }));

  it('should create the component', () => {
    expect(inventoryTable).toBeTruthy();
  });

  it('should initialize with serverFilteredTable available', () => {
    const inventory = inventoryTable.serverFilteredInventory();
    expect(inventory).toBeDefined();
    expect(Array.isArray(inventory)).toBe(true);
  });

  it('should load the paginator harnesses', async () => {
    const paginators = await loader.getAllHarnesses(MatPaginatorHarness);
    expect(paginators.length).toBe(1);
  });

  it('should load harness for the table', async () => {
    const tables = await loader.getAllHarnesses(MatTableHarness);
    expect(tables.length).toBe(1);
  });

  it('should call getInventory() when item signal changes', fakeAsync(() => {
    const spy = spyOn(inventoryService, 'getInventory').and.callThrough();
    inventoryTable.item.set('Markers');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ item: 'Markers', brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined, description: undefined, quantity: undefined });
  }));

  it('should call getInventory() when brand signal changes', fakeAsync(() => {
    const spy = spyOn(inventoryService, 'getInventory').and.callThrough();
    inventoryTable.brand.set('Crayola');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ item: undefined, brand: 'Crayola', color: undefined, size: undefined, type: undefined, material: undefined, description: undefined, quantity: undefined });
  }));

  it('should call getInventory() when color signal changes', fakeAsync(() => {
    const spy = spyOn(inventoryService, 'getInventory').and.callThrough();
    inventoryTable.color.set('Red');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ item: undefined, brand: undefined, color: 'Red', size: undefined, type: undefined, material: undefined, description: undefined, quantity: undefined });
  }));

  it('should call getInventory() when size signal changes', fakeAsync(() => {
    const spy = spyOn(inventoryService, 'getInventory').and.callThrough();
    inventoryTable.size.set('Wide Ruled');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ item: undefined, brand: undefined, color: undefined, size: 'Wide Ruled', type: undefined, material: undefined, description: undefined, quantity: undefined });
  }));

  it('should call getInventory() when type signal changes', fakeAsync(() => {
    const spy = spyOn(inventoryService, 'getInventory').and.callThrough();
    inventoryTable.type.set('Spiral');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ item: undefined, brand: undefined, color: undefined, size: undefined, type: 'Spiral', material: undefined, description: undefined, quantity: undefined });
  }));

  it('should call getInventory() when material signal changes', fakeAsync(() => {
    const spy = spyOn(inventoryService, 'getInventory').and.callThrough();
    inventoryTable.material.set('Plastic');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: 'Plastic', description: undefined, quantity: undefined });
  }));

  it('should call getInventory() when brand and color signals change', fakeAsync(() => {
    const spy = spyOn(inventoryService, 'getInventory').and.callThrough();
    inventoryTable.color.set('Black');
    inventoryTable.brand.set('Crayola');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ item: undefined, brand: 'Crayola', color: 'Black', size: undefined, type: undefined, material: undefined, description: undefined, quantity: undefined });
  }));

  it('should call getInventory() when item, brand, color, and material signals change', fakeAsync(() => {
    const spy = spyOn(inventoryService, 'getInventory').and.callThrough();
    inventoryTable.item.set('Notebook');
    inventoryTable.brand.set('Five Star');
    inventoryTable.color.set('Yellow');
    inventoryTable.type.set('Spiral');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ item: 'Notebook', brand: 'Five Star', color: 'Yellow', size: undefined, type: 'Spiral', material: undefined, description: undefined, quantity: undefined });
  }));

  it('should not show error message on successful load', () => {
    expect(inventoryTable.errMsg()).toBeUndefined();
  });

  // Tests for N/A toggle functionality
  it('should hide N/A values when toggle is OFF', () => {
    inventoryTable.showNAValues.set(false);

    expect(inventoryTable.displayCellValue('N/A')).toBe('');
    expect(inventoryTable.displayCellValue('n/a')).toBe('');
    expect(inventoryTable.displayCellValue('N/A ')).toBe('');
  });

  it('should show N/A values when toggle is ON', () => {
    inventoryTable.showNAValues.set(true);

    expect(inventoryTable.displayCellValue('N/A')).toBe('N/A');
  });

  it('should update the signal when the slide toggle changes', () => {
    const toggle = fixture.debugElement.query(By.css('mat-slide-toggle'));
    toggle.triggerEventHandler('ngModelChange', true);

    expect(inventoryTable.showNAValues()).toBe(true);
  });

  it('should hide N/A in the table when toggle is OFF', () => {
    inventoryTable.showNAValues.set(false);

    inventoryTable.displayedInventory = signal<Inventory[]>([
      { ...baseInventory, item: 'N/A' }
    ]);

    fixture.detectChanges();

    const cell = fixture.debugElement.query(By.css('[data-cy="inventory-item"]')).nativeElement;
    expect(cell.textContent.trim()).toBe('');
  });



  it('should show N/A in the table when toggle is ON', () => {
    inventoryTable.showNAValues.set(true);

    inventoryTable.displayedInventory = signal([
      { ...baseInventory, item: 'N/A'}
    ]);

    fixture.detectChanges();

    const cell = fixture.debugElement.query(By.css('[data-cy="inventory-item"]')).nativeElement;
    expect(cell.textContent.trim()).toBe('N/A');
  });

  it('should skip selected barcode items that do not have printable barcode values', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const barcodePrintWindow = TestBed.inject(BarcodePrintWindowService);
    const snackSpy = spyOn(snackBar, 'open');
    const printSpy = spyOn(barcodePrintWindow, 'open');

    inventoryTable.printBarcodeItems([
      { item: { ...baseInventory, item: 'Pencils', internalBarcode: undefined }, quantity: 1 }
    ]);

    expect(printSpy).not.toHaveBeenCalled();
    expect(snackSpy).toHaveBeenCalledWith(
      'No selected items have printable barcodes.',
      'OK',
      { duration: 3000 }
    );
  });

  it('should warn if the barcode print window is blocked', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const barcodePrintWindow = TestBed.inject(BarcodePrintWindowService);
    const snackSpy = spyOn(snackBar, 'open');
    spyOn(inventoryTable, 'createBarcodeImage').and.returnValue('barcode-image');
    spyOn(barcodePrintWindow, 'open').and.returnValue(false);

    inventoryTable.printBarcodeItems([
      { item: { ...baseInventory, item: 'Pencils', internalBarcode: 'ITEM-12345' }, quantity: 2 }
    ]);

    expect(barcodePrintWindow.open).toHaveBeenCalledWith([
      jasmine.objectContaining({
        barcode: 'ITEM-12345',
        barcodeImage: 'barcode-image',
        quantity: 2
      })
    ]);
    expect(snackSpy).toHaveBeenCalledWith(
      'Popup blocked. Allow popups to print barcodes.',
      'OK',
      { duration: 4000 }
    );
  });

  it('should send selected items through the quantity dialog before printing', fakeAsync(() => {
    const dialog = TestBed.inject(MatDialog);
    const settingsService = TestBed.inject(SettingsService);
    const selectedItem = { ...baseInventory, item: 'Markers', internalBarcode: 'ITEM-00001' };
    const printSpy = spyOn(inventoryTable, 'printBarcodeItems');
    spyOn(settingsService, 'getSettings').and.returnValue(of({
      schools: [],
      timeAvailability: {
        earlyMorning: '',
        lateMorning: '',
        earlyAfternoon: '',
        lateAfternoon: ''
      },
      supplyOrder: [],
      availableSpots: 0,
      barcodePrintWarningLimit: 30
    }));
    spyOn(dialog, 'open').and.returnValues(
      { afterClosed: () => of([selectedItem]) } as never,
      { afterClosed: () => of([{ item: selectedItem, quantity: 3 }]) } as never
    );

    inventoryTable.openBarcodePrintDialog();
    tick();

    expect(dialog.open).toHaveBeenCalledTimes(2);
    expect(printSpy).toHaveBeenCalledWith([{ item: selectedItem, quantity: 3 }]);
  }));

  it('should not open the quantity dialog if no barcode items are selected', fakeAsync(() => {
    const dialog = TestBed.inject(MatDialog);
    const printSpy = spyOn(inventoryTable, 'printBarcodeItems');
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of([]) } as never);

    inventoryTable.openBarcodePrintDialog();
    tick();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(printSpy).not.toHaveBeenCalled();
  }));

  it('should fall back to the default barcode warning limit when settings fail', fakeAsync(() => {
    const dialog = TestBed.inject(MatDialog);
    const settingsService = TestBed.inject(SettingsService);
    const selectedItem = { ...baseInventory, item: 'Markers', internalBarcode: 'ITEM-00001' };
    spyOn(settingsService, 'getSettings').and.returnValue(throwError(() => new Error('settings failed')));
    spyOn(inventoryTable, 'printBarcodeItems');
    const openSpy = spyOn(dialog, 'open').and.returnValues(
      { afterClosed: () => of([selectedItem]) } as never,
      { afterClosed: () => of([]) } as never
    );

    inventoryTable.openBarcodePrintDialog();
    tick();

    const quantityDialogConfig = openSpy.calls.mostRecent().args[1] as { data: { warningLimit: number } };
    expect(quantityDialogConfig.data.warningLimit).toBe(25);
  }));

  it('should update only the matching scanner card remove amount', () => {
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers' },
        removeAmount: 1,
        foundInInventory: true,
        mode: 'remove'
      },
      {
        id: 'card-two',
        barcode: 'ITEM-00002',
        item: { ...baseInventory, item: 'Notebook' },
        removeAmount: 2,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.updateCardRemoveAmount('card-one', 4);

    expect(inventoryTable.scanCards()[0].removeAmount).toBe(4);
    expect(inventoryTable.scanCards()[1].removeAmount).toBe(2);
  });

  it('should use one when a scanner card remove amount is invalid', () => {
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers' },
        removeAmount: 3,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.updateCardRemoveAmount('card-one', 0);

    expect(inventoryTable.scanCards()[0].removeAmount).toBe(1);
  });

  it('should show an error when a remove scan does not match inventory', fakeAsync(() => {
    const snackBar = TestBed.inject(MatSnackBar);
    const snackSpy = spyOn(snackBar, 'open');
    spyOn(inventoryTable, 'matchItem').and.returnValue(null);
    inventoryTable.scannerAction.set('remove');

    inventoryTable.onScanned('missing-barcode');
    tick();

    expect(inventoryTable.scanCards()).toEqual([]);
    expect(snackSpy).toHaveBeenCalledWith(
      'Item not found for scanned barcode',
      'OK',
      { duration: 3000 }
    );
  }));

  it('should add a scanner card when a remove scan matches inventory', fakeAsync(() => {
    const matchedItem = {
      ...baseInventory,
      item: 'Markers',
      internalID: 'markers-id',
      internalBarcode: 'ITEM-00001'
    };
    spyOn(inventoryTable, 'matchItem').and.returnValue(matchedItem);
    inventoryTable.scannerAction.set('remove');

    inventoryTable.onScanned('ITEM-00001');
    tick();

    expect(inventoryTable.scanCards()[0]).toEqual(jasmine.objectContaining({
      barcode: 'ITEM-00001',
      item: matchedItem,
      removeAmount: 1,
      foundInInventory: true,
      mode: 'remove'
    }));
    expect(inventoryTable.showRemovePanel()).toBeTrue();
  }));

  it('should hide the remove panel after removing the last scanner card', () => {
    inventoryTable.showRemovePanel.set(true);
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers' },
        removeAmount: 1,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.removeCard('card-one');

    expect(inventoryTable.scanCards()).toEqual([]);
    expect(inventoryTable.showRemovePanel()).toBeFalse();
  });

  it('should reject a single remove card that is not removable', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const snackSpy = spyOn(snackBar, 'open');
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: null,
        removeAmount: 1,
        foundInInventory: false,
        mode: 'remove'
      }
    ]);

    inventoryTable.confirmSingleRemove('card-one');

    expect(snackSpy).toHaveBeenCalledWith(
      'This card cannot be removed from inventory',
      'OK',
      { duration: 3000 }
    );
  });

  it('should reject a single remove amount larger than current quantity', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const snackSpy = spyOn(snackBar, 'open');
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers', quantity: 2 },
        removeAmount: 3,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.confirmSingleRemove('card-one');

    expect(snackSpy).toHaveBeenCalledWith(
      'Cannot remove more than current quantity for Markers.',
      'OK',
      { duration: 3000 }
    );
  });

  it('should remove a single scanner card after a successful removal', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const snackSpy = spyOn(snackBar, 'open');
    (inventoryService as InventoryService & {
      removeItemQuantityById: jasmine.Spy;
    }).removeItemQuantityById = jasmine.createSpy().and.returnValue(of({}));
    inventoryTable.showRemovePanel.set(true);
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers', internalID: 'markers-id', quantity: 2 },
        removeAmount: 1,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.confirmSingleRemove('card-one');

    expect(inventoryService.removeItemQuantityById).toHaveBeenCalledWith('markers-id', 1);
    expect(inventoryTable.scanCards()).toEqual([]);
    expect(inventoryTable.showRemovePanel()).toBeFalse();
    expect(snackSpy).toHaveBeenCalledWith('Removed 1 from Markers.', 'OK', {
      duration: 3000
    });
  });

  it('should show an error when a single scanner card removal fails', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const snackSpy = spyOn(snackBar, 'open');
    spyOn(console, 'error');
    (inventoryService as InventoryService & {
      removeItemQuantityById: jasmine.Spy;
    }).removeItemQuantityById = jasmine.createSpy().and.returnValue(throwError(() => new Error('remove failed')));
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers', internalID: 'markers-id', quantity: 2 },
        removeAmount: 1,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.confirmSingleRemove('card-one');

    expect(snackSpy).toHaveBeenCalledWith('Failed to remove inventory item.', 'OK', {
      duration: 4000
    });
  });

  it('should reject confirm remove when there are no valid remove cards', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const snackSpy = spyOn(snackBar, 'open');
    inventoryTable.scanCards.set([]);

    inventoryTable.confirmRemove();

    expect(snackSpy).toHaveBeenCalledWith(
      'No valid items selected for removal.',
      'OK',
      { duration: 3000 }
    );
  });

  it('should reject confirm remove when a remove amount is invalid', () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const snackSpy = spyOn(snackBar, 'open');
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers', quantity: 2 },
        removeAmount: 0,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.confirmRemove();

    expect(snackSpy).toHaveBeenCalledWith(
      'Invalid amount for barcode ITEM-00001.',
      'OK',
      { duration: 3000 }
    );
  });

  it('should clear the scanner state after successful confirm remove', fakeAsync(() => {
    (inventoryService as InventoryService & {
      removeItemQuantityById: jasmine.Spy;
    }).removeItemQuantityById = jasmine.createSpy().and.returnValue(of({}));
    inventoryTable.showScanner = true;
    inventoryTable.scannerProcessing = true;
    inventoryTable.showRemovePanel.set(true);
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers', internalID: 'markers-id', quantity: 2 },
        removeAmount: 1,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.confirmRemove();
    tick();

    expect(inventoryService.removeItemQuantityById).toHaveBeenCalledWith('markers-id', 1);
    expect(inventoryTable.scanCards()).toEqual([]);
    expect(inventoryTable.showRemovePanel()).toBeFalse();
    expect(inventoryTable.showScanner).toBeFalse();
    expect(inventoryTable.scannerProcessing).toBeFalse();
  }));

  it('should show an error when confirm remove fails', fakeAsync(() => {
    const snackBar = TestBed.inject(MatSnackBar);
    const snackSpy = spyOn(snackBar, 'open');
    spyOn(console, 'error');
    (inventoryService as InventoryService & {
      removeItemQuantityById: jasmine.Spy;
    }).removeItemQuantityById = jasmine.createSpy().and.returnValue(throwError(() => new Error('remove failed')));
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers', internalID: 'markers-id', quantity: 2 },
        removeAmount: 1,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.confirmRemove();
    tick();

    expect(snackSpy).toHaveBeenCalledWith('Failed to remove inventory.', 'OK', {
      duration: 4000
    });
  }));

  it('should toggle the scanner open and closed', () => {
    inventoryTable.showRemovePanel.set(true);
    inventoryTable.scanCards.set([
      {
        id: 'card-one',
        barcode: 'ITEM-00001',
        item: { ...baseInventory, item: 'Markers' },
        removeAmount: 1,
        foundInInventory: true,
        mode: 'remove'
      }
    ]);

    inventoryTable.toggleScanner();

    expect(inventoryTable.showScanner).toBeTrue();
    expect(inventoryTable.scannerAction()).toBe('add');
    expect(inventoryTable.showRemovePanel()).toBeFalse();
    expect(inventoryTable.scanCards()).toEqual([]);

    inventoryTable.toggleScanner();

    expect(inventoryTable.showScanner).toBeFalse();
  });
});

describe('confirmSingleDelete Tests', () => {
  let inventoryTable: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  let snackBarSpy: jasmine.Spy;
  let inventoryService: InventoryService;
  let dialogService: DialogService;

  const baseInventory: Inventory = {
    item: 'Test Item',
    description: 'A test item',
    brand: 'Test Brand',
    color: 'Blue',
    size: 'Large',
    type: 'Test Type',
    material: 'Plastic',
    quantity: 5,
    notes: 'Test notes',
    internalID: 'ID-001',
    internalBarcode: 'BARCODE-001',
    externalBarcode: [],
    minQuantity: 1,
    maxQuantity: 20,
    stockState: 'In Stock',
    packageSize: 1
  };

  const mockScanCard = {
    id: 'card-1',
    barcode: 'BARCODE-001',
    item: baseInventory,
    removeAmount: 1,
    foundInInventory: true,
    mode: 'remove' as const
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [InventoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InventoryService, useClass: MockInventoryService },
        { provide: SettingsService, useValue: mockSettingsService },
        DialogService,
        provideRouter([])
      ],
    });
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryComponent);
    inventoryTable = fixture.componentInstance;
    inventoryService = TestBed.inject(InventoryService);
    dialogService = TestBed.inject(DialogService);
    snackBarSpy = spyOn(inventoryTable['snackBar'], 'open');
    fixture.detectChanges();
  });

  it('should show snack bar when card is not found', fakeAsync(() => {
    inventoryTable.confirmSingleDelete('non-existent-id');
    tick();

    expect(snackBarSpy).toHaveBeenCalledWith(
      'This card cannot be deleted from inventory',
      'OK',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('should show snack bar when card mode is not "remove"', fakeAsync(() => {
    const addCard = { ...mockScanCard, mode: 'add' as const };
    inventoryTable.scanCards.set([addCard]);

    inventoryTable.confirmSingleDelete('card-1');
    tick();

    expect(snackBarSpy).toHaveBeenCalledWith(
      'This card cannot be deleted from inventory',
      'OK',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('should show snack bar when card item is null', fakeAsync(() => {
    const nullItemCard = { ...mockScanCard, item: null };
    inventoryTable.scanCards.set([nullItemCard]);

    inventoryTable.confirmSingleDelete('card-1');
    tick();

    expect(snackBarSpy).toHaveBeenCalledWith(
      'This card cannot be deleted from inventory',
      'OK',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('should open dialog with correct parameters when card is valid', fakeAsync(() => {
    inventoryTable.scanCards.set([mockScanCard]);
    const dialogServiceSpy = spyOn(dialogService, 'openDialog').and.returnValue({
      afterClosed: () => of(false)
    } as never);

    inventoryTable.confirmSingleDelete('card-1');
    tick();

    expect(dialogServiceSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Confirm Delete Single',
        itemName: 'Test Item',
        message: jasmine.stringContaining('Are you sure you want to delete the item Test Item?'),
        buttonOne: 'Cancel',
        buttonTwo: 'Confirm'
      }),
      '400px',
      '200px'
    );
  }));

  it('should not delete when dialog is cancelled', fakeAsync(() => {
    inventoryTable.scanCards.set([mockScanCard]);
    const deleteServiceSpy = spyOn(inventoryService, 'deleteInventoryById').and.returnValue(of({}));
    spyOn(dialogService, 'openDialog').and.returnValue({
      afterClosed: () => of(false)
    } as never);

    inventoryTable.confirmSingleDelete('card-1');
    tick();

    expect(deleteServiceSpy).not.toHaveBeenCalled();
    expect(inventoryTable.scanCards()).toContain(mockScanCard);
  }));

  it('should delete inventory and remove card on successful delete', fakeAsync(() => {
    inventoryTable.scanCards.set([mockScanCard]);
    const deleteServiceSpy = spyOn(inventoryService, 'deleteInventoryById').and.returnValue(of({}));
    spyOn(dialogService, 'openDialog').and.returnValue({
      afterClosed: () => of(true)
    } as never);

    inventoryTable.confirmSingleDelete('card-1');
    tick();

    expect(deleteServiceSpy).toHaveBeenCalledWith('ID-001');
    expect(inventoryTable.scanCards().length).toBe(0);
  }));

  it('should show success snack bar message after successful delete', fakeAsync(() => {
    inventoryTable.scanCards.set([mockScanCard]);
    spyOn(inventoryService, 'deleteInventoryById').and.returnValue(of({}));
    spyOn(dialogService, 'openDialog').and.returnValue({
      afterClosed: () => of(true)
    } as never);

    inventoryTable.confirmSingleDelete('card-1');
    tick();

    expect(snackBarSpy).toHaveBeenCalledWith(
      'Deleted Test Item.',
      'OK',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('should hide remove panel when last card is deleted', fakeAsync(() => {
    inventoryTable.scanCards.set([mockScanCard]);
    inventoryTable.showRemovePanel.set(true);
    spyOn(inventoryService, 'deleteInventoryById').and.returnValue(of({}));
    spyOn(dialogService, 'openDialog').and.returnValue({
      afterClosed: () => of(true)
    } as never);

    inventoryTable.confirmSingleDelete('card-1');
    tick();

    expect(inventoryTable.showRemovePanel()).toBeFalse();
  }));

  it('should handle delete error gracefully', fakeAsync(() => {
    inventoryTable.scanCards.set([mockScanCard]);
    const error = new Error('Delete failed');
    spyOn(inventoryService, 'deleteInventoryById').and.returnValue(throwError(() => error));
    spyOn(dialogService, 'openDialog').and.returnValue({
      afterClosed: () => of(true)
    } as never);

    inventoryTable.confirmSingleDelete('card-1');
    tick();

    expect(snackBarSpy).toHaveBeenCalledWith(
      'Failed to delete inventory item.',
      'OK',
      jasmine.objectContaining({ duration: 4000 })
    );
    expect(inventoryTable.scanCards()).toContain(mockScanCard);
  }));
});

describe('Filter Dropdown options', () => {
  let inventoryTable: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [InventoryComponent],
      providers: [
        { provide: InventoryService, useClass: MockInventoryService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: AuthService, useValue: mockAuthService },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryComponent);
    inventoryTable = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should return all item options when item signal is empty', () => {
    inventoryTable.item.set(undefined);
    fixture.detectChanges();
    const options = inventoryTable.filteredItemOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(options.map(option => option.value)).toContain('Markers');
    expect(options.map(option => option.value)).toContain('Folder');
    expect(options.map(option => option.value)).toContain('Notebook');
  });

  it('should return empty options when item signal matches nothing', () => {
    inventoryTable.item.set('someItem');
    fixture.detectChanges();
    expect(inventoryTable.filteredItemOptions().length).toBe(0);
  });
});

describe('Misbehaving Inventory Table', () => {
  let inventoryTable: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;

  let inventoryServiceStub: {
    getInventory: () => Observable<Inventory[]>;
    itemOptions: ReturnType<typeof signal<SelectOption[]>>;
    brandOptions: ReturnType<typeof signal<SelectOption[]>>;
    colorOptions: ReturnType<typeof signal<SelectOption[]>>;
    sizeOptions: ReturnType<typeof signal<SelectOption[]>>;
    typeOptions: ReturnType<typeof signal<SelectOption[]>>;
    materialOptions: ReturnType<typeof signal<SelectOption[]>>;
    //filterInventory: () => Inventory[];
  };

  beforeEach(() => {
    inventoryServiceStub = {
      getInventory: () =>
        new Observable((observer) => {
          observer.error('getInventory() Observer generates an error');
        }),
      itemOptions: signal<SelectOption[]>([]),
      brandOptions: signal<SelectOption[]>([]),
      colorOptions: signal<SelectOption[]>([]),
      sizeOptions: signal<SelectOption[]>([]),
      typeOptions: signal<SelectOption[]>([]),
      materialOptions: signal<SelectOption[]>([]),
      //filterInventory: () => []
    };
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        InventoryComponent
      ],
      providers: [{
        provide: InventoryService,
        useValue: inventoryServiceStub
      },
      { provide: SettingsService, useValue: mockSettingsService },
      { provide: AuthService, useValue: mockAuthService },
      provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .compileComponents();
  }));

  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(InventoryComponent);
    inventoryTable = fixture.componentInstance;
    fixture.detectChanges();
    tick(300);
  }));

  it("generates an error if we don't set up a InventoryService", () => {
    expect(inventoryTable.serverFilteredInventory())
      .withContext("service can't give values to the list if it's not there")
      .toEqual([]);
    expect(inventoryTable.errMsg())
      .withContext('the error message will be')
      .toContain('Problem contacting the server – Error Code:');
  });
});
