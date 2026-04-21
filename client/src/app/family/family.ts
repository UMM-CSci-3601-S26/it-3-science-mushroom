export interface StudentInfo {
  name: string;
  grade: string;
  school: string;
  schoolAbbreviation: string;
  teacher: string;
  headphones: boolean;
  backpack: boolean;
}

export interface AvailabilityOptions {
  earlyMorning: boolean;
  lateMorning: boolean;
  earlyAfternoon: boolean;
  lateAfternoon: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  selected: boolean;
  available: boolean;
  itemDescription?: string;
  supplyListId?: string;
  matchedInventoryId?: string;
  matchedInventoryItem?: string;
  matchedInventoryDescription?: string;
  requestedQuantity: number;
  notPickedUpReason?: string;
  substituteItem?: string;
  substituteBarcode?: string;
  substituteDescription?: string;
  substituteInventoryId?: string;
  notes?: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  printableTitle: string;
  saved: boolean;
  items: ChecklistItem[];
}

export interface FamilyChecklist {
  templateId: string;
  printableTitle: string;
  snapshot: boolean;
  sections: ChecklistSection[];
}

export interface Family {
  _id?: string;
  guardianName: string;
  email: string;
  address: string;
  timeSlot: string;
<<<<<<< 14-point-of-sale-frontend
  helped?: boolean;
  status?: string;
  checklist?: FamilyChecklist | null;
=======
  timeAvailability: AvailabilityOptions;
>>>>>>> main
  students: StudentInfo[];
}

export interface DashboardStats {
  studentsPerSchool: { [school: string]: number};
  studentsPerGrade: { [grade: string]: number};
  totalFamilies: number;
  totalStudents: number;
}

export interface SelectOption {
  label: string;
  value: string;
}
