import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { Family } from '../family';
import { FamilyService } from '../family.service';

@Component({
  selector: 'app-family-schedule',
  standalone: true,
  templateUrl: './family-schedule.component.html',
  styleUrls: ['./family-schedule.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ]
})
export class FamilyScheduleComponent {
  private familyService = inject(FamilyService);

  families = toSignal(
    this.familyService.getFamilies().pipe(
      catchError(() => of<Family[]>([]))
    ),
    { initialValue: [] }
  );

  scheduledFamilies = computed(() =>
    [...this.families()].sort((left, right) =>
      this.timeSlotSortValue(left.timeSlot) - this.timeSlotSortValue(right.timeSlot)
        || this.compareGuardianNames(left.guardianName, right.guardianName)
    )
  );

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
