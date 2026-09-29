export type FilterField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select'
}

export type FilterValue = string | number | boolean;

export type FilterContent = Record<string, FilterValue | undefined>;

// domain specific filter contracts. Add more filter structures here for code re-usability
export type InventoryFilters = {
  item?: string;
  brand?: string;
  color?: string;
  size?: string;
  type?: string;
  material?: string;
  description?: string;
  quantity?: number;
  notes?: string;
};

