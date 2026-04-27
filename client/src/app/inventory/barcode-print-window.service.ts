import { Injectable } from '@angular/core';
import { PrintableBarcodeItem } from './barcode-print-item';

@Injectable({
  providedIn: 'root',
})
export class BarcodePrintWindowService {
  open(printableItems: PrintableBarcodeItem[]): boolean {
    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      return false;
    }

    printWindow.document.open();
    printWindow.document.write(this.buildPrintDocument(printableItems));
    printWindow.document.close();
    printWindow.focus();

    return true;
  }

  private buildPrintDocument(printableItems: PrintableBarcodeItem[]): string {
    const labels = printableItems
      .map(printableItem => this.buildBarcodeLabels(printableItem))
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            @page {
              margin: 0.35in;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 24px;
              color: #111;
            }

            .toolbar {
              margin-bottom: 20px;
            }

            .print-button {
              border: 1px solid #555;
              border-radius: 4px;
              background: #fff;
              padding: 8px 14px;
              font-size: 14px;
              cursor: pointer;
            }

            .barcode-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(240px, 1fr));
              gap: 16px;
              align-items: start;
            }

            .barcode-label {
              border: 1px solid #bbb;
              padding: 12px;
              text-align: center;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .item-name {
              font-weight: 700;
              margin-bottom: 6px;
            }

            .item-description {
              color: #444;
              font-size: 12px;
              margin-bottom: 8px;
            }

            .barcode-label img {
              max-width: 100%;
            }

            .barcode-text {
              font-size: 12px;
              margin-top: 4px;
            }

            @media print {
              body {
                padding: 0;
              }

              .toolbar {
                display: none;
              }

              .barcode-grid {
                gap: 12px;
              }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="print-button" type="button" onclick="window.print()">Print Barcodes</button>
          </div>
          <main class="barcode-grid">
            ${labels}
          </main>
        </body>
      </html>
    `;
  }

  private buildBarcodeLabels(printableItem: PrintableBarcodeItem): string {
    const requestedQuantity = Math.floor(Number(printableItem.quantity));
    const quantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1;

    return Array.from({ length: quantity }, () => this.buildBarcodeLabel(printableItem)).join('');
  }

  private buildBarcodeLabel(printableItem: PrintableBarcodeItem): string {
    const itemName = this.escapeHtml(printableItem.item.item);
    const description = this.escapeHtml(printableItem.item.description);
    const barcode = this.escapeHtml(printableItem.barcode);
    const barcodeImage = this.escapeHtml(printableItem.barcodeImage);

    return `
      <section class="barcode-label">
        <div class="item-name">${itemName}</div>
        <div class="item-description">${description}</div>
        <img src="${barcodeImage}" alt="${barcode}">
        <div class="barcode-text">${barcode}</div>
      </section>
    `;
  }

  private escapeHtml(value: string | number | null | undefined): string {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return String(value ?? '').replace(/[&<>"']/g, character => replacements[character]);
  }
}
