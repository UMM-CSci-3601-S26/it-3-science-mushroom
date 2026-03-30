export interface Inventory {
  item: string,
  description: string,
  brand: string,
  color:string,
  size: string,
  type: string,
  material:string,
  count: number,
  quantity: number,
  notes: string
}

export interface SelectOption {
  label: string;
  value: string;
}
