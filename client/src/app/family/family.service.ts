// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, computed, signal  } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

// JS Imports
import { jsPDF } from "jspdf";
//import autoTable from "jspdf-autotable";

// RxJS Imports
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Family Imports
import { environment } from '../../environments/environment';
import { Family, DashboardStats, SelectOption } from './family';
import { FormatDateTimeService } from '../format-date-time/format-date-time.service';

// // Type for jsPDF with autoTable metadata
// interface jsPDFWithAutoTable extends jsPDFClass {
//   lastAutoTable?: {
//     finalY: number;
//   };
// }

@Injectable({
  providedIn: 'root'
})

export class FamilyService {
  private httpClient = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private formatDateTimeService = inject(FormatDateTimeService);
  private dateTime = new Date();

  readonly familyUrl: string = `${environment.apiUrl}family`;
  readonly dashboardUrl: string = `${environment.apiUrl}dashboard`;

  private readonly familyKey = 'guardianName';

  constructor() {
    this.loadFamilies();
  }

  family = signal<Family[]>([]);

  loadFamilies(filters?: Family): void {
    this.getFamilies(filters).subscribe(data => {
      this.family.set(data);
    })
  }

  familyOptions = computed(() =>
    this.optionBuilder(this.family(), 'guardianName')
  );

  getFamilies(filters?: { guardianName?: string }): Observable<Family[]> {
    let httpParams: HttpParams = new HttpParams();

    if (filters) {
      if (filters.guardianName) {
        httpParams = httpParams.set(this.familyKey, filters.guardianName);
      }
    }

    return this.httpClient.get<Family[]>(this.familyUrl, {
      params: httpParams,
    });
  }

  getFamilyById(id: string): Observable<Family> {
    return this.httpClient.get<Family>(`${this.familyUrl}/${id}`);
  }

  addFamily(newFamily: Partial<Family>): Observable<string> {
    return new Observable(observer => {
      this.httpClient.post<{id: string}>(this.familyUrl, newFamily).pipe(map(response => response.id)).subscribe({
        next: (result) => {
          this.loadFamilies();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  updateFamily(id: string, updatedFamily: Partial<Family>): Observable<string> {
    return new Observable(observer => {
      this.httpClient.put<{id: string}>(`${this.familyUrl}/${id}`, updatedFamily).pipe(map(response => response.id)).subscribe({
        next: (result) => {
          this.loadFamilies();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  deleteFamily(id: string): Observable<void> {
    return new Observable(observer => {
      this.httpClient.delete<void>(`${this.familyUrl}/${id}`).subscribe({
        next: (result) => {
          this.loadFamilies();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  getDashboardStats(): Observable<DashboardStats> {
    const httpParams: HttpParams = new HttpParams();
    return this.httpClient.get<DashboardStats>(this.dashboardUrl, {
      params: httpParams,
    });
  }

  exportFamilies(): Observable<string> {
    return this.httpClient.get(`${this.familyUrl}/export`, {
      responseType: 'text'
    });
  }

  optionBuilder(data: Family[], key: keyof Family): SelectOption[] {
    return [...new Set(
      data.map(item => item[key]).filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    )].map(value => ({
      label: value,
      value: value
    }));
  }

  private formatSchoolsList(schoolsData: Record<string, number>): string {
    return Object.entries(schoolsData)
      .map(([school, count]) => `  • ${school}: ${count}`)
      .join('\n');
  }

  private formatGradesListLeft(gradesData: Record<string, number>): string {
    const entries = Object.entries(gradesData);
    const midpoint = Math.ceil(entries.length / 2);
    return entries.slice(0, midpoint)
      .map(([grade, count]) => `  • Grade ${grade}: ${count}`)
      .join('\n');
  }

  private formatGradesListRight(gradesData: Record<string, number>): string {
    const entries = Object.entries(gradesData);
    const midpoint = Math.ceil(entries.length / 2);
    return entries.slice(midpoint)
      .map(([grade, count]) => `  • Grade ${grade}: ${count}`)
      .join('\n');
  }

  /**
     * Generates a PDF report of all the families. First page has a description and title with the date it was generated.
     * Family dashboard info (number of families, students per school, etc) is also placed on the first page.
     * The pages after hold family info in a list + table format. Each family gets its own page.
     * The list has entries for the guardian name, email, address, accommodations, time slot, time availability
     * The table has has entries for each student, with columns for name, school, grade, and item requests.
     * The PDF is saved with the name "FamilyReport_MM-DD-YYYY.pdf", using formatDateTime to get the formatted date.
     */
  generatePDF() {
    const doc = new jsPDF();
    // Title
    doc.setFontSize(16);
    doc.text("Family Report", 10, 10);
    // Description
    doc.setFontSize(12);
    doc.text("This is a report of the families generated on ${formattedDate}".replace("${formattedDate}", this.formatDateTimeService.formatDateTime(this.dateTime)[0]), 10, 20);

    // Separator Line
    doc.setLineWidth(1);
    doc.line(10, 30, 200, 30);

    // Dashboard stats
    this.getDashboardStats().subscribe(stats => {
      //       const statsText = `Total Families: ${stats.totalFamilies}
      // Total Students: ${stats.totalStudents}
      // Students Per School:
      // ${this.formatSchoolsList(stats.studentsPerSchool)}
      // Students Per Grade:
      // ${this.formatGradesList(stats.studentsPerGrade)}`;


      const totalFamilies = `${stats.totalFamilies}`;
      const totalStudents = `${stats.totalStudents}`;
      const studentsPerSchool = `${this.formatSchoolsList(stats.studentsPerSchool)}`;
      const gradesLeft = `${this.formatGradesListLeft(stats.studentsPerGrade)}`;
      const gradesRight = `${this.formatGradesListRight(stats.studentsPerGrade)}`;

      // doc.setFontSize(10);
      // doc.text(statsText, 10, 30);

      // Box around family and student stats
      doc.setDrawColor(0);
      doc.roundedRect(10, 40, 50, 45, 3, 3);

      // Family Dashboard Stats
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Total Families", 15, 50);
      doc.setFont(undefined, "normal");
      doc.text(totalFamilies, 30, 60);

      // Student Dashboard Stats
      doc.setFont(undefined, "bold");
      doc.text("Total Students", 15, 70);
      doc.setFont(undefined, "normal");
      doc.text(totalStudents, 30, 80);

      // Box around school stats
      doc.setDrawColor(0);
      doc.roundedRect(65, 40, 70, 45, 3, 3);

      // School Stats List
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Students Per School", 70, 50);
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(studentsPerSchool, 70, 55);

      // Box around grade stats
      doc.setDrawColor(0);
      doc.roundedRect(140, 40, 60, 45, 3, 3);

      // Grade Stats List
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Students Per Grade", 145, 50);
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(gradesLeft, 145, 55);
      doc.text(gradesRight, 170, 55);

      // PDF name
      const fileName = `FamilyReport_${this.formatDateTimeService.formatDateTime(this.dateTime)[1]}.pdf`;

      // Save to client machine
      doc.save(fileName);
      this.snackBar.open(
        `Generating and downloading report as PDF file...`,
        `Okay`,
        { duration: 2000 }
      );
    });
  }
}
