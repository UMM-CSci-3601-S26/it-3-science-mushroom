import { Inventory } from '../inventory';

export interface PrintableBarcodeItem {
  item: Inventory;
  barcode: string;
  barcodeImage: string;
  quantity: number;
}

export interface BarcodePrintQuantitySelection {
  item: Inventory;
  quantity: number;
}
