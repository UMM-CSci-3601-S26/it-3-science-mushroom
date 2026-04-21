// Angular Imports
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

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
import { DialogComponent } from '../../dialog/dialog.component';

// Type for jsPDF with autoTable metadata
interface jsPDFWithAutoTable extends jsPDFClass {
  lastAutoTable?: {
    finalY: number;
  };
}

/**
 * ReportGeneratorComponent is responsible for generating reports and handling all interactions related to report generation, downloading, and deletion.
 * It interacts with the StockReportService to perform these actions and uses jsPDF to generate PDF reports on the client side.
 * @note Currently only handles PDF generation.
 */
@Component({
  selector: "app-report-generator",
  templateUrl: "./report-generator.component.html",
  styleUrls: ["./report-generator.component.scss"],
  imports: [MatButton, MatIcon],
})
export class ReportGeneratorComponent {
  private inventoryService = inject(InventoryService);
  private stockReportService = inject(StockReportService);
  private dialog = inject(MatDialog);
  private dateTime = new Date();
  private snackBar = inject(MatSnackBar);

  /**
   * Helper method that formats a Date object into a string format of MM-DD-YYYY_HH:MM(AM/PM)
   * @param date A Date object to format into a string
   * @returns An array of two strings.
   * The first (0): The formatted date string in format MM-DD-YYYY HH:MM (AM/PM) for use in the file descriptions.
   * The second (1): The formatted date string in format MM-DD-YYYY_HH_MM(AM/PM) for use in the file names
   */
  formatDateTime(date: Date): string[] {
    let minute = date.getMinutes().toString();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // Months are zero-indexed
    const year = date.getFullYear();
    const formattedStrings: string[] = [];

    if (minute.length < 2) {
      // Add leading zero to minutes if less than 10 for better formatting
      minute = `0${minute}`;
    }
    // Format the date and time as MM-DD-YYYY_HH:MM(AM/PM)
    if (hour > 12) { // PM hours
      formattedStrings.push(`${month}-${day}-${year} ${hour-12}:${minute} PM`); // Format for inside file
      formattedStrings.push(`${month}-${day}-${year}_${hour-12}-${minute}_PM`); // Format for file name
      return formattedStrings;
    } else if (hour < 12 && hour > 0) { // AM hours
      formattedStrings.push(`${month}-${day}-${year} ${hour}:${minute} AM`); // Format for inside file
      formattedStrings.push(`${month}-${day}-${year}_${hour}-${minute}_AM`); // Format for file name
      return formattedStrings;
    } else if (hour === 12) { // Noon
      formattedStrings.push(`${month}-${day}-${year} ${hour}:${minute} PM`); // Format for inside file
      formattedStrings.push(`${month}-${day}-${year}_${hour}-${minute}_PM`); // Format for file name
      return formattedStrings;
    } else { // Just assume midnight if its not anything else
      formattedStrings.push(`${month}-${day}-${year} 12:${minute} AM`); // Format for inside file
      formattedStrings.push(`${month}-${day}-${year}_12-${minute}_AM`); // Format for file name
      return formattedStrings;
    }
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
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  outOfStockItems = computed(() => {
    return this.inventory()
      ?.filter(item => item.stockState === 'Out of Stock')
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  overstockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => item.stockState === 'Over-Stocked')
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  understockedItems = computed(() => {
    return this.inventory()
      ?.filter(item => item.stockState === 'Under-Stocked')
      .map(item => [item.description, item.quantity, item.maxQuantity, item.minQuantity, item.notes === "N/A" ? "" : item.notes]) ?? [];
  });

  /**
   * Generates a PDF report of the inventory, grouped by Stock State. Each group has its own table with item description, quantity, max quantity, and min quantity.
   * The PDF is saved with the name "StockReport_MM-DD-YYYY.pdf", using formatDateTime to get the formatted date. The PDF also includes a title and description with the date.
   * @param savePdf boolean indicating whether to save PDF to server (true) or download to client machine (false)
  */
  generatePDF(savePdf: boolean) {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    // Title
    doc.setFontSize(16);
    doc.text("Stock Report", 10, 10);
    // Description
    doc.setFontSize(12);
    doc.text("This is a Stock Report of the inventory on ${formattedDate}".replace("${formattedDate}", this.formatDateTime(this.dateTime)[0]), 10, 20);

    // Table Constants
    const headers = [["Item Description", "Quantity", "Max Quantity", "Min Quantity", "Notes"]];
    const tableSpace = 10; // 10mm of space
    const titleSpace = 1; // 5mm of space
    const itemSpace = 80; // Item column width
    const quantitySpace = 20; // Quantity/Max/Min column width
    const columnStyling = {
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
    };

    // Stocked Table
    const startY1 = 30; // Starting Y position for the first table

    doc.setFontSize(12);
    doc.text("Stocked Items", 15, 30);
    autoTable(doc, {
      head: headers,
      body: this.stockedItems(),
      startY: startY1+titleSpace,
      theme: 'striped',
      columnStyles: columnStyling
    });

    // Calculate the startY for the second table
    // doc.lastAutoTable.finalY holds the Y-coordinate of the last drawn point of the table
    const startY2 = (doc.lastAutoTable?.finalY) + tableSpace;

    // Out of Stock Table
    doc.setFontSize(12);
    doc.text("Out of Stock Items", 15, startY2);
    autoTable(doc, {
      head: headers,
      body: this.outOfStockItems(),
      startY: startY2+titleSpace,
      theme: 'striped',
      columnStyles: columnStyling
    });

    const startY3 = (doc.lastAutoTable?.finalY) + tableSpace;

    // Overstocked Table
    doc.setFontSize(12);
    doc.text("Overstocked Items", 15, startY3);
    autoTable(doc, {
      head: headers,
      body: this.overstockedItems(),
      startY: startY3+titleSpace,
      theme: 'striped',
      columnStyles: columnStyling
    });

    const startY4 = (doc.lastAutoTable?.finalY) + tableSpace;

    // Understocked Table
    doc.setFontSize(12);
    doc.text("Understocked Items", 15, startY4);
    autoTable(doc, {
      head: headers,
      body: this.understockedItems(),
      startY: startY4+titleSpace,
      theme: 'striped',
      columnStyles: columnStyling
    });

    // Save PDF with name to client
    const filename = `StockReport_${this.formatDateTime(this.dateTime)[1]}.pdf`;

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
            `Generating and saving report as PDF file to server...`,
            `Okay`,
            { duration: 2000 }
          );
        },
        error: (error) => {
          console.error("Error saving PDF report to server:", error);
          this.snackBar.open(
            `Error generating / saving report as PDF file. Please try again.`,
            `Okay`,
            { duration: 2000 }
          );
        }
      });
    } else {
      // Save to client machine
      doc.save(filename);
      this.snackBar.open(
        `Generating and downloading report as PDF file...`,
        `Okay`,
        { duration: 2000 }
      );
    }
  }

  /**
   * Generate an XLSX report of the inventory, grouped by Stock State.
   * Server handles all generation, this is just for calling the service method and handling the response.
   * @param saveXlsx boolean indicating whether to save XLSX to server (true) or download to client machine (false)
   */
  generateXlsx(saveXlsx: boolean) {
    if (saveXlsx) {
      // Save to server
      this.stockReportService.generateNewXlsxReport().subscribe({
        next: (response) => {
          console.log("XLSX report generated and saved to server with ID:", response);
          this.stockReportService.refreshReports().subscribe();
          this.snackBar.open(
            `Generating and saving report as XLSX file to server...`,
            `Okay`,
            { duration: 2000 }
          );
        },
        error: (error) => {
          console.error("Error generating/saving XLSX report to server:", error);
          this.snackBar.open(
            `Error generating/saving report as XLSX file. Please try again.`,
            `Okay`,
            { duration: 2000 }
          );
        }
      });
    } else {
      // Download to client machine
      this.stockReportService.generateAndDownloadXlsxReport().subscribe({
        next: (blob) => {
          const fileName = `Stock_Report_${this.formatDateTime(this.dateTime)[1]}.xlsx`;
          const a = document.createElement('a');
          a.href = window.URL.createObjectURL(blob);
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(a.href);
          this.snackBar.open(
            `Generating and downloading report as XLSX file...`,
            `Okay`,
            { duration: 2000 }
          );
        },
        error: (error) => {
          console.error("Error generating XLSX report:", error);
          this.snackBar.open(
            `Error generating report as XLSX file. Please try again.`,
            `Okay`,
            { duration: 2000 }
          );
        }
      });
    }
  }

  // Helper method for generating and downloading report as PDF to client
  downloadNewPdfReport() {
    this.generatePDF(false);
  }

  // Helper method for generating and saving report as PDF to server
  savePdfReport() {
    this.generatePDF(true);
  }

  // Helper method for generating and downloading report as XLSX to client
  downloadNewXlsxReport() {
    this.generateXlsx(false);
  }

  // Helper method for generating and saving report as XLSX to server
  saveXlsxReport() {
    this.generateXlsx(true);
  }

  /**
   * Delete a single report from the server. The actual logic is handled in the service.
   * @param report Report to delete from the server
   */
  deleteSingleReport(report: StockReport) {
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
   * Download a single report from the server.
   * @param report The report to download
   */
  downloadSingleReport(report: StockReport) {
    const fileName = `Stock_Report_${this.formatDateTime(this.dateTime)[1]}.xlsx`;
    this.stockReportService.downloadSingleReportBlob(report).subscribe({
      next: (blob) => {
        // Create object URL and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
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
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        if (format === 'PDF') {
          a.download = `StockReports_PDF_${this.formatDateTime(this.dateTime)[1]}.zip`;
        } else if (format === 'XLSX') {
          a.download = `StockReports_XLSX_${this.formatDateTime(this.dateTime)[1]}.zip`;
        } else if (format === 'All') {
          a.download = `StockReports_${this.formatDateTime(this.dateTime)[1]}.zip`;
        } else {
          a.download = `StockReports_UnknownTypes_${this.formatDateTime(this.dateTime)[1]}.zip`;
        }
        a.click();
        URL.revokeObjectURL(url);

        // Show success message
        this.snackBar.open(
          `Downloaded all ${format} report(s) as ZIP file.`,
          `Okay`,
          { duration: 2000 }
        );
      },
      error: (error) => {
        console.error("Error downloading ZIP of report(s). ", error);
        this.snackBar.open(
          `Failed to download ${format} report(s) as ZIP. Please try again.`,
          `Okay`,
          { duration: 2000 }
        );
      }
    });
  }
}
