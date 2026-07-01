import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { FamilyChecklist } from '../../checklist/checklist';
import { FamilyPortalService, FamilyPortalSummary } from './family-portal.service';

@Component({
  selector: 'app-family-portal-home',
  templateUrl: './family-portal-home.component.html',
  styleUrls: ['./family-portal-home.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ]
})
export class FamilyPortalHomeComponent implements OnInit {
  private familyPortalService = inject(FamilyPortalService);

  summary: FamilyPortalSummary | null = null;
  checklist: FamilyChecklist | null = null;
  isLoading = true;
  error: string | null = null;

  get assignedTimeSlot(): string {
    return this.summary?.timeSlot || 'To be assigned';
  }

  get driveDayDate(): string {
    return this.summary?.driveDay?.date || 'Not set yet';
  }

  get checklistSections() {
    return this.checklist?.sections ?? [];
  }

  get welcomeName(): string {
    return this.summary?.family?.guardianName?.trim() || 'guardian';
  }

  get checklistTitle(): string {
    const studentCount = this.summary?.family?.students?.length ?? 0;
    const checklistCount = Math.max(studentCount, this.checklistSections.length);

    return checklistCount > 1 ? 'Supply Checklists' : 'Supply Checklist';
  }

  ngOnInit(): void {
    this.loadPortalData();
  }

  private loadPortalData() {
    this.familyPortalService.getSummary().subscribe({
      next: summary => {
        this.summary = summary;
        if (!summary.profileComplete) {
          this.isLoading = false;
          return;
        }

        // Checklist is requested after the summary so the server can reject
        // incomplete profiles consistently.
        this.familyPortalService.getChecklist().subscribe({
          next: checklist => {
            this.checklist = checklist;
            this.isLoading = false;
          },
          error: () => {
            this.error = 'Unable to load your checklist right now.';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.error = 'Unable to load your family portal data right now.';
        this.isLoading = false;
      }
    });
  }
}
