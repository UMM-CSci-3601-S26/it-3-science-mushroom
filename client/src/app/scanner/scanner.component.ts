import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, Input } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { OnDestroy } from '@angular/core';
import { InventoryIndex } from '../inventory/inventory-index';
import { InventoryService } from '../inventory/inventory.service'
import { firstValueFrom } from 'rxjs';
import { Inventory } from '../inventory/inventory';
import { ScanService } from './scan-service';
import { CommonModule } from '@angular/common';
import { ManualEntryResult } from '../inventory/manual-entry';
import { FormsModule } from '@angular/forms';

type ScanMode = "camera" | "handheld";
@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ScannerComponent implements AfterViewInit, OnDestroy {
  // holds the raw barcodes during the scan phase
  scannedItems: string[] = [];
  scanQuantities = new Map<string, number>();
  // becomes true when scanner/camera is on and is ready to accept input
  isScanning = false;
  // becomes true when user is done scanning and ready to process items
  processing = false;
  readonly scanModes: { key: ScanMode; label: string; description: string}[] = [
    {key: "camera", label: "Camera Scan", description: "Use on devices with a camera: phones, tablets, laptops, etc"},
    {key: "handheld", label: "Hand Held Scan", description: "Use this with a USB or Bluetooth barcode scanner"}
  ];

  activeMode: ScanMode | null = null;
  handheldInputValue = '';
  @Input() currentScannerAction: 'add' | 'remove' = 'add';

  scannerAction() {
    return this.currentScannerAction;
  }

  /**
   * Held items for session, this will be populated by the items found/manually inputted
   * so the person wont have to input data for the same item more than once
   */
  sessionItems = new Map<string, Inventory>();

  private manualEntryResolver!: (value: ManualEntryResult | null) => void;
  @ViewChild('video', { static: false })
    video!: ElementRef<HTMLVideoElement>;

  @ViewChild('handheldInput', { static: false}) handheldInput?: ElementRef<HTMLInputElement>;

  @Output() scanned = new EventEmitter<string>();
  @Output() manualEntryNeeded = new EventEmitter<{ barcode: string, quantity: number }>();
  @Output() processingStarted = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();

  private codeReader = new BrowserMultiFormatReader();
  private controls: IScannerControls | null = null;

  private lastScannedBarcode: string | null;
  private lastScannedTime = 0;
  private readonly SCAN_COOLDOWN_MS = 1500;

  constructor(
    // eslint-disable-next-line
    private inventoryIndex: InventoryIndex,
    // eslint-disable-next-line
    private inventoryService: InventoryService,
    // eslint-disable-next-line
    private scanService: ScanService) {
    console.log('ScannerComponent initialized');
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit FIRED');
  }

  ngOnDestroy() {
    console.log('ngOnDestroy FIRED');
    this.stopScanner();
  }
  async setMode(mode: ScanMode) {
    if (this.processing) {
      return;
    }
    if (this.activeMode === mode && this.isScanning) {
      if (mode === 'handheld') {
        this.focusHandheldInput();
      }
      return;
    }

    this.stopScanner();
    this.activeMode = mode;
    this.isScanning = true;

    if (mode === 'camera') {
      await new Promise(resolve => setTimeout(resolve));
      await this.startCameraScanner();
      return;
    }
    this.focusHandheldInput();
  }

  deactivateMode() {
    this.stopScanner();
    this.activeMode = null;
    this.isScanning = false;
    this.handheldInputValue = '';
  }

  /**
   * Phase 1 of scanning
   * Opens a scan UI, resets any previous data and activates camera for now
   * sets isScanning true for ui control
   */
  async startCameraScanner() {

    if (!this.video?.nativeElement) {
      return;
    }

    console.log('START SCANNER CALLED');

    const videoEl = this.video.nativeElement;

    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia( { video : { facingMode: 'environment'}});

      permissionStream.getTracks().forEach(t => t.stop());

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      console.log('video devices:', devices);

      const deviceId = devices?.[0].deviceId;


      if (!deviceId) {
        console.error('No video input devices found');
        this.isScanning = false;
        this.activeMode = null;
        return;
      }

      this.codeReader.decodeFromVideoDevice(
        deviceId,
        videoEl,
        (result, error, controls) => {
          this.controls = controls;

          if (result) {
            const code = result.getText();
            console.log('SCAN RESULT:', code);
            this.handleScan(code);
          }
        }
      );
    } catch (err) {
      console.error('Camera permission/device error: ', err);
      this.isScanning = false;
      this.activeMode = null;
    }
  }

  submitHandheldScan(rawValue: string) {
    console.log('submitHandheldScan called with:', rawValue);
    if (!this.isScanning || this.activeMode !== 'handheld') {
      console.log('submit blocked:', { isScanning: this.isScanning, activeMode: this.activeMode });
      return;
    }
    const trimmed = rawValue?.trim();
    if (!trimmed) {
      console.log('submit blocked: empty trimmed value');
      return;
    }
    this.handleScan(trimmed);
    this.handheldInputValue = '';
    this.focusHandheldInput();
  }

  /**
   * Phase 2 of scanning
   * Every time a barcode is scanned it will clean it and send it to the scannedItem ( not session items )
   * @param rawBarcode
   */
  handleScan(rawBarcode: string) {
    if (!this.isScanning) {
      return;
    }

    const normalized = this.scanService.normalizeBarcode(rawBarcode);
    const now = Date.now();

    if (!normalized) {
      return;
    }

    if ( normalized === this.lastScannedBarcode &&
       now - this.lastScannedTime < this.SCAN_COOLDOWN_MS) {
      return;
    }

    this.lastScannedBarcode = normalized;
    this.lastScannedTime = now;

    const currentQuantity = this.scanQuantities.get(normalized) ?? 0;
    this.scanQuantities.set(normalized, currentQuantity + 1);

    if (!this.scannedItems.includes(normalized)) {
      this.scannedItems.push(normalized);
    }

    console.log('Normalized Barcode', normalized, 'qty:', this.scanQuantities.get(normalized));
    this.scanned.emit(normalized);
  }

  /**
   * Allows the user to input the desired amount of that scanned item into the system and if they don't
   * the method will resort to a default of 1 since a scanned item innately is one item
   */
  updateScanQuantity(barcode: string, value: number) {
    const safeValue = Number(value);
    this.scanQuantities.set(barcode, safeValue > 0 ? safeValue : 1);
  }

  /**
   * Phase 3 of scanning
   *  when the user clicks done the onDone() is called to end the scanning session
   *  this is done by switching the isScanning to false
   *  and stopping the scanner
   *
   */
  async onDone() {
    if (!this.isScanning || this.processing) {
      return;
    }
    this.processingStarted.emit();
    this.isScanning = false;
    this.stopScanner();

    await this.processScannedItems();

    this.scannedItems = [];
    this.handheldInputValue = '';
    this.activeMode = null;
    this.done.emit();
  }

  /**
   * Stops camera and releases media stream
   */
  stopScanner() {
    console.log('STOP SCANNER');

    this.controls?.stop();
    this.controls = null;

    if (!this.video?.nativeElement) {
      return;
    }

    const video = this.video.nativeElement;
    const stream = video.srcObject as MediaStream | null;

    if (stream) {
      console.log('stopping tracks', stream.getTracks().length);
      stream.getTracks().forEach(t => {
        t.stop();
        t.enabled = false;
      });
    }

    video.pause();
    video.srcObject = null;

    // navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    //   stream.getTracks().forEach(t => t.stop());
    // }).catch(err => {
    //   console.error('Error stopping media stream:', err);
    // });
  }

  clearScans() {
    this.scannedItems = [];
    this.scanQuantities.clear();
    this.handheldInputValue = '';
    this.lastScannedBarcode = null;
    this.lastScannedTime = 0;

    if (this.activeMode === "handheld") {
      this.focusHandheldInput();
    }
  }

  private focusHandheldInput() {
    setTimeout(() => {
      this.handheldInput?.nativeElement.focus();
      this.handheldInput?.nativeElement.select();
    });
  }

  /**
   * Phase 4 of scanning
   * Goes through every scanned barcode in scannedItems once the user clicked the DONE button
   * seperates the items that were found in the batch from the ones that were not found
   * then handles the missing items with a helper function
   */
  async processScannedItems() {
    this.processing = true;
    const foundItems: Inventory[] = [];
    const missingItems: { barcode: string; quantity: number }[] = [];

    for (const [barcode, chosenQuantity] of this.scanQuantities.entries()) {

      if (this.sessionItems.has(barcode)) {
        const existingSessionItem = this.sessionItems.get(barcode);

        if (existingSessionItem) {
          let barcodeValue: string | null = null;

          if (
            existingSessionItem.internalBarcode &&
          existingSessionItem.internalBarcode.trim() !== ''
          ) {
            barcodeValue = existingSessionItem.internalBarcode;
          } else if (
            Array.isArray(existingSessionItem.externalBarcode) &&
          existingSessionItem.externalBarcode.length > 0
          ) {
            barcodeValue = existingSessionItem.externalBarcode[0];
          }

          if (barcodeValue) {
            const updated = await firstValueFrom(
              this.inventoryService.updateQuantity(barcodeValue, 'add', chosenQuantity)
            );

            this.inventoryIndex.registerItem(updated);
            this.sessionItems.set(barcode, updated);
            foundItems.push(updated);
            this.inventoryService.loadInventory();
            continue;
          }
        }
      }

      let item = this.inventoryIndex.getByBarcode(barcode);

      if (item) {
        let barcodeValue: string | null = null;

        if (item.internalBarcode && item.internalBarcode.trim() !== '') {
          barcodeValue = item.internalBarcode;
        } else if (
          Array.isArray(item.externalBarcode) &&
          item.externalBarcode.length > 0
        ) {
          barcodeValue = item.externalBarcode[0];
        }

        if (!barcodeValue) {
          console.error('No valid barcode found on locally indexed item', item);
          continue;
        }

        const updated = await firstValueFrom(
          this.inventoryService.updateQuantity(barcodeValue, 'add', chosenQuantity)
        );

        this.inventoryIndex.registerItem(updated);
        this.sessionItems.set(barcode, updated);
        foundItems.push(updated);
        this.inventoryService.loadInventory();
        continue;
      }

      try {
        item = await firstValueFrom(
          this.inventoryService.lookUpByBarcode(barcode)
        );

        if (item) {
          let barcodeValue: string | null = null;

          if (item.internalBarcode && item.internalBarcode.trim() !== '') {
            barcodeValue = item.internalBarcode;
          } else if (
            Array.isArray(item.externalBarcode) &&
          item.externalBarcode.length > 0
          ) {
            barcodeValue = item.externalBarcode[0];
          } else if (
            typeof item.externalBarcode === 'string' &&
          item.externalBarcode !== ''
          ) {
            barcodeValue = item.externalBarcode;
          }

          if (!barcodeValue) {
            console.error('No valid barcode found on item', item);
            continue;
          }

          const updated = await firstValueFrom(
            this.inventoryService.updateQuantity(barcodeValue, 'add', chosenQuantity)
          );

          this.inventoryIndex.registerItem(updated);
          this.sessionItems.set(barcode, updated);
          foundItems.push(updated);
          this.inventoryService.loadInventory();
        }
      } catch {
        missingItems.push({
          barcode, quantity: chosenQuantity});
      }
    }

    console.log('Found:', foundItems.length, 'missing', missingItems.length);

    await this.handleProcessingResults(missingItems);
    this.processing = false;
  }
  /**
   * For each item in missingItems[] it will ask the user to enter
   * information about each one
   */
  async handleProcessingResults(missingItems: { barcode: string; quantity: number }[]) {
    for (const missing of missingItems) {
      if (this.sessionItems.has(missing.barcode)) {
        continue;
      }
      await this.openManualEntry(missing.barcode, missing.quantity);
    }
  }

  /**
   * After the user has clicked done and the items are being search for in the system
   * by processScannedItem() all the items that dont have a place in the system
   * are put into missingItems[] and handleProcessingResults() sends the missing items
   * to openManualEntry() which will prompt the user to input information
   * about each item
   */
  async openManualEntry(barcode: string, quantity: number = 1) {
    const result = await new Promise<ManualEntryResult | null>(r => {
      this.manualEntryResolver = r;
      this.manualEntryNeeded.emit({ barcode, quantity });
    });

    if (!result) {
      return;
    }

    if (result.mode === 'match' && result.selectedItem) {
      try {
        const updated = await firstValueFrom(
          this.inventoryService.linkExternalBarcode(
            result.selectedItem.internalID,
            barcode,
            result.quantity));

        this.inventoryService.loadInventory();
        this.inventoryIndex.registerItem(updated);
        this.sessionItems.set(barcode, updated);
      } catch (err) {
        console.error("Failed to link barcode to existing item", err);
      }

      return;
    }

    if (result.mode === 'new' && result.newItem) {
      try {
        const saved = await firstValueFrom(
          this.inventoryService.addInventory(result.newItem)
        );

        this.inventoryService.loadInventory();

        if (saved) {
          this.inventoryIndex.registerItem(saved);
          this.sessionItems.set(barcode, saved);
        }
      } catch (err) {
        console.error("failed to save manually entered item", err);
      }
    }
  }

  resolveManualEntry(result: ManualEntryResult | null) {
    this.manualEntryResolver?.(result);
  }

  trackByBarcode(index: number, entry: { key: string; value: number}) {
    return entry.key;
  }

  getScanEntries() {
    return Array.from(this.scanQuantities.entries()).map(([key, value]) => ({
      key, value
    }));
  }

  debugEntry(value: string) {
    console.log('ENTER FIRED', value);
  }

  clearHandheldInput() {
    this.handheldInputValue = '';
  }

  removeScannedItem(barcode: string) {
    this.scannedItems = this.scannedItems.filter(item => item !== barcode);

    this.scanQuantities.delete(barcode);
  }
}
