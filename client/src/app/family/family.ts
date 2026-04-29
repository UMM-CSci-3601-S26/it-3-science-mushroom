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

export interface Family {
  _id?: string;
  ownerUserId?: string;
  profileComplete?: boolean;
  guardianName: string;
  email: string;
  address: string;
  accommodations: string;
  timeSlot: string;
  timeAvailability: AvailabilityOptions;
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
