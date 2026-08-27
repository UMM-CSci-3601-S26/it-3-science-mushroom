import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, debounceTime, distinctUntilChanged, map, merge, of, startWith, switchMap, tap } from 'rxjs';

import { AuthService } from '../auth/auth-service';
import { Family, StudentInfo } from '../family/family';
import { FamilyService } from '../family/family.service';
import { DialogService } from '../shared/dialog/dialog.service';
import { PointOfSaleChecklistPrintDialogComponent } from './point-of-sale-checklist-print-dialog.component';
import { PointOfSaleFamilyCardComponent } from './point-of-sale-family-card.component';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

interface PrintableChecklistStudent {
  family: Family;
  student: StudentInfo;
}

@Component({
  selector: 'app-point-of-sale',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
    RouterLink,
    PointOfSaleFamilyCardComponent
  ],
  templateUrl: './PointOfSale.html',
  styleUrls: ['./PointOfSale.scss']
})
export class PointOfSaleComponent implements OnInit {
  private familyService = inject(FamilyService);
  private dialogService = inject(DialogService);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private familyRefresh = new Subject<number>();

  families: Family[] = [];
  familySearch = new FormControl('', { nonNullable: true });
  statusFilter = new FormControl('', { nonNullable: true });
  loadingFamilies = true;
  familyLoadError = '';

