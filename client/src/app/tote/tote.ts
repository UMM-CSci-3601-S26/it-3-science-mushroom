export interface ToteEntry {
  internalID: string;
  quantity: number;
}

export interface Tote {
  toteBarcode: string;
  name?: string;
  contents: ToteEntry[];
  notes?: string;
}

export interface ToteEntryView extends ToteEntry {
  internalID: string;
  quantity: number;
  item?: string;
  brand?: string;
  color?: string;
  size?: string;
  type?: string;
  material?: string;
  description?: string;
}

export interface ToteQuantityChangeRequest {
  internalID: string;
  quantity: number;
}

export interface MoveToteItemRequest {
  formToteBarcode: string;
  toToteBarcode: string;
  internalID: string;
  quantity: number;
}
