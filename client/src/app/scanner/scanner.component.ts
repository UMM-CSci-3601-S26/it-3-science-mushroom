import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { OnDestroy } from '@angular/core';
import { ManualEntry } from '../inventory/manual-entry';
import { InventoryIndex } from '../inventory/inventory-index';
import { InventoryService } from '../inventory/inventory.service'
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
})

export class ScannerComponent implements AfterViewInit, OnDestroy {
  scannedItems: string[] = [];
  processedBarcodes = new Map<string, string>();
  @ViewChild('video', { static: false })
    video!: ElementRef<HTMLVideoElement>;

  @Output()
    scanned = new EventEmitter<string>();
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
  // eslint-disable-next-line
  constructor(private inventoryIndex: InventoryIndex,
  // eslint-disable-next-line
              private inventoryService: InventoryService,
              // eslint-disable-next-line
              private dialog: MatDialog) {
    console.log('ScannerComponent initialized');

  }
  private codeReader = new BrowserMultiFormatReader();
  private controls: IScannerControls | null = null;

  async startScanner() {
    console.log('START SCANNER CALLED');

    const videoEl = this.video.nativeElement;
    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    const deviceId = devices?.[0]?.deviceId;

    if (!deviceId) {
      console.error('No video input devices found');
      return;
    }

    this.codeReader.decodeFromVideoDevice(
      deviceId,
      videoEl,
      (result, error, controls) => {
        this.controls = controls;

        if (result) {
          const code = result.getText();
          console.log('SCAN RESULT:', result.getText());
          this.scanned.emit(code);
          this.onScan(code);
          this.controls = null; // stop scanning after first successful scan
        }

        this.controls = controls;
      }
    );
  }
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
  async openManualEntry(barcode: string) {
    const dialogRef = this.dialog.open(ManualEntry, { data: { barcode }});

    const result = await firstValueFrom(dialogRef.afterClosed());

    if (result) {
      result.internalBarcode = barcode;
      await firstValueFrom(this.inventoryService.addInventory(result))
    }

    return null;
  }

  onScan(barcode: string) {
    console.log('Scanned barcode:', barcode);
    this.scannedItems.push(barcode);
  }

  async processScannedItems() {
    for (const barcode of this.scannedItems) {
      if (this.processedBarcodes.has(barcode)) {
        continue;
      }
      let item = this.inventoryIndex.getByBarcode(barcode);

      if (!item) {
        try {
          item = await this.inventoryService.lookUpByBarcode(barcode).toPromise();
          this.inventoryIndex.registerItem(item);
        } catch {
          item = await this.openManualEntry(barcode);
          if (item) {
            this.inventoryIndex.registerItem(item);
          }
        }
      }
    }
  }
  async onDone() {
    await this.processScannedItems();
    this.scannedItems = [];
  }
}
