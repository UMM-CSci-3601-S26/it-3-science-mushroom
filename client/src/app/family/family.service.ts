// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, computed, signal  } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

// JS Imports
import jsPDF, { jsPDF as jsPDFClass } from "jspdf";
import autoTable from "jspdf-autotable";

// RxJS Imports
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Other Imports
import { environment } from '../../environments/environment';
import { Family, DashboardStats, SelectOption } from './family';
import { FormatDateTimeService } from '../format-date-time/format-date-time.service';

// Type for jsPDF with autoTable metadata
interface jsPDFWithAutoTable extends jsPDFClass {
  lastAutoTable?: {
    finalY: number;
  };
}

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

  // Splits grades list into two columns, left having first half and right having second half
  // Sorted by gradeOrder and formatted with formatGrade
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
   * Custom helper function to add text with specified styling
   */
  private addText(doc: jsPDF, text: string, x: number, y: number, size: number, weight: string, font: string): void {
    doc.setFont(undefined, weight);
    doc.setFontSize(size);
    doc.text(text, x, y);
    doc.setFont(undefined, font);
  }

  /**
   * Helper method to render a given family's info on the PDF
   * @param offset the y offset from top of page to start rendering the family at
   */
  private renderFamily(doc: jsPDFWithAutoTable, family: Family, offset: number): number {
    const thinLineWidth = 0.5;
    const thickLineWidth = 1;

    // Family title
    const titleY = offset;
    this.addText(doc, family.guardianName, 10, titleY, 14, "bold", "normal");
    const titleHeight = doc.getTextDimensions(family.guardianName).h;

    // Separator Line
    doc.setLineWidth(thickLineWidth);
    doc.line(10, titleHeight + titleY, 200, titleHeight + titleY);
    doc.setLineWidth(thinLineWidth);

    // Vars for all boxes
    const boxWidth = 60;
    const boxX = 10;
    const boxY = titleY + titleHeight + 5;
    const labelOffsetX = 5;
    const labelOffsetY = 7;

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
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3);

    // Family contact details
    let currentDetailsY = boxY + labelOffsetY;

    // Email label and content (shrunk if necessary)
    this.addText(doc, `Email:`, textMarginX, currentDetailsY, 10, "bold", "normal");
    currentDetailsY += lineHeight;

    this.addText(doc, family.email, textMarginX, currentDetailsY, emailFontSize, "normal", "normal");
    currentDetailsY += lineHeight + 2;

    // Address label and content (shrunk if necessary)
    this.addText(doc, "Address:", textMarginX, currentDetailsY, 10, "bold", "normal");
    currentDetailsY += lineHeight;

    this.addText(doc, family.address, textMarginX, currentDetailsY, addressFontSize, "normal", "normal");

    // Accomodations \\

    // Layout vars
    const accomBoxX = detailsBoxWidth + 5; // Offset from details box
    const accomBoxWidth = accomBoxX + boxWidth; // Width of accommodations box, next box is offset from this
    const accomMaxWidth = boxWidth - 10; // Max width for text in box
    const accomBoxHeight = 10; // Minimum height, will expand if text is long

    // Accommodations label
    this.addText(doc, "Accommodations:", accomBoxX + labelOffsetX, boxY + labelOffsetY, 12, "bold", "normal");

    // Accomodations text (wrapped if necessary)
    doc.splitTextToSize(family.accommodations || 'None', accomMaxWidth).forEach((line: string, index: number) => {
      this.addText(doc, line, accomBoxX + labelOffsetX, boxY + labelOffsetY + lineHeight + (index * lineHeight), 10, "normal", "normal");
    });

    // Accomodations box
    const accomDynamicHeight = Math.max(accomBoxHeight, 10 + (doc.splitTextToSize(family.accommodations || 'None', accomMaxWidth).length * lineHeight));
    doc.roundedRect(accomBoxX, boxY, boxWidth, accomDynamicHeight, 3, 3);

    // Time Slot and Availability \\

    // Layout vars
    const availBoxX = accomBoxWidth + 5;
    const availBoxHeight = 35;

    // Time slot label and content
    this.addText(doc, "Time Slot: ", availBoxX + labelOffsetX, boxY + labelOffsetY, 10, "bold", "normal");
    this.addText(doc, ` ${family.timeSlot}`, availBoxX + labelOffsetX + doc.getTextWidth(`Time Slot: `), boxY + labelOffsetY, 10, "normal", "normal");

    // Time availability label
    this.addText(doc, "Time Availability:", availBoxX + labelOffsetX, boxY + labelOffsetY + lineHeight, 10, "bold", "normal");

    // Time availability content
    const availability = `
    • Early Morning: ${family.timeAvailability.earlyMorning ? 'Yes' : 'No'}
    • Late Morning: ${family.timeAvailability.lateMorning ? 'Yes' : 'No'}
    • Early Afternoon: ${family.timeAvailability.earlyAfternoon ? 'Yes' : 'No'}
    • Late Afternoon: ${family.timeAvailability.lateAfternoon ? 'Yes' : 'No'}`;

    availability.split('\n').forEach((line, index) => {
      this.addText(doc, line, availBoxX + labelOffsetX, boxY + labelOffsetY + lineHeight + (index * lineHeight), 10, "normal", "normal");
    });

    // Time availability box
    doc.roundedRect(availBoxX, boxY, boxWidth, availBoxHeight, 3, 3);

    // Students Table \\

    // Layout vars
    const tableY = boxY + Math.max(boxHeight, accomDynamicHeight, availBoxHeight) + 10; // Offset from bottom of tallest box + some padding
    const tableX = 5;

    // Table header
    this.addText(doc, "Students", tableX + labelOffsetX, tableY, 12, "bold", "normal");

    const headers = [["Name", "School", "Grade", "Teacher", "Headphones", "Backpack"]];

    // Table body
    const columnStyling = {
      0: { cellWidth: 40 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 }
    };

    autoTable(doc, {
      head: headers,
      body: family.students.map(student => [
        student.name,
        student.school,
        student.grade,
        student.teacher,
        student.headphones ? "Yes" : "No",
        student.backpack ? "Yes" : "No"
      ]),
      startY: tableY + lineHeight,
      theme: 'striped',
      columnStyles: columnStyling,
      margin: { left: 10 }
    });

    // Student Table box
    // const tableHeight = (family.students.length + 1) * 10; // Approximate height based on number of rows
    // doc.roundedRect(boxX, tableY + 1, 190, tableHeight + 5, 3, 3);

    // Return bottom Y of rendered family
    return doc.lastAutoTable.finalY + 10; // Add some padding after table
  }

  /**
     * Generates a PDF report of all the families.
     * Page 1: Dashboard stats (total families, total students, students per school, students per grade)
     * Subsequent pages: Each family's details and students, with page breaks as needed. Attempts to fit as many families per page as possible
     */
  generatePDF() {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const thinLineWidth = 0.5;
    const thickLineWidth = 1;

    // Title
    this.addText(doc, "Family Report", 10, 10, 16, "bold", "normal");
    // Description
    this.addText(doc, "This is a report of the families generated on ${formattedDate}"
      .replace("${formattedDate}",
        this.formatDateTimeService.formatDateTime(this.dateTime)[0]), 10, 20, 12, "normal", "normal");

    // Separator Line
    doc.setLineWidth(thickLineWidth);
    doc.line(10, 30, 200, 30);
    doc.setLineWidth(thinLineWidth);

    // Dashboard stats
    this.getDashboardStats().subscribe(stats => {
      // Box vars
      const boxX = 10; // Starting x, following boxes offset from this
      const boxY = 40;
      const boxWidth = 50;
      const boxOffset = 5; // Offset for subsequent boxes
      const labelOffsetX = 5;
      const labelOffsetY = 7;

      const totalFamilies = `${stats.totalFamilies}`;
      const totalStudents = `${stats.totalStudents}`;
      const studentsPerSchool = `${this.formatSchoolsList(stats.studentsPerSchool)}`;
      const gradesLeft = `${this.formatGradesListLeft(stats.studentsPerGrade)}`;
      const gradesRight = `${this.formatGradesListRight(stats.studentsPerGrade)}`;

      // Box around family and student stats
      doc.roundedRect(boxX, boxY, boxWidth, 40, 3, 3);

      // Family Dashboard Stats
      this.addText(doc, "Total Families", boxX + labelOffsetX + 2, boxY + labelOffsetY, 14, "bold", "normal");
      this.addText(doc, totalFamilies, boxX + labelOffsetX + 15, boxY + 15, 14, "normal", "normal");

      // Student Dashboard Stats
      this.addText(doc, "Total Students", boxX + labelOffsetX + 2, boxY + labelOffsetY + 20, 14, "bold", "normal");
      this.addText(doc, totalStudents, boxX + labelOffsetX + 15, boxY + 35, 14, "normal", "normal");

      // School Stats box
      const schoolLines = studentsPerSchool.split('\n').length;
      const schoolLineHeight = 5;
      const schoolBoxHeight = (schoolLines * schoolLineHeight) + 5; // content + bottom padding
      const schoolBoxX = boxX + boxWidth + boxOffset;
      const schoolBoxWidth = schoolBoxX + 5; // Width of school stats box, next box is offset from this

      doc.roundedRect(schoolBoxX, boxY, schoolBoxWidth, schoolBoxHeight, 3, 3);

      // School Stats List
      this.addText(doc, "Students Per School", schoolBoxX + labelOffsetX, boxY + labelOffsetY, 14, "bold", "normal");
      this.addText(doc, studentsPerSchool, schoolBoxX + labelOffsetX, boxY + labelOffsetY + 5, 10, "normal", "normal");

      // Grade Stats box
      const gradeLines = Math.max(gradesLeft.split('\n').length, gradesRight.split('\n').length);
      const gradeLineHeight = 5;
      const gradeBoxHeight = (gradeLines * gradeLineHeight) + 5; // content + bottom padding
      const gradeBoxX = schoolBoxX + schoolBoxWidth + boxOffset;

      doc.roundedRect(gradeBoxX, boxY, boxWidth + 10, gradeBoxHeight, 3, 3);

      // Grade Stats List
      this.addText(doc, "Students Per Grade", gradeBoxX + labelOffsetX, boxY + labelOffsetY, 14, "bold", "normal");

      this.addText(doc, gradesLeft, gradeBoxX + labelOffsetX, boxY + labelOffsetY + 5, 10, "normal", "normal");
      this.addText(doc, gradesRight, gradeBoxX + labelOffsetX + 30, boxY + labelOffsetY + 5, 10, "normal", "normal");

      // Individual Family Pages \\
      const maxY = doc.internal.pageSize.getHeight() - 15;
      let lastY = 15;

      for (let i = 0; i < this.family().length; i++) {
        if (i === 0) { // First family, add page after dashboard stats
          doc.addPage();
        }

        const currentFamily = this.family()[i];
        let currentOffset = 15; // Determine offset for current family

        if (i > 0) {  // Not first family
          const spaceNeeded = 60 + (currentFamily.students.length * 10); // Rough estimate of space needed for family info + table
          if (lastY + 5 + spaceNeeded > maxY) { // Doesn't fit
            doc.addPage();
            currentOffset = 15;
          } else { // Fits
            doc.setLineWidth(thinLineWidth);
            doc.line(10, lastY + 5, 200, lastY + 5); // Separator line between families
            currentOffset = lastY + 15;
          }
        }
        // Render family
        lastY = this.renderFamily(doc, currentFamily, currentOffset);
      }

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
