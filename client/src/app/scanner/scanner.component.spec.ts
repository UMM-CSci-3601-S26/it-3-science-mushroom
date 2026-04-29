import { ElementRef } from '@angular/core';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { of, throwError } from 'rxjs';

import { Inventory } from '../inventory/inventory';
import { InventoryIndex } from '../inventory/inventory-index';
import { InventoryService } from '../inventory/inventory.service';
import { ManualEntryResult } from '../inventory/manual-entry/manual-entry';
import { ScanService } from './scan-service';
import { ScannerComponent } from './scanner.component';

describe('ScannerComponent', () => {
  let component: ScannerComponent;
  let inventoryIndexSpy: jasmine.SpyObj<InventoryIndex>;
  let inventoryServiceSpy: jasmine.SpyObj<InventoryService>;
  let scanServiceSpy: jasmine.SpyObj<ScanService>;

  const baseItem: Inventory = {
    internalID: 'inv-1',
    internalBarcode: 'ITEM-00001',
    externalBarcode: ['UPC-1'],
    item: 'Markers',
    description: 'Washable markers',
    brand: 'Crayola',
    color: 'Blue',
    packageSize: 8,
    size: 'Wide',
    type: 'Washable',
    material: 'Plastic',
    quantity: 5,
    notes: 'test',
    maxQuantity: 10,
    minQuantity: 1,
    stockState: 'stocked'
  };

  function createComponent() {
    inventoryIndexSpy = jasmine.createSpyObj<InventoryIndex>('InventoryIndex', ['getByBarcode', 'registerItem']);
    inventoryServiceSpy = jasmine.createSpyObj<InventoryService>('InventoryService', [
      'updateQuantity',
      'lookUpByBarcode',
      'linkExternalBarcode',
      'addInventory',
      'loadInventory'
    ]);
    scanServiceSpy = jasmine.createSpyObj<ScanService>('ScanService', ['normalizeBarcode']);

    component = new ScannerComponent(inventoryIndexSpy, inventoryServiceSpy, scanServiceSpy);
  }

  beforeEach(() => {
    createComponent();
  });

  it('logs after view init and stops the scanner on destroy', () => {
    spyOn(console, 'log');
    const stopSpy = spyOn(component, 'stopScanner');

    component.ngAfterViewInit();
    component.ngOnDestroy();

    expect(console.log).toHaveBeenCalledWith('ngAfterViewInit FIRED');
    expect(stopSpy).toHaveBeenCalled();
  });

  it('does nothing when setMode is called while processing', async () => {
    component.processing = true;
    const stopSpy = spyOn(component, 'stopScanner');

    await component.setMode('handheld');

    expect(stopSpy).not.toHaveBeenCalled();
    expect(component.activeMode).toBeNull();
  });

  it('refocuses the handheld input when handheld mode is already active', async () => {
    component.activeMode = 'handheld';
    component.isScanning = true;
    const focusSpy = spyOn(component as unknown as { focusHandheldInput: () => void }, 'focusHandheldInput');

    await component.setMode('handheld');

    expect(focusSpy).toHaveBeenCalled();
  });

  it('activates handheld mode and focuses the handheld input', async () => {
    const stopSpy = spyOn(component, 'stopScanner');
    const focusSpy = spyOn(component as unknown as { focusHandheldInput: () => void }, 'focusHandheldInput');

    await component.setMode('handheld');

    expect(stopSpy).toHaveBeenCalled();
    expect(component.activeMode).toBe('handheld');
    expect(component.isScanning).toBeTrue();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('activates camera mode and starts the camera scanner', async () => {
    const startSpy = spyOn(component, 'startCameraScanner').and.returnValue(Promise.resolve());

    await component.setMode('camera');

    expect(component.activeMode).toBe('camera');
    expect(component.isScanning).toBeTrue();
    expect(startSpy).toHaveBeenCalled();
  });

  it('deactivates the current mode and clears the handheld input value', () => {
    const stopSpy = spyOn(component, 'stopScanner');
    component.activeMode = 'camera';
    component.isScanning = true;
    component.handheldInputValue = 'ABC';

    component.deactivateMode();

    expect(stopSpy).toHaveBeenCalled();
    expect(component.activeMode).toBeNull();
    expect(component.isScanning).toBeFalse();
    expect(component.handheldInputValue).toBe('');
  });

  it('returns early when camera scanner starts without a video element', async () => {
    await component.startCameraScanner();

    expect(component['controls']).toBeNull();
  });

  it('starts the camera scanner, stores controls, and handles a decoded barcode', async () => {
    const trackStopSpy = jasmine.createSpy('track.stop');
    const permissionStream = {
      getTracks: () => [{ stop: trackStopSpy }]
    } as unknown as MediaStream;
    const getUserMediaSpy = jasmine.createSpy('getUserMedia').and.resolveTo(permissionStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: getUserMediaSpy }
    });

    const videoEl = { pause: jasmine.createSpy('pause'), srcObject: null } as unknown as HTMLVideoElement;
    component.video = new ElementRef(videoEl);

    spyOn(BrowserMultiFormatReader, 'listVideoInputDevices').and.resolveTo([{ deviceId: 'camera-1' }] as never);
    const handleSpy = spyOn(component, 'handleScan');
    const controls = { stop: jasmine.createSpy('stop') } as never;
    spyOn(
  component['codeReader'] as unknown as {
    decodeFromVideoDevice: (
      deviceId: string,
      video: HTMLVideoElement,
      callback: (
        result: { getText: () => string } | null,
        error?: unknown,
        controlsArg?: typeof controls
      ) => void
    ) => Promise<void>;
  },
  'decodeFromVideoDevice'
    ).and.callFake(
      (
        _deviceId: string,
        _video: HTMLVideoElement,
        callback: (
          result: { getText: () => string } | null,
          error?: unknown,
          controlsArg?: typeof controls
        ) => void
      ) => {
        callback({ getText: () => 'UPC-1' }, undefined, controls);
        return Promise.resolve();
      }
    );

    await component.startCameraScanner();

    expect(getUserMediaSpy).toHaveBeenCalled();
    expect(trackStopSpy).toHaveBeenCalled();
    expect(component['controls']).toBe(controls);
    expect(handleSpy).toHaveBeenCalledWith('UPC-1');
  });

  it('resets scanner state when no video device exists', async () => {
    const permissionStream = {
      getTracks: () => [{ stop: jasmine.createSpy('stop') }]
    } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jasmine.createSpy('getUserMedia').and.resolveTo(permissionStream) }
    });

    component.video = new ElementRef({ pause: jasmine.createSpy('pause'), srcObject: null } as unknown as HTMLVideoElement);
    component.activeMode = 'camera';
    component.isScanning = true;
    spyOn(BrowserMultiFormatReader, 'listVideoInputDevices').and.resolveTo([] as never);
    spyOn(console, 'error');

    await component.startCameraScanner();

    expect(console.error).toHaveBeenCalled();
    expect(component.isScanning).toBeFalse();
    expect(component.activeMode).toBeNull();
  });

  it('resets scanner state when camera permission fails', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jasmine.createSpy('getUserMedia').and.rejectWith(new Error('denied')) }
    });
    component.video = new ElementRef({ pause: jasmine.createSpy('pause'), srcObject: null } as unknown as HTMLVideoElement);
    component.activeMode = 'camera';
    component.isScanning = true;
    spyOn(console, 'error');

    await component.startCameraScanner();

    expect(console.error).toHaveBeenCalled();
    expect(component.isScanning).toBeFalse();
    expect(component.activeMode).toBeNull();
  });

  it('blocks handheld submit when not scanning in handheld mode', () => {
    const handleSpy = spyOn(component, 'handleScan');

    component.submitHandheldScan('UPC-1');

    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('blocks handheld submit when the trimmed value is empty', () => {
    component.isScanning = true;
    component.activeMode = 'handheld';
    const handleSpy = spyOn(component, 'handleScan');

    component.submitHandheldScan('   ');

    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('submits handheld scans, clears the input, and refocuses the field', () => {
    component.isScanning = true;
    component.activeMode = 'handheld';
    component.handheldInputValue = 'UPC-1';
    const handleSpy = spyOn(component, 'handleScan');
    const focusSpy = spyOn(component as unknown as { focusHandheldInput: () => void }, 'focusHandheldInput');

    component.submitHandheldScan(' UPC-1 ');

    expect(handleSpy).toHaveBeenCalledWith('UPC-1');
    expect(component.handheldInputValue).toBe('');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('ignores scans when scanning is disabled', () => {
    scanServiceSpy.normalizeBarcode.and.returnValue('UPC-1');
    const emitSpy = spyOn(component.scanned, 'emit');

    component.handleScan('UPC-1');

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('ignores scans that normalize to an empty string', () => {
    component.isScanning = true;
    scanServiceSpy.normalizeBarcode.and.returnValue('');
    const emitSpy = spyOn(component.scanned, 'emit');

    component.handleScan('bad');

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('stores a new scan, deduplicates the list, updates quantity, and emits the normalized barcode', () => {
    component.isScanning = true;
    scanServiceSpy.normalizeBarcode.and.returnValue('UPC-1');
    const emitSpy = spyOn(component.scanned, 'emit');

    component.handleScan('upc-1');
    component['lastScannedTime'] = Date.now() - 2000;
    component.handleScan('upc-1');

    expect(component.scannedItems).toEqual(['UPC-1']);
    expect(component.scanQuantities.get('UPC-1')).toBe(2);
    expect(emitSpy).toHaveBeenCalledWith('UPC-1');
  });

  it('ignores duplicate scans within the cooldown window', () => {
    component.isScanning = true;
    scanServiceSpy.normalizeBarcode.and.returnValue('UPC-1');

    component.handleScan('UPC-1');
    const quantityAfterFirstScan = component.scanQuantities.get('UPC-1');
    component.handleScan('UPC-1');

    expect(component.scanQuantities.get('UPC-1')).toBe(quantityAfterFirstScan);
    expect(component.scannedItems).toEqual(['UPC-1']);
  });

  it('forces scan quantity to at least one', () => {
    component.updateScanQuantity('UPC-1', 0);
    component.updateScanQuantity('UPC-2', 4);

    expect(component.scanQuantities.get('UPC-1')).toBe(1);
    expect(component.scanQuantities.get('UPC-2')).toBe(4);
  });

  it('does nothing on done when not scanning or already processing', async () => {
    const processSpy = spyOn(component, 'processScannedItems').and.returnValue(Promise.resolve());

    await component.onDone();
    component.isScanning = true;
    component.processing = true;
    await component.onDone();

    expect(processSpy).not.toHaveBeenCalled();
  });

  it('finishes a scanning session, processes items, and emits lifecycle events', async () => {
    component.isScanning = true;
    component.activeMode = 'handheld';
    component.scannedItems = ['UPC-1'];
    component.handheldInputValue = 'text';
    const processingStartedSpy = spyOn(component.processingStarted, 'emit');
    const doneSpy = spyOn(component.done, 'emit');
    const stopSpy = spyOn(component, 'stopScanner');
    const processSpy = spyOn(component, 'processScannedItems').and.returnValue(Promise.resolve());

    await component.onDone();

    expect(processingStartedSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
    expect(processSpy).toHaveBeenCalled();
    expect(component.scannedItems).toEqual([]);
    expect(component.handheldInputValue).toBe('');
    expect(component.activeMode).toBeNull();
    expect(doneSpy).toHaveBeenCalled();
  });

  it('stops scanner controls and tears down the video stream', () => {
    const trackA = { stop: jasmine.createSpy('stopA'), enabled: true };
    const trackB = { stop: jasmine.createSpy('stopB'), enabled: true };
    const video = {
      pause: jasmine.createSpy('pause'),
      srcObject: { getTracks: () => [trackA, trackB] }
    } as unknown as HTMLVideoElement;
    component.video = new ElementRef(video);
    component['controls'] = { stop: jasmine.createSpy('controls.stop') } as never;

    component.stopScanner();

    expect(component['controls']).toBeNull();
    expect(trackA.stop).toHaveBeenCalled();
    expect(trackB.stop).toHaveBeenCalled();
    expect(trackA.enabled).toBeFalse();
    expect(trackB.enabled).toBeFalse();
    expect(video.pause).toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });

  it('returns early when stopping without a video element', () => {
    component['controls'] = { stop: jasmine.createSpy('controls.stop') } as never;

    component.stopScanner();

    expect(component['controls']).toBeNull();
  });

  it('clears scans and refocuses the handheld input when handheld mode is active', () => {
    component.activeMode = 'handheld';
    component.scannedItems = ['UPC-1'];
    component.scanQuantities.set('UPC-1', 2);
    component.handheldInputValue = 'text';
    component['lastScannedBarcode'] = 'UPC-1';
    component['lastScannedTime'] = 999;
    const focusSpy = spyOn(component as unknown as { focusHandheldInput: () => void }, 'focusHandheldInput');

    component.clearScans();

    expect(component.scannedItems).toEqual([]);
    expect(component.scanQuantities.size).toBe(0);
    expect(component.handheldInputValue).toBe('');
    expect(component['lastScannedBarcode']).toBeNull();
    expect(component['lastScannedTime']).toBe(0);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('focusHandheldInput focuses and selects the handheld field', (done) => {
    const nativeInput = {
      focus: jasmine.createSpy('focus'),
      select: jasmine.createSpy('select')
    } as unknown as HTMLInputElement;
    component.handheldInput = new ElementRef(nativeInput);

    component['focusHandheldInput']();

    setTimeout(() => {
      expect(nativeInput.focus).toHaveBeenCalled();
      expect(nativeInput.select).toHaveBeenCalled();
      done();
    });
  });

  it('processes a session-cached item using its internal barcode', async () => {
    component.scanQuantities.set('UPC-1', 3);
    component.sessionItems.set('UPC-1', baseItem);
    inventoryServiceSpy.updateQuantity.and.returnValue(of({ ...baseItem, quantity: 8 }));

    await component.processScannedItems();

    expect(inventoryServiceSpy.updateQuantity).toHaveBeenCalledWith('ITEM-00001', 'add', 3);
    expect(inventoryIndexSpy.registerItem).toHaveBeenCalled();
    expect(inventoryServiceSpy.loadInventory).toHaveBeenCalled();
    expect(component.processing).toBeFalse();
  });

  it('processes a session-cached item using an external barcode when no internal barcode exists', async () => {
    const sessionItem = { ...baseItem, internalBarcode: '', externalBarcode: ['EXT-1'] };
    component.scanQuantities.set('EXT-1', 2);
    component.sessionItems.set('EXT-1', sessionItem);
    inventoryServiceSpy.updateQuantity.and.returnValue(of({ ...sessionItem, quantity: 7 }));

    await component.processScannedItems();

    expect(inventoryServiceSpy.updateQuantity).toHaveBeenCalledWith('EXT-1', 'add', 2);
  });

  it('skips a locally indexed item that has no valid barcode to update', async () => {
    const brokenItem = { ...baseItem, internalBarcode: '', externalBarcode: [] };
    component.scanQuantities.set('BROKEN', 1);
    inventoryIndexSpy.getByBarcode.and.returnValue(brokenItem);
    spyOn(console, 'error');

    await component.processScannedItems();

    expect(console.error).toHaveBeenCalled();
    expect(inventoryServiceSpy.updateQuantity).not.toHaveBeenCalled();
  });

  it('looks up an item remotely and uses a string external barcode when returned', async () => {
    component.scanQuantities.set('REMOTE', 2);
    inventoryIndexSpy.getByBarcode.and.returnValue(null);
    inventoryServiceSpy.lookUpByBarcode.and.returnValue(of({
      ...baseItem,
      internalBarcode: '',
      externalBarcode: 'EXT-STRING'
    } as unknown as Inventory));
    inventoryServiceSpy.updateQuantity.and.returnValue(of({ ...baseItem, quantity: 7 }));

    await component.processScannedItems();

    expect(inventoryServiceSpy.lookUpByBarcode).toHaveBeenCalledWith('REMOTE');
    expect(inventoryServiceSpy.updateQuantity).toHaveBeenCalledWith('EXT-STRING', 'add', 2);
  });

  it('skips a remotely found item that still has no valid barcode', async () => {
    component.scanQuantities.set('REMOTE-BROKEN', 1);
    inventoryIndexSpy.getByBarcode.and.returnValue(null);
    inventoryServiceSpy.lookUpByBarcode.and.returnValue(of({
      ...baseItem,
      internalBarcode: '',
      externalBarcode: []
    }));
    spyOn(console, 'error');

    await component.processScannedItems();

    expect(console.error).toHaveBeenCalled();
    expect(inventoryServiceSpy.updateQuantity).not.toHaveBeenCalled();
  });

  it('collects missing items when remote lookup fails and hands them to manual processing', async () => {
    component.scanQuantities.set('MISSING', 4);
    inventoryIndexSpy.getByBarcode.and.returnValue(null);
    inventoryServiceSpy.lookUpByBarcode.and.returnValue(throwError(() => new Error('missing')));
    const resultsSpy = spyOn(component, 'handleProcessingResults').and.returnValue(Promise.resolve());

    await component.processScannedItems();

    expect(resultsSpy).toHaveBeenCalledWith([{ barcode: 'MISSING', quantity: 4 }]);
    expect(component.processing).toBeFalse();
  });

  it('opens manual entry only for missing items not already cached in the session', async () => {
    component.sessionItems.set('KNOWN', baseItem);
    const openSpy = spyOn(component, 'openManualEntry').and.returnValue(Promise.resolve());

    await component.handleProcessingResults([
      { barcode: 'KNOWN', quantity: 1 },
      { barcode: 'NEW', quantity: 2 }
    ]);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('NEW', 2);
  });

  it('returns when manual entry resolves with no result', async () => {
    const emitSpy = spyOn(component.manualEntryNeeded, 'emit');

    const promise = component.openManualEntry('UPC-404', 2);
    expect(emitSpy).toHaveBeenCalledWith({ barcode: 'UPC-404', quantity: 2 });
    component.resolveManualEntry(null);
    await promise;

    expect(inventoryServiceSpy.linkExternalBarcode).not.toHaveBeenCalled();
    expect(inventoryServiceSpy.addInventory).not.toHaveBeenCalled();
  });

  it('links an external barcode to an existing selected item from manual entry', async () => {
    inventoryServiceSpy.linkExternalBarcode.and.returnValue(of({ ...baseItem, externalBarcode: ['UPC-NEW'] }));
    const emitSpy = spyOn(component.manualEntryNeeded, 'emit');

    const promise = component.openManualEntry('UPC-NEW', 5);
    expect(emitSpy).toHaveBeenCalled();
    component.resolveManualEntry({
      mode: 'match',
      selectedItem: baseItem,
      quantity: 5
    });
    await promise;

    expect(inventoryServiceSpy.linkExternalBarcode).toHaveBeenCalledWith('inv-1', 'UPC-NEW', 5);
    expect(inventoryServiceSpy.loadInventory).toHaveBeenCalled();
    expect(inventoryIndexSpy.registerItem).toHaveBeenCalled();
    expect(component.sessionItems.get('UPC-NEW')).toEqual(jasmine.objectContaining({ externalBarcode: ['UPC-NEW'] }));
  });

  it('logs an error when linking an external barcode fails', async () => {
    spyOn(console, 'error');
    inventoryServiceSpy.linkExternalBarcode.and.returnValue(throwError(() => new Error('link failed')));

    const promise = component.openManualEntry('UPC-ERR', 1);
    component.resolveManualEntry({
      mode: 'match',
      selectedItem: baseItem,
      quantity: 1
    });
    await promise;

    expect(console.error).toHaveBeenCalled();
  });

  it('adds a new inventory item from manual entry', async () => {
    const newItem = { ...baseItem, internalID: 'inv-2', internalBarcode: 'ITEM-00002' };
    inventoryServiceSpy.addInventory.and.returnValue(of(newItem));

    const promise = component.openManualEntry('UPC-NEW', 2);
    component.resolveManualEntry({
      mode: 'new',
      newItem,
      quantity: 2
    });
    await promise;

    expect(inventoryServiceSpy.addInventory).toHaveBeenCalledWith(newItem);
    expect(inventoryServiceSpy.loadInventory).toHaveBeenCalled();
    expect(inventoryIndexSpy.registerItem).toHaveBeenCalledWith(newItem);
    expect(component.sessionItems.get('UPC-NEW')).toEqual(newItem);
  });

  it('logs an error when saving a new manual item fails', async () => {
    spyOn(console, 'error');
    inventoryServiceSpy.addInventory.and.returnValue(throwError(() => new Error('save failed')));

    const promise = component.openManualEntry('UPC-ERR', 1);
    component.resolveManualEntry({
      mode: 'new',
      newItem: baseItem,
      quantity: 1
    });
    await promise;

    expect(console.error).toHaveBeenCalled();
  });

  it('resolves manual entry promises, exposes scan entries, and handles misc helpers', () => {
    const resolverSpy = jasmine.createSpy('resolver');
    component['manualEntryResolver'] = resolverSpy;
    const result: ManualEntryResult = {
      mode: 'new',
      newItem: baseItem,
      quantity: 1
    };
    component.scanQuantities.set('UPC-1', 3);
    spyOn(console, 'log');

    component.resolveManualEntry(result);
    expect(resolverSpy).toHaveBeenCalledWith(result);

    expect(component.trackByBarcode(0, { key: 'UPC-1', value: 3 })).toBe('UPC-1');
    expect(component.getScanEntries()).toEqual([{ key: 'UPC-1', value: 3 }]);

    component.debugEntry('ABC');
    expect(console.log).toHaveBeenCalledWith('ENTER FIRED', 'ABC');

    component.handheldInputValue = 'ABC';
    component.clearHandheldInput();
    expect(component.handheldInputValue).toBe('');

    component.scannedItems = ['UPC-1', 'UPC-2'];
    component.removeScannedItem('UPC-1');
    expect(component.scannedItems).toEqual(['UPC-2']);
    expect(component.scanQuantities.has('UPC-1')).toBeFalse();
  });
});
