import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { switchMap } from 'rxjs';

import { Family, StudentInfo } from '../family/family';
import { FamilyService } from '../family/family.service';

@Component({
  selector: 'app-point-of-sale-session-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatDialogModule],
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
    this.startSession();
  }

  protected restartSession(): void {
    this.startSession(true);
  }

  protected sessionHasNoChecklistItems(family: Family): boolean {
    const sections = family.checklist?.sections ?? [];
    return sections.length > 0 && sections.every(section => section.items.length === 0);
  }

  protected studentForSection(sectionIndex: number): StudentInfo | undefined {
    return this.sessionFamily?.students?.[sectionIndex];
  }

  private startSession(regenerateSnapshot = false): void {
    const familyId = this.data.family._id;
    if (!familyId) {
      this.loading = false;
      this.errorMessage = 'This family is missing an ID, so the help session cannot be started.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const sessionRequest = regenerateSnapshot
      ? this.familyService.clearFamilyHelpSession(familyId).pipe(
        switchMap(() => this.familyService.startFamilyHelpSession(familyId))
      )
      : this.familyService.startFamilyHelpSession(familyId);

    sessionRequest.subscribe({
      next: (family) => {
        this.sessionFamily = family;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = `Failed to ${regenerateSnapshot ? 'regenerate' : 'start'} help session: ${err.message}`;
      }
    });
  }
}
