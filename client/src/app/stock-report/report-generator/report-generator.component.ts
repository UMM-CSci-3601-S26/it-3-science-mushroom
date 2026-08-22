// Angular Imports
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

// JS Imports
import { catchError, of} from 'rxjs';
import jsPDF, { jsPDF as jsPDFClass } from "jspdf";
import autoTable from "jspdf-autotable";

// Inventory Imports
import { Inventory } from '../../inventory/inventory';
import { InventoryService } from '../../inventory/inventory.service';

// Stock Report Imports
import { StockReportService } from '../stock-report.service';
import { StockReport } from '../stock-report';

// Dialog Imports
import { DialogComponent } from '../../shared/dialog/dialog.component';
import { AuthService } from '../../auth/auth-service';

// DateTime Imports
import { FormatDateTimeService } from '../../shared/format-date-time/format-date-time.service';

// Type for jsPDF with autoTable metadata
interface jsPDFWithAutoTable extends jsPDFClass {
  lastAutoTable?: {
    finalY: number;
  };
}

// Stock Report Type
type StockType = 'actual' | 'calculated';

/**
 * ReportGeneratorComponent is responsible for generating reports and handling all interactions related to report generation, downloading, and deletion.
 * It interacts with the StockReportService to perform these actions and uses jsPDF to generate PDF reports on the client side.
 * @note Currently only handles PDF generation.
 */
@Component({
  selector: "app-report-generator",
  templateUrl: "./report-generator.component.html",
  styleUrls: ["./report-generator.component.scss"],
  imports: [MatButton, MatIcon, MatSlideToggleModule],
})
export class ReportGeneratorComponent {
  private inventoryService = inject(InventoryService);
  private stockReportService = inject(StockReportService);
  private dialog = inject(MatDialog);
  private dateTime = new Date();
  private snackBar = inject(MatSnackBar);
  private formatDateTimeService = inject(FormatDateTimeService);
  private authService = inject(AuthService);
  private readonly pageBreakThreshold = 0.75; // Percentage of page height to trigger page break
  private readonly tablePageTopY = 15;

  viewType = signal<StockType>('actual');

  setViewType(viewType: StockType): void {
    this.viewType.set(viewType);
  }

  get canViewReports(): boolean {
    return this.authService.hasPermission('view_reports');
  }

  get canManageStockReports(): boolean {
    return this.authService.hasPermission('manage_stock_reports');
  }

  get canEditInventory(): boolean {
    return this.authService.hasPermission('edit_inventory_item');
  }

  inventory = toSignal <Inventory[]>(
    this.inventoryService.getInventory().pipe(
      catchError(() => of([]))
    )
  );

  /**
   * Uses InventoryService's calculateStates to call the API to calculate stats
   */
  calculateStates() {
    if (this.canEditInventory) {
      this.inventoryService.calculateStates().subscribe({
        next: () => {
          console.log("Calculated states for all inventory items.");
          this.snackBar.open('Calculated states for all inventory items.', 'Okay', { duration: 3000 });
        },
        error: (error) => {
          console.error("Error calculating states for inventory items:", error);
          this.snackBar.open('Error calculating states for inventory items. Please try again.', 'Okay', { duration: 3000 });
        }
      })
    }else {
      this.snackBar.open('You do not have permission to calculate states.', 'Okay', { duration: 3000 });
    }
  }

  /**
   * Cleans up given stockState, then checks that it matches the expected stockState. Returns true if it matches, false otherwise.
   */
  private matchesStockState(item: Inventory, expected: string): boolean {
    return item.stockState
      .trim()
      .toLowerCase()
      .replace(/[-\s]+/g, '') === expected;
  }

  /**
   * Cleans up given calculatedStockState, then checks that it matches the expected stockState. Returns true if it matches, false otherwise.
   */
  private matchesCalculatedStockState(item: Inventory, expected: string): boolean {
    return item.calculatedStockState
      .trim()
      .toLowerCase()
      .replace(/[-\s]+/g, '') === expected;
  }