  readonly statusOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Not helped', value: 'not_helped' },
    { label: 'In progress', value: 'being_helped' },
    { label: 'Helped', value: 'helped' }
  ];

  ngOnInit(): void {
    const debouncedFamilySearch = merge(
      of(this.familySearch.value),
      this.familySearch.valueChanges.pipe(debounceTime(300))
    ).pipe(
      map(searchTerm => searchTerm.trim()),
      distinctUntilChanged()
    );

    combineLatest([
      debouncedFamilySearch,
      this.statusFilter.valueChanges.pipe(
        startWith(this.statusFilter.value),
        distinctUntilChanged()
      ),
      this.familyRefresh.pipe(startWith(0))
    ]).pipe(
      distinctUntilChanged((previous, current) =>
        previous[0] === current[0] && previous[1] === current[1] && previous[2] === current[2]),
      tap(() => {
        this.loadingFamilies = true;
        this.familyLoadError = '';
      }),
      switchMap(([searchTerm, status]) => this.familyService.getFamilies({
        guardianName: searchTerm,
        status
      }).pipe(
        catchError(err => {
          console.error('Failed to load families', err);
          this.familyLoadError = 'Unable to load families right now.';
          return of([]);
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(families => {
      this.families = families;
      this.loadingFamilies = false;
    });

  }

  clearFamilySearch(): void {
    this.familySearch.setValue('');
  }

  clearFilters(): void {
    this.familySearch.setValue('');
    this.statusFilter.setValue('');
  }

  printableStudentCount(): number {
    return this.families.reduce((total, family) => total + (family.students?.length ?? 0), 0);
  }

  get canPrintChecklists(): boolean {
    return this.authService.isAdmin();
  }

  openHelpFamilySession(family: Family): void {
    const dialogRef = this.dialog.open(PointOfSaleSessionDialogComponent, {
      data: { family },
      width: '860px',
      maxWidth: '92vw',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result?.cleared || result?.draftSaved || result?.completed || result?.refresh) {
        this.familyRefresh.next(Date.now());
      }
    });
  }

  openAllChecklistPrintDialog(): void {
    if (!this.canPrintChecklists) {
      return;
    }

    const dialogRef = this.dialog.open(PointOfSaleChecklistPrintDialogComponent, {
      data: { families: this.families },
      width: '720px',
      maxWidth: '92vw',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      this.printSelectedChecklists(result?.familySelections ?? []);
    });
  }

  revertCompletedFamilySession(family: Family): void {
    if (!family._id) {
      return;
    }
    const dialogRef = this.dialogService.openDialog({
      title: 'Revert Completed Session',
      message: 'Revert this completed session? This will restore the removed inventory and reopen the session.',
      buttonOne: 'Cancel',
      buttonTwo: 'Revert'
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.loadingFamilies = true;
      this.familyLoadError = '';
      this.familyService.revertCompletedFamilyHelpSession(family._id!).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => this.familyRefresh.next(Date.now()),
        error: (err) => {
          console.error('Failed to revert completed session', err);
          this.loadingFamilies = false;
          this.familyLoadError = 'Unable to revert that completed session.';
        }
      });
    });
  }

  private printSelectedChecklists(selections: { family: Family; selectedStudentIndexes: number[] }[]): void {
    const sheets = this.selectedChecklistStudents(selections);

    if (sheets.length === 0) {
      return;
    }

    const popup = window.open('', '_blank', 'width=900,height=700');

    if (!popup) {
      this.familyLoadError = 'Popup blocked. Allow popups to print checklists.';
      return;
    }

    popup.document.write(this.buildChecklistPrintDocument(sheets));
    popup.document.close();
    popup.focus();
  }

  private selectedChecklistStudents(
    selections: { family: Family; selectedStudentIndexes: number[] }[]
  ): PrintableChecklistStudent[] {
    return selections.flatMap(selection =>
      selection.selectedStudentIndexes.flatMap(index => {
        const student = selection.family.students?.[index];
        return student ? [{ family: selection.family, student }] : [];
      })
    );
  }

  private buildChecklistPrintDocument(sheets: PrintableChecklistStudent[]): string {
    return `
      <!doctype html>
      <html>
        <head>
          <title>Print Student Checklists</title>
          <style>
            ${this.checklistPrintStyles()}
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print Student Checklists</button>
          ${this.buildChecklistPrintPages(sheets)}
        </body>
      </html>
    `;
  }

  private buildChecklistPrintPages(sheets: PrintableChecklistStudent[]): string {
    return sheets.map((sheet, index) => `
      ${index % 2 === 0 ? '<main class="page">' : ''}
      ${this.buildChecklistHalfSheet(sheet)}
      ${index % 2 === 1 || index === sheets.length - 1 ? '</main>' : ''}
    `).join('');
  }

  private buildChecklistHalfSheet({ family, student }: PrintableChecklistStudent): string {
    return `
      <section class="half">
        <h1>Student Supply Checklist</h1>
        <p>
          <b>Student:</b> ${this.printValue(student.name)}
          <b>Family:</b> ${this.printValue(family.guardianName)}
        </p>
        <p>
          <b>School:</b> ${this.printValue(student.school)}
          <b>Grade:</b> ${this.printValue(student.grade)}
          <b>Teacher:</b> ${this.printValue(student.teacher)}
        </p>
        <div class="cols">
          ${this.buildChecklistColumn()}
          ${this.buildChecklistColumn()}
        </div>
      </section>
    `;
  }

  private buildChecklistColumn(): string {
    const blank = '<span class="line"></span>';
    const row = `
      <div class="item">
        <span>${blank}</span>
        <span></span>
        <span></span>
        <span></span>
        <span>${blank}</span>
      </div>
    `;
    const rows = Array.from({ length: 17 }, () => row).join('');

    return `
      <div class="list">
        <div class="item head">
          <span>Need</span>
          <span>Y</span>
          <span>N</span>
          <span>Sub</span>
          <span>Give</span>
        </div>
        ${rows}
      </div>
    `;
  }

  private checklistPrintStyles(): string {
    return `
      @page { size: letter; margin: 0; }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: #eee;
        color: #111;
        font-family: Arial, sans-serif;
      }

      button { margin: 12px; }

      .page {
        display: grid;
        grid-template-rows: 1fr 1fr;
        width: 8.5in;
        height: 11in;
        margin: 0 auto 12px;
        padding: .2in;
        background: white;
        break-after: page;
      }

      .half {
        overflow: hidden;
        padding: .06in 0;
        border-bottom: 1px dashed #888;
      }

      .half:last-child { border-bottom: 0; }

      h1 {
        margin: 0 0 .04in;
        font-size: 12px;
      }

      p {
        margin: .02in 0;
        font-size: 9px;
      }

      .line {
        display: inline-block;
        width: 1in;
        border-bottom: 1px solid #333;
      }

      .cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: .16in;
        margin-top: .04in;
      }

      .list {
        min-width: 0;
        font-size: 7px;
      }

      .item {
        display: grid;
        grid-template-columns: minmax(0, 1fr) .18in .18in .25in .65in;
        min-height: .22in;
        align-items: center;
        border-bottom: 1px solid #ccc;
      }

      .item > * {
        min-width: 0;
        padding: .02in .04in;
      }

      .item .line {
        display: block;
        width: 100%;
      }

      .head {
        background: #eee;
        font-weight: bold;
      }

      @media print {
        body { background: white; }

        button { display: none; }

        .page { margin: 0; }
      }
    `;
  }

  private printValue(text?: string): string {
    const trimmed = text?.trim();
    return trimmed && trimmed.toLowerCase() !== 'n/a'
      ? this.escapeHtml(trimmed)
      : '<span class="line"></span>';
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
  }
}
