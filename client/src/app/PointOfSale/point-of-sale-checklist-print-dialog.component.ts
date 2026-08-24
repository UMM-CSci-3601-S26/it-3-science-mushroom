import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { Family, StudentInfo } from '../family/family';

export interface ChecklistPrintSelectionResult {
  familySelections: { family: Family; selectedStudentIndexes: number[] }[];
}

interface ChecklistPrintStudentRow {
  family: Family;
  familyIndex: number;
  student: StudentInfo;
  studentIndex: number;
}

@Component({
  selector: 'app-point-of-sale-checklist-print-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './point-of-sale-checklist-print-dialog.component.html',
  styleUrls: ['./point-of-sale-checklist-print-dialog.component.scss']
})
export class PointOfSaleChecklistPrintDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PointOfSaleChecklistPrintDialogComponent>);
  readonly data = inject<{ families: Family[] }>(MAT_DIALOG_DATA);
  readonly selectedStudentKeys = new Set<string>();

  get familyGroups(): Family[] {
    return this.data.families ?? [];
  }

  get studentRows(): ChecklistPrintStudentRow[] {
    return this.familyGroups.flatMap((family, familyIndex) =>
      (family.students ?? []).map((student, studentIndex) => ({ family, familyIndex, student, studentIndex }))
    );
  }

  get studentCount(): number {
    return this.studentRows.length;
  }

  get hasSelection(): boolean {
    return this.selectedStudentKeys.size > 0;
  }

  displayValue(value: string | undefined): string {
    const trimmedValue = value?.trim();
    return trimmedValue && trimmedValue.toLowerCase() !== 'n/a' ? trimmedValue : 'Not listed';
  }

  isStudentSelected(familyIndex: number, studentIndex: number): boolean {
    return this.selectedStudentKeys.has(this.selectionKey(familyIndex, studentIndex));
  }

  toggleStudent(familyIndex: number, studentIndex: number, checked: boolean): void {
    const key = this.selectionKey(familyIndex, studentIndex);

    if (checked) {
      this.selectedStudentKeys.add(key);
      return;
    }

    this.selectedStudentKeys.delete(key);
  }

  selectAllStudents(): void {
    this.studentRows.forEach(row => this.selectedStudentKeys.add(this.selectionKey(row.familyIndex, row.studentIndex)));
  }

  clearSelectedStudents(): void {
    this.selectedStudentKeys.clear();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  printSelectedStudents(): void {
    if (!this.hasSelection) {
      return;
    }

    this.dialogRef.close({
      familySelections: this.familyGroups.map((family, familyIndex) => ({
        family,
        selectedStudentIndexes: (family.students ?? [])
          .map((_student, studentIndex) => studentIndex)
          .filter(studentIndex => this.isStudentSelected(familyIndex, studentIndex))
      })).filter(selection => selection.selectedStudentIndexes.length > 0)
    });
  }

  private selectionKey(familyIndex: number, studentIndex: number): string {
    return `${familyIndex}:${studentIndex}`;
  }
}
