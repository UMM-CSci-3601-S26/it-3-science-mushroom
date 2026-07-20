export interface AttributeOptions {
  exactly: string;
  anyOf: string[];
}

export const GRADES: string[] = [
  'PreK', 'Kindergarten', '1', '2', '3', '4', '5',
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
  color: AttributeOptions;
  size: AttributeOptions;
  material: AttributeOptions;
  packageSize: number;
  quantity: number;
  notes: string;
  supplyID: string;
  invIDs: string[];
  percentageFilled: number;
}
