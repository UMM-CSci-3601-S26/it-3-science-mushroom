// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, computed, signal  } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

// JS Imports
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

  private gradeOrder = ['PreK', 'Kindergarten', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  private formatGrade(grade: string): string {
    return (grade === 'PreK' || grade === 'Kindergarten') ? grade : `Grade ${grade}`;
  }

  private formatGradesListLeft(gradesData: Record<string, number>): string {
    const entries = Object.entries(gradesData)
      .sort(([gradeA], [gradeB]) => {
        const indexA = this.gradeOrder.indexOf(gradeA);
        const indexB = this.gradeOrder.indexOf(gradeB);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
    const midpoint = Math.ceil(entries.length / 2);
    return entries.slice(0, midpoint)
      .map(([grade, count]) => `  • ${this.formatGrade(grade)}: ${count}`)
      .join('\n');
  }

  private formatGradesListRight(gradesData: Record<string, number>): string {
    const entries = Object.entries(gradesData)
      .sort(([gradeA], [gradeB]) => {
        const indexA = this.gradeOrder.indexOf(gradeA);
        const indexB = this.gradeOrder.indexOf(gradeB);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
    const midpoint = Math.ceil(entries.length / 2);
    return entries.slice(midpoint)
      .map(([grade, count]) => `  • ${this.formatGrade(grade)}: ${count}`)
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

      // School Stats box
      const schoolLines = studentsPerSchool.split('\n').length;
      const schoolLineHeight = 5;
      const schoolBoxHeight = (schoolLines * schoolLineHeight) + 7; // content + bottom padding
      doc.setDrawColor(0);
      doc.roundedRect(65, 40, 70, schoolBoxHeight, 3, 3);

      // School Stats List
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Students Per School", 75, 50);

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(studentsPerSchool, 65, 55);

      // Grade Stats box
      doc.setDrawColor(0);
      doc.roundedRect(140, 40, 60, 45, 3, 3);

      // Grade Stats List
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Students Per Grade", 145, 50);

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(gradesLeft, 140, 55);
      doc.text(gradesRight, 170, 55);

      // Individual Family Pages \\

      this.family().forEach((family, index) => {
        if (index >= 0 && index % 2 === 0) {
          doc.addPage(); // Add new page every 2 families
        }

        // Vars for all boxes
        const boxWidth = 60;
        const boxX = 10;
        const boxY = 30;
        const labelOffsetX = 5;
        const labelOffsetY = 7;

        const availability = `
    • Early Morning: ${family.timeAvailability.earlyMorning ? 'Yes' : 'No'}
    • Late Morning: ${family.timeAvailability.lateMorning ? 'Yes' : 'No'}
    • Early Afternoon: ${family.timeAvailability.earlyAfternoon ? 'Yes' : 'No'}
    • Late Afternoon: ${family.timeAvailability.lateAfternoon ? 'Yes' : 'No'}`;

        // Family title
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text(family.guardianName, 10, 20);
        doc.setFont(undefined, "normal");

        // Separator Line
        doc.setLineWidth(1);
        doc.line(10, 25, 200, 25);

        // Family Contact Details \\

        // Layout vars
        doc.setFontSize(10);
        const detailsBoxWidth = boxX + boxWidth; // Width of details box, next box is offset from this
        const boxHeight = 30;

        const textMarginX = boxX + 5;
        const lineHeight = 5;

        // For emails and addresses, shrink font size if needed
        const detailsMaxWidth = boxWidth - 10; // Max width for text in box
        const emailFontSize = doc.getTextWidth(family.email) > detailsMaxWidth ? 7 : 10;
        const addressFontSize = doc.getTextWidth(family.address) > detailsMaxWidth ? 7 : 10;

        // Contact details box
        doc.setDrawColor(0);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3);

        // Family contact details
        let currentDetailsY = boxY + labelOffsetY;

        // Email label and content (shrunk if necessary)
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(`Email:`, textMarginX, currentDetailsY);
        currentDetailsY += lineHeight;
        doc.setFontSize(emailFontSize);
        doc.setFont(undefined, "normal");
        doc.text(family.email, textMarginX, currentDetailsY);
        currentDetailsY += lineHeight + 2;

        // Address label and content (shrunk if necessary)
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(`Address:`, textMarginX, currentDetailsY);
        currentDetailsY += lineHeight;
        doc.setFontSize(addressFontSize);
        doc.setFont(undefined, "normal");
        doc.text(family.address, textMarginX, currentDetailsY);

        // Accomodations \\

        // Layout vars
        const accomBoxX = detailsBoxWidth + 5; // Offset from details box
        const accomBoxWidth = accomBoxX + boxWidth; // Width of accommodations box, next box is offset from this
        const accomMaxWidth = boxWidth - 10; // Max width for text in box
        const accomBoxHeight = 10; // Minimum height, will expand if text is long

        // Accommodations label
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(`Accommodations:`, accomBoxX + labelOffsetX, boxY + labelOffsetY);

        // Accomodations text (wrapped if necessary)
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.splitTextToSize(family.accommodations || 'None', accomMaxWidth).forEach((line, index) => {
          doc.text(line, accomBoxX + labelOffsetX, boxY + labelOffsetY + lineHeight + (index * lineHeight));
        });

        // Accomodations box
        const accomDynamicHeight = Math.max(accomBoxHeight, 10 + (doc.splitTextToSize(family.accommodations || 'None', accomMaxWidth).length * lineHeight));
        doc.setDrawColor(0);
        doc.roundedRect(accomBoxX, boxY, boxWidth, accomDynamicHeight, 3, 3);

        // Time Slot and Availability \\

        // Layout vars
        const availBoxX = accomBoxWidth + 5;
        const availBoxHeight = 35;

        // Time slot label and content
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(`Time Slot: `, availBoxX + labelOffsetX, boxY + labelOffsetY);
        doc.setFont(undefined, "normal");
        doc.text(` ${family.timeSlot}`, availBoxX + labelOffsetX + doc.getTextWidth(`Time Slot: `), boxY + labelOffsetY);

        // Time availability label
        doc.text(`Time Availability:`, availBoxX + labelOffsetX, boxY + labelOffsetY + lineHeight);

        // Time availability content
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        availability.split('\n').forEach((line, index) => {
          doc.text(line, availBoxX + labelOffsetX, boxY + labelOffsetY + lineHeight + (index * lineHeight));
        });

        // Time availability box
        doc.setDrawColor(0);
        doc.roundedRect(availBoxX, boxY, boxWidth, availBoxHeight, 3, 3);


        // Students Table \\

        // Layout vars
        const tableY = boxY + Math.max(boxHeight, accomDynamicHeight, availBoxHeight) + 10; // Offset from bottom of tallest box + some padding
        const tableX = 5;

        // Table header
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Students", tableX + labelOffsetX, tableY);
        const headers = [["Name", "School", "Grade", "Headphones", "Backpack"]];

        // Table body
        const columnStyling = {
          0: { cellWidth: 50 },
          1: { cellWidth: 50 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 }
        };

        autoTable(doc, {
          head: headers,
          body: family.students.map(student => [
            student.name,
            student.school,
            student.grade,
            student.headphones ? "Yes" : "No",
            student.backpack ? "Yes" : "No"
          ]),
          startY: tableY + lineHeight,
          theme: 'striped',
          columnStyles: columnStyling
        });
      });

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
