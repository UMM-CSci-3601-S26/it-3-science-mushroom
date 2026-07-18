// student information interface
export interface StudentInfo {
  name: string;
  grade: string;
  school: string;
  schoolAbbreviation: string;
  teacher: string;
  headphones: boolean;
  backpack: boolean;
}

// family information interface, apart of the general family information
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

export type ScheduleColumnType = 'English' | 'Spanish';

export interface ScheduleAssignment {
  timeSlot: string;
  columnType: ScheduleColumnType;
  columnIndex: number;
}

// main family interface, which includes general family information and an array of students in the family
export interface Family {
  _id?: string;
  ownerUserId?: string;
  profileComplete?: boolean;
  guardianName: string;
  email: string;
  address: string;
  accommodations: string;
  needSpanishHelp: boolean;
  timeSlot: string;
  scheduleAssignment?: ScheduleAssignment;
  timeAvailability?: AvailabilityOptions;
  helped?: boolean;
  status?: string;
  checklist?: FamilyChecklist | null;
  students: StudentInfo[];
  deleteRequest?: FamilyDeleteRequest;
}

export interface FamilyDeleteRequest {
  requested: boolean;
  message?: string;
  requestedByUserId?: string;
  requestedByUserName?: string;
  requestedBySystemRole?: string;
  requestedAt?: string;
}

// dashboard statistics interface
export interface DashboardStats {
  studentsPerSchool: { [school: string]: number};
  studentsPerGrade: { [grade: string]: number};
  totalFamilies: number;
  totalStudents: number;
}

// select option interface for dropdown filters
export interface SelectOption {
  label: string;
  value: string;
}
