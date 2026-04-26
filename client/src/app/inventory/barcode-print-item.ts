import { Inventory } from './inventory';

export interface PrintableBarcodeItem {
  item: Inventory;
  barcode: string;
  barcodeImage: string;
}
