export interface AttributeOptions {
  allOf: string;
  anyOf: string[];
}

export interface ColorAttributeOptions {
  allOf: string[];
  anyOf: string[];
}

export const GRADES: string[] = [
  'PreK', 'K', '1', '2', '3', '4', '5',
  '6', '7', '8', '9', '10', '11', '12',
  'High School'
];

export interface SupplyList {
  _id: string;
  academicYear: string;
  school: string;
  grade: string;
  teacher: string;
  item: string[];
  brand: AttributeOptions;
  type: AttributeOptions;
  color: ColorAttributeOptions;
  size: AttributeOptions;
  material: AttributeOptions;
  count: number;
  quantity: number;
  notes: string;
}
