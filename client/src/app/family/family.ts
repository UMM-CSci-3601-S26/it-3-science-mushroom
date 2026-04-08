export interface StudentInfo {
  name: string;
  grade: string;
  school: string;
  teacher: string;
}

export interface Family {
  _id?: string;
  guardianName: string;
  email: string;
  address: string;
  timeSlot: string;
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
