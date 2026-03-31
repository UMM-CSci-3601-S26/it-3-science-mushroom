// pdf-generator.component.ts
import { Component } from "@angular/core";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Component({
  selector: "app-pdf-generator",
  templateUrl: "./pdf-generator.component.html",
  styleUrls: ["./pdf-generator.component.scss"],
})
export class PdfGeneratorComponent {
  generatePDF() {
    const doc = new jsPDF();
    // Title
    doc.setFontSize(16);
    doc.text("Stock Report", 10, 10);
    // Description
    doc.setFontSize(12);
    doc.text("This is a Stock Report of the inventory on HOUR:MINUTE, DAY/MONTH/YEAR", 10, 20);

    // Table Constants
    const headers = [["Item", "Quantity", "Max Quantity", "Min Quantity"]];
    const tableSpace = 10; // 10mm of space
    const titleSpace = 1; // 5mm of space
    const itemSpace = 80; // Item column width
    const quantitySpace = 20; // Quantity/Max/Min column width

    // Stocked Table
    const startY1 = 30; // Starting Y position for the first table

    doc.setFontSize(12);
    doc.text("Stocked Items", 15, 30);
    const stockedData = [
      ["Pencil", 20, 100, 10],
      ["Eraser", 1, 10, 0],
    ];
    autoTable(doc, {
      head: headers,
      body: stockedData,
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
    const outOfStockData = [
      ["Pencil", 0, 100, 10],
      ["Eraser", 0, 10, 0],
    ];
    autoTable(doc, {
      head: headers,
      body: outOfStockData,
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
    const overStockedData = [
      ["Pencil", 100, 50, 10],
      ["Eraser", 20, 10, 0],
    ];
    autoTable(doc, {
      head: headers,
      body: overStockedData,
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
    const underStockedData = [
      ["Pencil", 5, 50, 10],
      ["Eraser", 3, 10, 5],
    ];
    autoTable(doc, {
      head: headers,
      body: underStockedData,
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

    doc.save("stock-report.pdf");
  }
}
