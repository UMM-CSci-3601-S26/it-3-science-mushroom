import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { OnDestroy } from '@angular/core';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
})
export class ScannerComponent implements AfterViewInit, OnDestroy {

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

  constructor() {
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
          console.log('SCAN RESULT:', result.getText());
          this.scanned.emit(result.getText());

          controls.stop();
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
}
