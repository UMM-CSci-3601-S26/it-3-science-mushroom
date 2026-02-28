export interface Inventory {
  _id?: string;
  school: string;
  grade: string;
  item?: string;
  description: string;
  quantity: number;
  properties?: string[];
}
