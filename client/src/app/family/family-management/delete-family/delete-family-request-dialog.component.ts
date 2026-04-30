import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface DeleteFamilyRequestDialogData {
  guardianName: string;
}

export interface DeleteFamilyRequestDialogResult {
  message: string;
}

@Component({
  selector: 'app-delete-family-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>Request Family Deletion</h2>
    <mat-dialog-content>
      <p>
        Explain why <strong>{{ data.guardianName }}</strong>'s family profile should be deleted.
      </p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Reason</mat-label>
        <textarea
          matInput
          rows="4"
          [(ngModel)]="message"
          placeholder="Please include enough detail for admin review.">
        </textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancel</button>
      <button mat-raised-button color="warn" type="button" [disabled]="!trimmedMessage" (click)="submit()">
        Submit Request
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .full-width {
        width: 100%;
      }
    `
  ]
})
export class DeleteFamilyRequestDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteFamilyRequestDialogComponent>);
  readonly data = inject<DeleteFamilyRequestDialogData>(MAT_DIALOG_DATA);

  message = '';

  get trimmedMessage(): string {
    return this.message.trim();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (!this.trimmedMessage) {
      return;
    }

    this.dialogRef.close({ message: this.trimmedMessage } satisfies DeleteFamilyRequestDialogResult);
  }
}
