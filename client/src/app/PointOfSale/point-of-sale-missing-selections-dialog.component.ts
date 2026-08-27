import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MissingSelection } from "./point-of-sale-checklist-print-selection";

interface MissingSelectionDialogData {
  missingSelections: MissingSelection[];
}

@Component({
  selector: 'app-point-of-sale-missing-selections-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title> Missing Student Selections </h2>

    <mat-dialog-content>
      @for (selection of data.missingSelections; track selection.studentIndex) {
        <p>
          {{ selection.family.guardianName }}
        -

        selected student #{{ selection.studentIndex + 1}} could not be loaded
        </p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `
})

export class PointOfSaleMissingSelectionsDialogComponent {
  readonly data = inject<MissingSelectionDialogData>(MAT_DIALOG_DATA);
}
