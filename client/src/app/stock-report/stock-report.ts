/**
 * StockReport interface defines the structure of every Stock Report.
 */
export interface StockReport {
  _id?: string;
  reportName: string;
  reportType: 'PDF' | 'CSV';
}
