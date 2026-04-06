/**
 * StockReport interface defines the structure of every Stock Report.
 */
export interface StockReport {
  _id?: string;
  stockReportPDF?: string;
  stockReportCSV?: string;
  reportName: string;
}
