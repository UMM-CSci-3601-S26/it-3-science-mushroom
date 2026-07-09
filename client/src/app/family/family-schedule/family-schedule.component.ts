import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../auth/auth-service';

import { Family } from '../family';
import { FamilyService } from '../family.service';

@Component({
  selector: 'app-family-schedule',
  standalone: true,
  templateUrl: './family-schedule.component.html',
  styleUrls: ['./family-schedule.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule
  ]
})
export class FamilyScheduleComponent {
  private familyService = inject(FamilyService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);


  families = signal<Family[]>([]);
  isClearingScheduledTimes = signal(false);

  scheduledFamilies = computed(() =>
    [...this.families()].sort((left, right) =>
      this.timeSlotSortValue(left.timeSlot) - this.timeSlotSortValue(right.timeSlot)
        || this.compareGuardianNames(left.guardianName, right.guardianName)
    )
  );

  hasScheduledTimes = computed(() =>
    this.families().some(family => this.isScheduled(family.timeSlot))
  );

  constructor() {
    this.loadFamilies();
  }

  clearScheduledTimes(): void {
    if (!this.hasScheduledTimes() || this.isClearingScheduledTimes()) {
      return;
    }

    this.isClearingScheduledTimes.set(true);
    this.familyService.clearScheduledTimes().pipe(
      finalize(() => this.isClearingScheduledTimes.set(false))
    ).subscribe({
      next: families => {
        this.families.set(families);
        this.snackBar.open('Scheduled times cleared', 'OK', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Failed to clear scheduled times', 'OK', { duration: 3000 });
      }
    });
  }

  get canScheduleFamilies(): boolean {
    return this.authService.isAdmin() && this.authService.hasPermission('schedule_families');
  }

  /**
  * Schedules families according to their selected availability windows.
  * The 15-minute schedule capacity comes from the saved time availability ranges.
  */
  scheduleFamilies(): void {
    if (!this.canScheduleFamilies) {
      return;
    }

    this.familyService.scheduleFamilies().subscribe({
      next: (families) => {
        this.families.set(families);
        this.snackBar.open('Families scheduled', 'OK', { duration: 2000});
      },
      error: (err) => {
        const lowCapacityMessage = 'Not all families were able to be sorted, your event capacity may be too low';
        const errorText = [
          typeof err?.error === 'string' ? err.error : JSON.stringify(err?.error ?? {}),
          err?.message ?? ''
        ].join(' ');

        if (err?.status === 404 || errorText.includes(lowCapacityMessage)) {
          this.snackBar.open('Your time windows do not have enough 15-minute blocks for every family', 'OK', {duration: 3000});
        } else {
          this.snackBar.open('Failed to schedule families', 'OK', {duration: 3000});
        }
      }
    });
  }

  private compareGuardianNames(leftName: string, rightName: string): number {
    const left = this.nameParts(leftName);
    const right = this.nameParts(rightName);

    return left.first.localeCompare(right.first)
      || left.last.localeCompare(right.last)
      || left.full.localeCompare(right.full);
  }

  private nameParts(name: string): { first: string; last: string; full: string } {
    const parts = name.trim().split(/\s+/);

    return {
      first: parts[0] ?? '',
      last: parts.at(-1) ?? '',
      full: name.trim()
    };
  }

  scheduleWindow(family: Family): string {
    const timeSlot = family.timeSlot?.trim();
    return timeSlot ? timeSlot : 'To be assigned';
  }

  private loadFamilies(): void {
    this.familyService.getFamilies().pipe(
      catchError(() => {
        this.snackBar.open('Failed to load family schedule', 'OK', { duration: 3000 });
        return of<Family[]>([]);
      })
    ).subscribe(families => this.families.set(families));
  }

  private isScheduled(timeSlot: string | undefined): boolean {
    if (!timeSlot) {
      return false;
    }

    const normalized = timeSlot.trim().toLowerCase();
    return normalized !== '' && normalized !== 'tbd' && !normalized.includes('assigned');
  }

  private timeSlotSortValue(timeSlot: string | undefined): number {
    if (!timeSlot || timeSlot.toLowerCase().includes('assigned') || timeSlot.toLowerCase() === 'tbd') {
      return Number.MAX_SAFE_INTEGER;
    }

    const normalizedTimeSlot = timeSlot.trim().toUpperCase();
    const match = normalizedTimeSlot.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    let hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    const meridiem = match[3] ?? this.rangeMeridiem(normalizedTimeSlot);

    if (meridiem === 'PM' && hour < 12) {
      hour += 12;
    }
    if (meridiem === 'AM' && hour === 12) {
      hour = 0;
    }

    return hour * 60 + minute;
  }

  private rangeMeridiem(timeSlot: string): 'AM' | 'PM' | undefined {
    return timeSlot.match(/\b(AM|PM)\b/g)?.at(-1) as 'AM' | 'PM' | undefined;
  }
}
