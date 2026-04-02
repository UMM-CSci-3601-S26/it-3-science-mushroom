import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { OnDestroy } from '@angular/core';
// import { ManualEntry } from '../inventory/manual-entry';
import { InventoryIndex } from '../inventory/inventory-index';
import { InventoryService } from '../inventory/inventory.service'
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Inventory } from '../inventory/inventory';
import { ScanService } from './scan-service';
@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
})

export class ScannerComponent implements AfterViewInit, OnDestroy {
  // holds the raw barcodes during the scan phase
  scannedItems: string[] = [];
  // becomes true when scanner/camera is on and is ready to accept input
  isScanning = false;
  // becomes true when user is done scanning and ready to process items
  processing = false;

  /**
   * Held items for session, this will be populated by the items found/manually inputted
   * so the person wont have to input data for the same item more than once
   */
  sessionItems = new Map<string, Inventory>();
  @ViewChild('video', { static: false })
    video!: ElementRef<HTMLVideoElement>;

  @Output()
    scanned = new EventEmitter<string>();

  private codeReader = new BrowserMultiFormatReader();
  private controls: IScannerControls | null = null;


  constructor(
    // eslint-disable-next-line
    private inventoryIndex: InventoryIndex,
    // eslint-disable-next-line
    private inventoryService: InventoryService,
    // eslint-disable-next-line
    private scanService: ScanService,
    // eslint-disable-next-line
    private dialog: MatDialog) {
    console.log('ScannerComponent initialized');

  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit FIRED');
    setTimeout(() => {
      this.startScanner();
    });
  }

  ngOnDestroy() {
    console.log('ngOnDestroy FIRED');
    this.stopScanner();
  }
  /**
   * Phase 1 of scanning
   * Opens a scan UI, resets any previous data and activates camera for now
   * sets isScanning true for ui control
   *
   */
  async startScanner() {
    console.log('START SCANNER CALLED');
    // reset state
    this.clearScans();
    this.isScanning = true;

    const videoEl = this.video.nativeElement;
    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    const deviceId = devices?.[0]?.deviceId;

    if (!deviceId) {
      console.error('No video input devices found');
      this.isScanning = false;
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
          this.controls = null; // stop scanning after first successful scan
        }
      }
    );
  }
  /**
   * Phase 2 of scanning
   * Every time a barcode is scanned it will clean it and send it to the scannedItem ( not session items )
   * @param rawBarcode
   */
  handleScan(rawBarcode: string) {
    const normalized = this.scanService.normalizeBarcode(rawBarcode);
    console.log('normalized barcode: ', normalized);
    this.scannedItems.push(normalized);
    this.scanned.emit(normalized)
  }
  /**
   * Phase 3 of scanning
   *  when the user clicks done the onDone() is called to end the scanning session
   *  this is done by switching the isScanning to false
   *  and stopping the scanner
   *
   */
  async onDone() {
    this.isScanning = false;
    this.stopScanner();

    await this.processScannedItems();

    this.scannedItems = []
  }
  // stops camera and releases media stream
  stopScanner() {
    console.log('STOP SCANNER');

    this.controls?.stop();
    this.controls = null;

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

    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      stream.getTracks().forEach(t => t.stop());
    }).catch(err => {
      console.error('Error stopping media stream:', err);
    });
  }
  clearScans() {
    this.scannedItems = []
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
    const missingItems: string[] = [];

    for (const barcode of this.scannedItems) {
      if (this.sessionItems.has(barcode)) {
        console.log('already in inv, moving on')
        continue;
      }
      // Check
      let item = this.inventoryIndex.getByBarcode(barcode);
      //if the item is in the session items push it to the foundItems
      if (item) {
        foundItems.push(item)
        this.sessionItems.set(barcode, item);
      } else {
        // look in backend for barcode
        try {
          item = await firstValueFrom(this.inventoryService.lookUpByBarcode(barcode));
          if (item) {
            // if the item is in the inventory then register it to the system
            //  and push it to session items and found item
            this.inventoryIndex.registerItem(item);
            this.sessionItems.set(barcode, item);
            foundItems.push(item);
          }
        }  catch {
          // if nothing was found then push items to missingItems so it can be updated with manual entry
          missingItems.push(barcode);
        }
      }
    }
    console.log('Found:', foundItems.length, 'Missing', missingItems.length);

    // helper goes here
  }

}