  // Compute arrays of items based on their stock state
  stockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => this.matchesStockState(item, 'stocked'))
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  outOfStockItems = computed(() => {
    return this.inventory()
      ?.filter(item => this.matchesStockState(item, 'outofstock'))
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  overstockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => this.matchesStockState(item, 'overstocked'))
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  understockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => this.matchesStockState(item, 'understocked'))
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  calculatedStockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => this.matchesCalculatedStockState(item, 'stocked'))
      .map(item => [item.description, item.quantity, item.calculatedMinQuantity, item.maxQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  calculatedOverstockItems = computed(() => {
    return this.inventory()
      ?.filter(item => this.matchesCalculatedStockState(item, 'overstocked'))
      .map(item => [item.description, item.quantity, item.calculatedMinQuantity, item.maxQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  calculatedUnderstockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => this.matchesCalculatedStockState(item, 'understocked'))
      .map(item => [item.description, item.quantity, item.calculatedMinQuantity, item.maxQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  calculatedUnknownItems = computed(() => {
    return this.inventory()
      ?.filter(item => this.matchesCalculatedStockState(item, 'unknown'))
      .map(item => [item.description, item.quantity, item.calculatedMinQuantity, item.maxQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  /**
   * Custom helper function to add text with specified styling
   */
  private addText(doc: jsPDF, text: string, x: number, y: number, size: number, weight: string, font: string): void {
    doc.setFont(undefined, weight);
    doc.setFontSize(size);
    doc.text(text, x, y);
    doc.setFont(undefined, font);
  }

  /**
   * Moves a new table to a new page if there isn't enough space left on the current page
   * @returns Y coordinate to start new table
   */
  private checkForPageBreak(doc: jsPDFWithAutoTable, tableStartY: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();

    if (tableStartY >= pageHeight * this.pageBreakThreshold) {
      doc.addPage();
      return this.tablePageTopY;
    }

    return tableStartY;
  }

  /**
   * Generates a PDF report of the inventory, grouped by Stock State. Each group has its own table with item description, quantity, max quantity, and min quantity.
   * The PDF is saved with the name "StockReport_MM-DD-YYYY.pdf", using formatDateTime to get the formatted date. The PDF also includes a title and description with the date.
   * @param savePdf boolean indicating whether to save PDF to server (true) or download to client machine (false)
   * @param type The type of stock report to generate ('actual' or 'calculated')
  */
  generatePDF(savePdf: boolean, type: 'actual' | 'calculated') {
    if (savePdf && !this.canManageStockReports) {
      this.snackBar.open('You do not have permission to save stock reports.', 'Okay', { duration: 3000 });
      return;
    }
    if (!savePdf && !this.canViewReports) {
      this.snackBar.open('You do not have permission to download stock reports.', 'Okay', { duration: 3000 });
      return;
    }

    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Control Variables
    const headers = [["Item Description", "Quantity", "Max Quantity", "Min Quantity", "Notes"]];
    const tableSpace = 20; // 20mm of space
    const titleSpace = 3; // 3mm of space
    const itemSpace = 80; // Item column width
    const quantitySpace = 20; // Quantity/Max/Min column width
    const typeDescriptionSpace = type === 'calculated' ? 15 : 0; // 30mm of space for the type description, if present
    const startY = 35 + typeDescriptionSpace; // Starting Y position for the first table
    const tableX = 15; // X position for all tables
    const columnStyling = {
      0: { // Item
        cellWidth: itemSpace
      },
      1: { // Quantity
        cellWidth: quantitySpace
      },
      2: { // Max Quantity (Actual) / Calculated Min Quantity (Calculated)
        cellWidth: quantitySpace
      },
      3: { // Min Quantity (Actual)
        cellWidth: quantitySpace
      }
    };

    // Title
    this.addText(doc, "Stock Report - " + type, 10, 10, 16, 'bold', 'normal');
    // Description
    this.addText(doc, `Report generated on ${this.formatDateTimeService.formatDateTime(this.dateTime)[0]}`, 10, 25, 12, 'normal', 'normal');
    if(type == 'calculated') {
      this.addText(doc, `Note: This report is based on calculated stock states, which may differ from actual stock states.
      "Min Quantity also refers to the calculated minimum.
      This is the absolute bare minimum number of units needed to fulfill the requests linked to that item`, 10, 30, 10, 'normal', 'normal');
    }
    doc.line(10, 28 + typeDescriptionSpace, 200, 28 + typeDescriptionSpace); // Horizontal line under title and description

    if (type === 'actual') {
      // Stocked Table
      this.addText(doc, "Stocked Items", tableX, startY, 12, 'normal', 'normal');
      autoTable(doc, {
        head: headers,
        body: this.stockedItems(),
        startY: startY+titleSpace,
        theme: 'striped',
        columnStyles: columnStyling
      });

      // Calculate the startY for the second table
      // doc.lastAutoTable.finalY holds the Y-coordinate of the last drawn point of the table
      const startY2 = this.checkForPageBreak(doc, (doc.lastAutoTable?.finalY ?? startY) + tableSpace);

      // Out of Stock Table
      this.addText(doc, "Out of Stock Items", tableX, startY2, 12, 'normal', 'normal');
      autoTable(doc, {
        head: headers,
        body: this.outOfStockItems(),
        startY: startY2+titleSpace,
        theme: 'striped',
        columnStyles: columnStyling
      });

      const startY3 = this.checkForPageBreak(doc, (doc.lastAutoTable?.finalY ?? startY2) + tableSpace);

      // Overstocked Table
      this.addText(doc, "Overstocked Items", tableX, startY3, 12, 'normal', 'normal');
      autoTable(doc, {
        head: headers,
        body: this.overstockedItems(),
        startY: startY3+titleSpace,
        theme: 'striped',
        columnStyles: columnStyling
      });

      const startY4 = this.checkForPageBreak(doc, (doc.lastAutoTable?.finalY ?? startY3) + tableSpace);

      // Understocked Table
      this.addText(doc, "Understocked Items", tableX, startY4, 12, 'normal', 'normal');
      autoTable(doc, {
        head: headers,
        body: this.understockedItems(),
        startY: startY4+titleSpace,
        theme: 'striped',
        columnStyles: columnStyling
      });
    } else if (type === 'calculated') {
      // Stocked Table
      this.addText(doc, "Stocked Items", tableX, startY, 12, 'normal', 'normal');
      autoTable(doc, {
        head: headers,
        body: this.calculatedStockedItems(),
        startY: startY+titleSpace,
        theme: 'striped',
        columnStyles: columnStyling
      });

      // Calculate the startY for the second table
      // doc.lastAutoTable.finalY holds the Y-coordinate of the last drawn point of the table
      const startY2 = this.checkForPageBreak(doc, (doc.lastAutoTable?.finalY ?? startY) + tableSpace);

      // Overstock Table
      this.addText(doc, "Overstocked Items", tableX, startY2, 12, 'normal', 'normal');
      autoTable(doc, {
        head: headers,
        body: this.calculatedOverstockItems(),
        startY: startY2+titleSpace,
        theme: 'striped',
        columnStyles: columnStyling
      });

      const startY3 = this.checkForPageBreak(doc, (doc.lastAutoTable?.finalY ?? startY2) + tableSpace);

      // Understocked Table
      this.addText(doc, "Understocked Items", tableX, startY3, 12, 'normal', 'normal');
      autoTable(doc, {
        head: headers,
        body: this.calculatedUnderstockedItems(),
        startY: startY3+titleSpace,
        theme: 'striped',
        columnStyles: columnStyling
      });

      const startY4 = this.checkForPageBreak(doc, (doc.lastAutoTable?.finalY ?? startY3) + tableSpace);

      // Unknown Table
      this.addText(doc, "Unknown Items", tableX, startY4, 12, 'normal', 'normal');
      autoTable(doc, {
        head: headers,
        body: this.calculatedUnknownItems(),
        startY: startY4+titleSpace,
        theme: 'striped',
        columnStyles: columnStyling
      });
    } else {
      console.error(`Invalid report type: ${type}`);
      this.snackBar.open(
        `Improper type: ${type}. Please try again.`,
        `Okay`,
        { duration: 2000 }
      );
    }

    // Save PDF with name to client
    const filename = `${type}_StockReport_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.pdf`;

    if(savePdf) {
      // Save PDF to server
      const pdfBlob = doc.output('blob');

      const formData = new FormData();
      formData.append("uploadedReport", pdfBlob);
      formData.append("reportName", filename);
      formData.append("reportType", "PDF");

      this.stockReportService.addNewPdfReport(formData).subscribe({
        next: (response) => {
          console.log("PDF report saved to server with ID:", response);
          this.stockReportService.refreshReports().subscribe();
          this.snackBar.open(
            `Generating and saving ${type} report as PDF file to server...`,
            `Okay`,
            { duration: 2000 }
          );
        },
        error: (error) => {
          console.error("Error saving PDF report to server:", error);
          this.snackBar.open(
            `Error generating / saving ${type} report as PDF file. Please try again.`,
            `Okay`,
            { duration: 2000 }
          );
        }
      });
    } else {
      // Save to client machine
      this.downloadPdfToClient(filename, doc);
      this.snackBar.open(
        `Generating and downloading ${type} report as PDF file...`,
        `Okay`,
        { duration: 2000 }
      );
    }
  }

  /**
   * Helper method to download a PDF to the client machine
   * @param filename Name of the file to download
   * @param doc The jsPDF document to download
   */
  private downloadPdfToClient(filename: string, doc: jsPDFWithAutoTable) {
    doc.save(filename);
  }

  /**
   * Generate an XLSX report of the inventory, grouped by Stock State.
   * Server handles all generation, this is just for calling the service method and handling the response.
   * @param saveXlsx boolean indicating whether to save XLSX to server (true) or download to client machine (false)
   * @param type The type of stock report to generate ('actual' or 'calculated')
   */
  generateXlsx(saveXlsx: boolean, type: 'actual' | 'calculated') {
    if (saveXlsx && !this.canManageStockReports) {
      this.snackBar.open('You do not have permission to save stock reports.', 'Okay', { duration: 3000 });
      return;
    }
    if (!saveXlsx && !this.canViewReports) {
      this.snackBar.open('You do not have permission to download stock reports.', 'Okay', { duration: 3000 });
      return;
    }

    if (saveXlsx) {
      // Save to server
      this.stockReportService.generateNewXlsxReport(type).subscribe({
        next: (response) => {
          console.log(`${type} XLSX report generated and saved to server with ID:`, response);
          this.stockReportService.refreshReports().subscribe();
          this.snackBar.open(
            `Generating and saving ${type} report as XLSX file to server...`,
            `Okay`,
            { duration: 2000 }
          );
        },
        error: (error) => {
          console.error(`Error generating/saving ${type} XLSX report to server:`, error);
          this.snackBar.open(
            `Error generating/saving ${type} report as XLSX file. Please try again.`,
            `Okay`,
            { duration: 2000 }
          );
        }
      });
    } else {
      // Download to client machine
      this.stockReportService.generateAndDownloadXlsxReport(type).subscribe({
        next: (blob) => {
          const fileName = `${type}_Stock_Report_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.xlsx`;
          this.downloadFile(blob, fileName);
          this.snackBar.open(
            `Generating and downloading ${type} report as XLSX file...`,
            `Okay`,
            { duration: 2000 }
          );
        },
        error: (error) => {
          console.error(`Error generating ${type} XLSX report:`, error);
          this.snackBar.open(
            `Error generating ${type} report as XLSX file. Please try again.`,
            `Okay`,
            { duration: 2000 }
          );
        }
      });
    }
  }

  // Helper method for generating and downloading report as PDF to client
  downloadNewPdfReport(type: 'actual' | 'calculated') {
    this.generatePDF(false, type);
  }

  // Helper method for generating and saving report as PDF to server
  savePdfReport(type: 'actual' | 'calculated') {
    this.generatePDF(true, type);
  }

  // Helper method for generating and downloading report as XLSX to client
  downloadNewXlsxReport(type: 'actual' | 'calculated') {
    this.generateXlsx(false, type);
  }

  // Helper method for generating and saving report as XLSX to server
  saveXlsxReport(type: 'actual' | 'calculated') {
    this.generateXlsx(true, type);
  }

  /**
   * Delete a single report from the server. The actual logic is handled in the service.
   * @param report Report to delete from the server
   */
  deleteSingleReport(report: StockReport) {
    if (!this.canManageStockReports) {
      this.snackBar.open('You do not have permission to delete stock reports.', 'Okay', { duration: 3000 });
      return;
    }

    // Call deleteReport and handle response
    this.stockReportService.deleteSingleReport(report).subscribe({
      // If successful, show success message with report name
      next: () => {
        console.log("Report deleted from server with ID:", report._id);
        this.snackBar.open(
          `Report "${report.reportName}" deleted successfully.`,
          `Okay`,
          { duration: 2000 }
        );
      },
      // If error, show error message
      error: (error) => {
        console.error("Error deleting report from server:", error);
        this.snackBar.open(
          `Error deleting report. Please try again.`,
          `Okay`,
          { duration: 2000 }
        );
      }
    });
  }

  /**
   * Delete all reports of a specific format from the server. The actual logic is handled in the service.
   * @param format The format of reports to delete ('PDF' | 'XLSX' | 'All')
   */
  deleteAllReports(format: 'PDF' | 'XLSX' | 'All') {
    if (!this.canManageStockReports) {
      this.snackBar.open('You do not have permission to delete stock reports.', 'Okay', { duration: 3000 });
      return;
    }

    // Get all reports
    this.stockReportService.getReports().subscribe({
      next: (response) => {
        // Filter reports by format
        const filteredReports = response.filter(report => {
          if (format === 'All') {
            return true;
          }
          return report.reportType === format;
        });

        const reportCount = filteredReports.length;

        // No reports available
        if (reportCount === 0) {
          console.log("No reports available to be deleted.");
          this.snackBar.open(
            `There are no "${format}" report(s) available for deletion.`,
            `Okay`,
            { duration: 2000 }
          );
          return;
        }

        // Confirm with user that they want to delete all reports
        const dialogRef = this.dialog.open(DialogComponent, {
          data: {
            title: 'Confirm Delete All',
            numReports: reportCount,
            message: `Are you sure you want to delete ${reportCount} ${format} report(s)?`,
            buttonOne: 'Cancel',
            buttonTwo: 'Confirm',
          }
        });

        // If confirmed, handle deleting
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.stockReportService.deleteAllReports(format).subscribe({
              // If successful, show success message with number of reports deleted
              next: () => {
                console.log(`All ${format} reports deleted from server`);
                this.snackBar.open(
                  `${reportCount} ${format} report(s) deleted successfully.`,
                  `Okay`,
                  { duration: 2000 }
                );
              },
              // If error, show error message
              error: (error) => {
                console.error("Error deleting reports from server:", error);
                this.snackBar.open(
                  `Error deleting ${format} report(s). Please try again.`,
                  `Okay`,
                  { duration: 2000 }
                );
              }
            });
          }
        });
      },
      // If error fetching reports, show error message and do not proceed with delete
      error: (error) => {
        console.error("Error fetching reports from server for deletion:", error);
        this.snackBar.open(
          `Error fetching reports from the server. Please try again.`,
          `Okay`,
          { duration: 2000 }
        );
      }
    });
  }

  /**
   * Helper method to handle downloads
   * @param blob The Blob data to be downloaded as a file
   * @param fileName Name of file
   */
  downloadFile(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Download a single report from the server.
   * @param report The report to download
   */
  downloadSingleReport(report: StockReport) {
    if (!this.canViewReports) {
      this.snackBar.open('You do not have permission to download stock reports.', 'Okay', { duration: 3000 });
      return;
    }

    const fileName = `Stock_Report_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.${report.reportType === 'PDF' ? 'pdf' : report.reportType === 'XLSX' ? 'xlsx' : 'dat'}`;
    this.stockReportService.downloadSingleReportBlob(report).subscribe({
      next: (blob) => {
        this.downloadFile(blob, fileName);
      },
      error: (error) => {
        console.error("Error downloading report:", error);
        this.snackBar.open(
          `Error downloading report. Please try again.`,
          `Okay`,
          { duration: 2000 }
        );
      }
    });
  }

  /**
   * Downloads all reports from the server as a ZIP file. The actual logic is handled in the service.
   */
  downloadAllReports(format: 'PDF' | 'XLSX' | 'All') {
    if (!this.canViewReports) {
      this.snackBar.open('You do not have permission to download stock reports.', 'Okay', { duration: 3000 });
      return;
    }

    this.stockReportService.downloadAllReportsAsZip(format).subscribe({
      next: (zipBlob) => {
        // Handle case of no reports
        if (zipBlob.size === 0) {
          console.warn("No reports available for download.");
          this.snackBar.open(
            `No reports available for download.`,
            `Okay`,
            { duration: 2000 }
          );
          return;
        }

        // Create object URL and trigger download
        //const url = URL.createObjectURL(zipBlob);
        //const a = document.createElement('a');
        //a.href = url;
        if (format === 'PDF') {
          this.downloadFile(zipBlob, `StockReports_PDF_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.zip`);

          //a.download = `StockReports_PDF_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.zip`;
        } else if (format === 'XLSX') {
          this.downloadFile(zipBlob, `StockReports_XLSX_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.zip`);

          //a.download = `StockReports_XLSX_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.zip`;
        } else if (format === 'All') {
          this.downloadFile(zipBlob, `StockReports_All_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.zip`);

          //a.download = `StockReports_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.zip`;
        } else {
          this.downloadFile(zipBlob, `StockReports_UnknownTypes_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.zip`);

          //a.download = `StockReports_UnknownTypes_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.zip`;
        }
        //a.click();
        //URL.revokeObjectURL(url);

        // Show success message
        this.snackBar.open(
          `Downloaded all "${format}" report(s) as ZIP file.`,
          `Okay`,
          { duration: 2000 }
        );
      },
      error: (error) => {
        console.error("Error downloading ZIP of report(s). ", error);
        this.snackBar.open(
          `Failed to download "${format}" report(s) as ZIP. Please try again.`,
          `Okay`,
          { duration: 2000 }
        );
      }
    });
  }
}
