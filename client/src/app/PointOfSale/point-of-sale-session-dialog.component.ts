import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { Family } from '../family/family';
import { FamilyService } from '../family/family.service';

@Component({
  selector: 'app-point-of-sale-session-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatDialogModule],
  templateUrl: './point-of-sale-session-dialog.component.html',
  styleUrls: ['./point-of-sale-session-dialog.component.scss']
})
export class PointOfSaleSessionDialogComponent implements OnInit {
  protected readonly dialogRef = inject(MatDialogRef<PointOfSaleSessionDialogComponent>);
  protected readonly data = inject<{ family: Family }>(MAT_DIALOG_DATA);
  private readonly familyService = inject(FamilyService);

  protected sessionFamily: Family | undefined;
  protected loading = true;
  protected errorMessage = '';

  ngOnInit(): void {
    const familyId = this.data.family._id;
    if (!familyId) {
      this.loading = false;
      this.errorMessage = 'This family is missing an ID, so the help session cannot be started.';
      return;
    }

    this.familyService.startFamilyHelpSession(familyId).subscribe({
      next: (family) => {
        this.sessionFamily = family;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = `Failed to start help session: ${err.message}`;
      }
    });
  }
}
