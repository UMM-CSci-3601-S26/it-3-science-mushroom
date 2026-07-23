import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../auth/auth-service';

import { Family, ScheduleAssignment, ScheduleColumnType } from '../family';
import { FamilyService } from '../family.service';
import { SettingsService } from '../../settings/settings.service';
import { DefaultScheduleColumns, TimeAvailabilityLabels } from '../../settings/settings';
// Data structure for expandable columns
interface ScheduleColumn {
  id: number;
  label: string;
  type: ScheduleColumnType;
  columnIndex: number;
  order: number;
}

interface ScheduleGridCell {
  rowIndex: number;
  columnIndex: number;
}

interface ScheduleDisplayBlock {
  id: string;
  family: Family;
  rowStart: number;
  rowSpan: number;
  columnStart: number;
  columnSpan: number;
  scheduleWindow: string;
  isExtended: boolean;
  isContinuation: boolean;
  showFamilyDetails: boolean;
}

const DEFAULT_TIME_AVAILABILITY_LABELS: TimeAvailabilityLabels = {
  earlyMorning: '8:00-9:00 AM',
  lateMorning: '9:00-10:00 AM',
  earlyAfternoon: '12:00-1:00 PM',
  lateAfternoon: '1:00-2:00 PM'
};

const DEFAULT_SCHEDULE_COLUMNS: DefaultScheduleColumns = {
  englishFamilies: 1,
  spanishFamilies: 0
};

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
  private settingService = inject(SettingsService);

  families = signal<Family[]>([]);
  scheduleColumns = signal<ScheduleColumn[]>(this.buildScheduleColumns(DEFAULT_SCHEDULE_COLUMNS));
  timeAvailabilityLabels = signal<TimeAvailabilityLabels>(DEFAULT_TIME_AVAILABILITY_LABELS);
  isClearingScheduledTimes = signal(false);

  scheduledFamilies = computed(() =>
    [...this.families()].sort((left, right) =>
      this.timeSlotSortValue(left.timeSlot) - this.timeSlotSortValue(right.timeSlot)
        || this.compareGuardianNames(left.guardianName, right.guardianName)
    )
  );

  scheduledColumns = computed(() =>
    [...this.scheduleColumns()].sort((left, right) => left.order - right.order)
  );

  spanishScheduleColumns = computed(() =>
    this.scheduleColumns().filter(column => column.type === 'Spanish')
  );

  englishScheduleColumns = computed(() =>
    this.scheduleColumns().filter(column => column.type === 'English')
  );

  scheduleTimeRows = computed(() => {
    const labels = this.timeAvailabilityLabels();
    const rows = [
      this.subdivideTimeSlot(labels.earlyMorning, 'AM'),
      this.subdivideTimeSlot(labels.lateMorning, 'AM'),
      this.subdivideTimeSlot(labels.earlyAfternoon, 'PM'),
      this.subdivideTimeSlot(labels.lateAfternoon, 'PM')
    ].flat();

    return [...new Set(rows)].sort((left, right) =>
      this.timeSlotSortValue(left) - this.timeSlotSortValue(right)
    );
  });

  scheduleBoardColumns = computed(() =>
    `repeat(${Math.max(this.scheduledColumns().length, 1)}, var(--app-data-grid-cell-width, 10rem))`
  );

  scheduleBoardRows = computed(() =>
    `repeat(${Math.max(this.scheduleTimeRows().length, 1)}, var(--schedule-row-height))`
  );

  scheduleDisplayBlocks = computed(() => {
    const rows = this.scheduleTimeRows();
    const columns = this.scheduledColumns();
    const rowStartIndexes = this.scheduleRowStartIndexes(rows);

    return this.scheduledFamilies()
      .flatMap((family, familyIndex) =>
        this.displayBlocksForFamily(family, familyIndex, rows, rowStartIndexes, columns)
      )
      .sort((left, right) =>
        left.rowStart - right.rowStart
          || left.columnStart - right.columnStart
          || this.compareGuardianNames(left.family.guardianName, right.family.guardianName)
      );
  });

  needSpanishHelpFamilies = computed(() =>
    this.families().filter(family => this.needsSpanishHelp(family))
  );

  noSpanishHelpFamilies = computed(() =>
    this.families().filter(family => !this.needsSpanishHelp(family))
  );

  hasScheduledTimes = computed(() =>
    this.families().some(family => this.isScheduled(family.timeSlot))
  );

  constructor() {
    this.loadFamilies();
    this.loadSettings();
  }

  needsSpanishHelp(family: Family): boolean {
    return family.needSpanishHelp;
  }

  checkColumnType(column: ScheduleColumn): ScheduleColumnType {
    return column.type;
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
        this.snackBar.open(this.scheduleFailureMessage(err), 'OK', { duration: 5000 });
      }
    });
  }

  private buildScheduleColumns(defaultColumns: DefaultScheduleColumns): ScheduleColumn[] {
    const columns: ScheduleColumn[] = [];
    let nextId = 1;

    const englishCount = Math.max(1, defaultColumns.englishFamilies ?? 1);
    const spanishCount = Math.max(0, defaultColumns.spanishFamilies ?? 0);

    for (let index = 0; index < englishCount; index++) {
      columns.push({
        id: nextId,
        label: `Slot ${nextId}`,
        type: `English`,
        columnIndex: index + 1,
        order: nextId
      });
      nextId++;
    }

    for (let index = 0; index < spanishCount; index++) {
      columns.push({
        id: nextId,
        label: `Slot ${nextId}`,
        type: `Spanish`,
        columnIndex: index + 1,
        order: nextId
      });
      nextId++;
    }

    return columns;
  }

  private scheduleFailureMessage(err: unknown): string {
    const errorText = this.scheduleErrorText(err);

    if (this.isLowCapacityScheduleError(err, errorText)) {
      return 'Not enough schedule capacity. Add more 15-minute blocks in Settings > Time Availability, then try scheduling again.';
    }

    if (this.isInvalidTimeSlotScheduleError(errorText)) {
      return 'The saved Time Availability ranges are invalid. Use ranges like 8:00-9:00 AM, save them, then schedule again.';
    }

    return 'Unable to schedule families right now. Check the saved Time Availability ranges and try again.';
  }

  private scheduleErrorText(err: unknown): string {
    const httpError = err as {
      error?: unknown;
      message?: string;
    };

    return [
      typeof httpError?.error === 'string' ? httpError.error : JSON.stringify(httpError?.error ?? {}),
      httpError?.message ?? ''
    ].join(' ');
  }

  private isLowCapacityScheduleError(err: unknown, errorText: string): boolean {
    const httpError = err as { status?: number };
    return httpError?.status === 404
      || errorText.includes('Not all families were able to be sorted, your event capacity may be too low');
  }

  private isInvalidTimeSlotScheduleError(errorText: string): boolean {
    return errorText.includes('Time slot must include AM or PM')
      || errorText.includes('Time slot contains an invalid time')
      || errorText.includes('Time slot end must be after the start time');
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

  private displayBlocksForFamily(
    family: Family,
    familyIndex: number,
    rows: string[],
    rowStartIndexes: Map<number, number>,
    columns: ScheduleColumn[]
  ): ScheduleDisplayBlock[] {
    const cells = this.scheduleCellsForFamily(family, rows, rowStartIndexes, columns);

    if (cells.length === 0) {
      return [];
    }

    const baseId = this.scheduleBlockId(family, familyIndex);

    if (this.cellsFormRectangle(cells)) {
      return [this.displayBlockFromCells(family, cells, baseId, true, cells.length > 1)];
    }

    return this.displayLineSegmentBlocksForFamily(family, cells, baseId);
  }

  private scheduleCellsForFamily(
    family: Family,
    rows: string[],
    rowStartIndexes: Map<number, number>,
    columns: ScheduleColumn[]
  ): ScheduleGridCell[] {
    const assignments = this.scheduleAssignments(family);
    const cells: ScheduleGridCell[] = [];
    const seenCells = new Set<string>();
    const hasSavedAssignments = (family.scheduleAssignments?.length ?? 0) > 0 || assignments.length > 1;

    for (const assignment of assignments) {
      const columnIndex = this.columnIndexForAssignment(assignment, columns);

      if (columnIndex < 0) {
        continue;
      }

      const rowIndexes = hasSavedAssignments
        ? this.rowIndexesForAssignmentStart(assignment.timeSlot, rowStartIndexes)
        : this.coveredRowIndexes(family.timeSlot || assignment.timeSlot, rows);

      for (const rowIndex of rowIndexes) {
        const cellKey = `${rowIndex}:${columnIndex}`;
        if (seenCells.has(cellKey)) {
          continue;
        }

        seenCells.add(cellKey);
        cells.push({ rowIndex, columnIndex });
      }
    }

    return cells.sort((left, right) =>
      left.rowIndex - right.rowIndex || left.columnIndex - right.columnIndex
    );
  }

  private displayLineSegmentBlocksForFamily(
    family: Family,
    cells: ScheduleGridCell[],
    baseId: string
  ): ScheduleDisplayBlock[] {
    const segments: ScheduleGridCell[][] = [];

    for (const cell of cells) {
      const currentSegment = segments.at(-1);
      const previousCell = currentSegment?.at(-1);

      if (previousCell
        && previousCell.rowIndex === cell.rowIndex
        && previousCell.columnIndex + 1 === cell.columnIndex) {
        currentSegment?.push(cell);
      } else {
        segments.push([cell]);
      }
    }

    return segments.map((segment, segmentIndex) =>
      this.displayBlockFromCells(
        family,
        segment,
        `${baseId}-${segmentIndex}`,
        segmentIndex === 0,
        cells.length > 1)
    );
  }

  private displayBlockFromCells(
    family: Family,
    cells: ScheduleGridCell[],
    id: string,
    showFamilyDetails: boolean,
    isExtended: boolean
  ): ScheduleDisplayBlock {
    const rowIndexes = cells.map(cell => cell.rowIndex);
    const columnIndexes = cells.map(cell => cell.columnIndex);
    const minRow = Math.min(...rowIndexes);
    const maxRow = Math.max(...rowIndexes);
    const minColumn = Math.min(...columnIndexes);
    const maxColumn = Math.max(...columnIndexes);

    return {
      id,
      family,
      rowStart: minRow + 1,
      rowSpan: maxRow - minRow + 1,
      columnStart: minColumn + 1,
      columnSpan: maxColumn - minColumn + 1,
      scheduleWindow: this.scheduleWindow(family),
      isExtended,
      isContinuation: !showFamilyDetails,
      showFamilyDetails
    };
  }

  private cellsFormRectangle(cells: ScheduleGridCell[]): boolean {
    const rowIndexes = cells.map(cell => cell.rowIndex);
    const columnIndexes = cells.map(cell => cell.columnIndex);
    const rowSpan = Math.max(...rowIndexes) - Math.min(...rowIndexes) + 1;
    const columnSpan = Math.max(...columnIndexes) - Math.min(...columnIndexes) + 1;

    return rowSpan * columnSpan === cells.length;
  }

  private scheduleBlockId(family: Family, familyIndex: number): string {
    return family._id ?? `${family.guardianName}-${family.email}-${familyIndex}`;
  }

  private scheduleRowStartIndexes(rows: string[]): Map<number, number> {
    const indexes = new Map<number, number>();

    rows.forEach((row, index) => {
      const range = this.timeSlotRange(row);
      if (range) {
        indexes.set(range.start, index);
      }
    });

    return indexes;
  }

  private columnIndexForAssignment(assignment: ScheduleAssignment, columns: ScheduleColumn[]): number {
    return columns.findIndex(column =>
      column.type === assignment.columnType
        && column.columnIndex === assignment.columnIndex
    );
  }

  private rowIndexesForAssignmentStart(
    timeSlot: string | undefined,
    rowStartIndexes: Map<number, number>
  ): number[] {
    const range = this.timeSlotRange(timeSlot);

    if (!range) {
      return [];
    }

    const rowIndex = rowStartIndexes.get(range.start);
    return rowIndex === undefined ? [] : [rowIndex];
  }

  private coveredRowIndexes(timeSlot: string | undefined, rows: string[]): number[] {
    const assignmentRange = this.timeSlotRange(timeSlot);

    if (!assignmentRange) {
      return [];
    }

    return rows
      .map((row, index) => ({ range: this.timeSlotRange(row), index }))
      .filter(row => row.range
        && row.range.start >= assignmentRange.start
        && row.range.start < assignmentRange.end)
      .map(row => row.index);
  }

  private loadFamilies(): void {
    this.familyService.getFamilies().pipe(
      catchError(() => {
        this.snackBar.open('Failed to load family schedule', 'OK', { duration: 3000 });
        return of<Family[]>([]);
      })
    ).subscribe(families => this.families.set(families));
  }

  private loadSettings(): void {
    this.settingService.getSettings().pipe(
      catchError(() => {
        this.snackBar.open('Failed to load time windows', 'OK', { duration: 3000 });
        return of(undefined);
      })
    ).subscribe(settings => {
      if (settings?.timeAvailability) {
        this.timeAvailabilityLabels.set(settings.timeAvailability);
      }
      if(settings?.defaultScheduleColumns) {
        this.scheduleColumns.set(this.buildScheduleColumns(settings.defaultScheduleColumns));
      }
    });
  }

  private isScheduled(timeSlot: string | undefined): boolean {
    if (!timeSlot) {
      return false;
    }

    const normalized = timeSlot.trim().toLowerCase();
    return normalized !== '' && normalized !== 'tbd' && !normalized.includes('assigned');
  }

  private scheduleAssignments(family: Family): ScheduleAssignment[] {
    if (family.scheduleAssignments?.length) {
      return family.scheduleAssignments;
    }

    return family.scheduleAssignment ? [family.scheduleAssignment] : [];
  }

  private timeSlotRange(timeSlot: string | undefined): { start: number; end: number } | undefined {
    if (!timeSlot) {
      return undefined;
    }

    const normalizedTimeSlot = timeSlot.trim().toUpperCase().replace(/\u2013|\u2014/g, '-');
    const rangeParts = normalizedTimeSlot.split(/\s*-\s*/, 2);

    if (rangeParts.length < 2) {
      return undefined;
    }

    const endMeridiem = this.rangeMeridiem(rangeParts[1]);
    const startMeridiem = this.rangeMeridiem(rangeParts[0]) ?? endMeridiem;

    if (!startMeridiem || !endMeridiem) {
      return undefined;
    }

    const start = this.parseScheduleTime(rangeParts[0], startMeridiem);
    const end = this.parseScheduleTime(rangeParts[1], endMeridiem);

    if (start === Number.MAX_SAFE_INTEGER || end === Number.MAX_SAFE_INTEGER || end <= start) {
      return undefined;
    }

    return { start, end };
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

  private subdivideTimeSlot(timeSlot: string | undefined, fallbackMeridiem: 'AM' | 'PM'): string[] {
    if (!timeSlot?.trim()) {
      return [];
    }

    const normalizedTimeSlot = timeSlot.trim().replace(/\u2013|\u2014/g, '-');
    const rangeParts = normalizedTimeSlot.split(/\s*-\s*/, 2);
    const endMeridiem = rangeParts[1] ? this.rangeMeridiem(rangeParts[1]) : undefined;
    const startMeridiem = this.rangeMeridiem(rangeParts[0]) ?? endMeridiem ?? fallbackMeridiem;

    const start = this.parseScheduleTime(rangeParts[0], startMeridiem);
    const end = rangeParts[1]
      ? this.parseScheduleTime(rangeParts[1], endMeridiem ?? startMeridiem)
      : start + 60;

    if (end <= start) {
      return [];
    }

    const rows: string[] = [];
    for (let current = start; current + 15 <= end; current += 15) {
      rows.push(this.formatScheduleBlock(current, current + 15));
    }

    return rows;
  }

  private parseScheduleTime(timeText: string, meridiem: 'AM' | 'PM'): number {
    const cleanedTime = timeText.replace(/\b(AM|PM)\b/gi, '').trim();
    const match = cleanedTime.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    let hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);

    if (meridiem === 'PM' && hour < 12) {
      hour += 12;
    }
    if (meridiem === 'AM' && hour === 12) {
      hour = 0;
    }

    return hour * 60 + minute;
  }

  private formatScheduleBlock(startMinutes: number, endMinutes: number): string {
    const start = this.formatScheduleTime(startMinutes);
    const end = this.formatScheduleTime(endMinutes);

    if (start.meridiem === end.meridiem) {
      return `${start.time}-${end.time} ${end.meridiem}`;
    }

    return `${start.time} ${start.meridiem}-${end.time} ${end.meridiem}`;
  }

  private formatScheduleTime(totalMinutes: number): { time: string; meridiem: 'AM' | 'PM' } {
    const normalizedMinutes = totalMinutes % (24 * 60);
    const hour24 = Math.floor(normalizedMinutes / 60);
    const minute = normalizedMinutes % 60;
    const meridiem = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;

    return {
      time: `${hour12}:${minute.toString().padStart(2, '0')}`,
      meridiem
    };
  }
}
