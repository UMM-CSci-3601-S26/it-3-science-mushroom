// Angular Imports
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

// JS Imports
import { catchError, of} from 'rxjs';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";

// Inventory Imports
import { Inventory } from '../../inventory/inventory';
import { InventoryService } from '../../inventory/inventory.service';

// Stock Report Imports
import { StockReportService } from '../stock-report.service';

@Component({
  selector: "app-pdf-generator",
  templateUrl: "./report-generator.component.html",
  styleUrls: ["./report-generator.component.scss"],
})
export class PdfGeneratorComponent {
  private inventoryService = inject(InventoryService);
  private stockReportService = inject(StockReportService);
  private dateTime = new Date();

  // Helper function to format date and time for the PDF name and description
  private formatDateTime(date: Date): string {
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1; // Months are zero-indexed
    const year = date.getUTCFullYear();
    return `${month}-${day}-${year}`;
  }

  inventory = toSignal <Inventory[]>(
    this.inventoryService.getInventory().pipe(
      catchError(() => of([]))
    )
  );

  // Compute arrays of items based on their stock state
  stockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => item.stockState === 'Stocked')
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity]) ?? [];
  });

  outOfStockItems = computed(() => {
    return this.inventory()
      ?.filter(item => item.stockState === 'Out of Stock')
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity]) ?? [];
  });

  overstockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => item.stockState === 'Over-Stocked')
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity]) ?? [];
  });

  understockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => item.stockState === 'Under-Stocked')
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity]) ?? [];
  });

  /**
   * Generates a PDF report of the inventory, grouped by Stock State. Each group has its own table with item description, quantity, max quantity, and min quantity.
   * The PDF is saved with the name "StockReport_MM-DD-YYYY.pdf" where MM-DD-YYYY is the current date. The PDF also includes a title and description with the date.
   * @param savePdf boolean indicating whether to save PDF to server (true) or download to client machine (false)
  */
  generatePDF(savePdf: boolean) {
    const doc = new jsPDF();
    // Title
    doc.setFontSize(16);
    doc.text("Stock Report", 10, 10);
    // Description
    doc.setFontSize(12);
    doc.text("This is a Stock Report of the inventory on ${formattedDate}".replace("${formattedDate}", this.formatDateTime(this.dateTime)), 10, 20);

    // Table Constants
    const headers = [["Item Description", "Quantity", "Max Quantity", "Min Quantity"]];
    const tableSpace = 10; // 10mm of space
    const titleSpace = 1; // 5mm of space
    const itemSpace = 80; // Item column width
    const quantitySpace = 20; // Quantity/Max/Min column width

    // Stocked Table
    const startY1 = 30; // Starting Y position for the first table

    doc.setFontSize(12);
    doc.text("Stocked Items", 15, 30);
    autoTable(doc, {
      head: headers,
      body: this.stockedItems(),
      startY: startY1+titleSpace,
      theme: 'striped',
      columnStyles: {
        0: { // Item
          cellWidth: itemSpace
        },
        1: { // Quantity
          cellWidth: quantitySpace
        },
        2: { // Max Quantity
          cellWidth: quantitySpace
        },
        3: { // Min Quantity
          cellWidth: quantitySpace
        }
      },
    });

    // Calculate the startY for the second table
    // doc.lastAutoTable.finalY holds the Y-coordinate of the last drawn point of the table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startY2 = (doc as any).lastAutoTable.finalY + tableSpace;

    // Out of Stock Table
    doc.setFontSize(12);
    doc.text("Out of Stock Items", 15, startY2);
    autoTable(doc, {
      head: headers,
      body: this.outOfStockItems(),
      startY: startY2+titleSpace,
      theme: 'striped',
      columnStyles: {
        0: { // Item
          cellWidth: itemSpace
        },
        1: { // Quantity
          cellWidth: quantitySpace
        },
        2: { // Max Quantity
          cellWidth: quantitySpace
        },
        3: { // Min Quantity
          cellWidth: quantitySpace
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startY3 = (doc as any).lastAutoTable.finalY + tableSpace;

    // Overstocked Table
    doc.setFontSize(12);
    doc.text("Overstocked Items", 15, startY3);
    autoTable(doc, {
      head: headers,
      body: this.overstockedItems(),
      startY: startY3+titleSpace,
      theme: 'striped',
      columnStyles: {
        0: { // Item
          cellWidth: itemSpace
        },
        1: { // Quantity
          cellWidth: quantitySpace
        },
        2: { // Max Quantity
          cellWidth: quantitySpace
        },
        3: { // Min Quantity
          cellWidth: quantitySpace
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startY4 = (doc as any).lastAutoTable.finalY + tableSpace;

    // Understocked Table
    doc.setFontSize(12);
    doc.text("Understocked Items", 15, startY4);
    autoTable(doc, {
      head: headers,
      body: this.understockedItems(),
      startY: startY4+titleSpace,
      theme: 'striped',
      columnStyles: {
        0: { // Item
          cellWidth: itemSpace
        },
        1: { // Quantity
          cellWidth: quantitySpace
        },
        2: { // Max Quantity
          cellWidth: quantitySpace
        },
        3: { // Min Quantity
          cellWidth: quantitySpace
        }
      },
    });

    // Save PDF with name to client
    const filename = `StockReport_${this.formatDateTime(this.dateTime)}.pdf`;

    if(savePdf) {
      // Save PDF to server
      const pdfBlob = doc.output('blob');

      const formData = new FormData();
      formData.append("uploadedPDF", pdfBlob);
      formData.append("reportName", filename);

      this.stockReportService.addNewReport(formData).subscribe({
        next: (response) => {
          console.log("PDF report saved to server with ID:", response);
        },
        error: (error) => {
          console.error("Error saving PDF report to server:", error);
        }
      });
    } else {
      // Save to client machine
      doc.save(filename);
    }
  }

  downloadPdfReport() {
    this.generatePDF(false);
  }

  savePdfReport() {
    this.generatePDF(true);
  }

  /**
   * Converts base64 into a Blob for downloading files off of the server. Currently only handles PDFs.
   * @param base64String The base64 string to convert to a Blob
   * @returns The converted Blob
   */
  covertBase64ToBlob(base64String: string): Blob {
    const binaryString = atob(base64String); // Decode Base64
    const bytes = new Uint8Array(binaryString.length);
    // Fill byte array with the decoded b64
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Make and return Blob
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return blob;
  }

  /**
   * Downloads all PDFs from the server as a ZIP file.
   */
  downloadPdfReports () {
    const zip = new JSZip();
    const usedFilenames = new Set<string>();

    this.stockReportService.getReports().subscribe({
      next: (response) => {
        for (const report of response) {
          const pdfBlob = this.covertBase64ToBlob(report.stockReportPDF); // Convert base64 to Blob
          let finalFilename = report.reportName; // Temp var to check for duplicate file names

          // If file name already exists
          if (usedFilenames.has(finalFilename)) {
            // Split filename and extension
            const parts = finalFilename.split('.');
            const extension = parts.pop(); // Get last part (extension)
            const nameWithoutExt = parts.join('.'); // Everything else

            // Keep incrementing counter until we find a unique name
            let counter = 1;
            while (usedFilenames.has(`${nameWithoutExt} (${counter}).${extension}`)) {
              counter++;
            }
            finalFilename = `${nameWithoutExt} (${counter}).${extension}`; // Combine everything back together to make new name
          }

          usedFilenames.add(finalFilename); // Keep track of used file names
          zip.file(finalFilename, pdfBlob); // Add blob to zip with the final file name
        }

        // Generate ZIP and trigger download
        zip.generateAsync({ type: 'blob' }).then((content) => {
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = `StockReports_${this.formatDateTime(this.dateTime)}.zip`;
          a.click();
          URL.revokeObjectURL(url);
        });
      },
      error: (error) => {
        console.error("Error downloading PDF report to client:", error);
      }
    });
  }
}
