export interface FamilyChecklist {
  templateId?: string;
  printableTitle?: string;
  snapshot?: boolean;
  sections?: ChecklistSection[];
}

export interface ChecklistSection {
  id?: string;
  title?: string;
  printableTitle?: string;
  saved?: boolean;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id?: string;
  label?: string;
  selected?: boolean;
  available?: boolean;
  itemDescription?: string;
  supplyListId?: string;
  matchedInventoryId?: string;
  requestedQuantity?: number;
  notPickedUpReason?: string;
  substituteItem?: string;
  substituteBarcode?: string;
  substituteDescription?: string;
  substituteInventoryId?: string;
  notes?: string;
}
