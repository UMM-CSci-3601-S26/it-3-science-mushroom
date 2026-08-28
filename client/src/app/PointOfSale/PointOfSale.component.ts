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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, combineLatest, debounceTime, distinctUntilChanged, forkJoin, map, merge, of, startWith, switchMap, tap } from 'rxjs';

import { AuthService } from '../auth/auth-service';
import { ChecklistItem, ChecklistSection, Family, FamilyChecklist, StudentInfo } from '../family/family';
import { FamilyService } from '../family/family.service';
import { DialogService } from '../shared/dialog/dialog.service';
import { MissingSelection } from './point-of-sale-checklist-print-selection';
import { PointOfSaleChecklistPrintDialogComponent } from './point-of-sale-checklist-print-dialog.component';
import { PointOfSaleFamilyCardComponent } from './point-of-sale-family-card.component';
import { PointOfSaleMissingSelectionsDialogComponent } from './point-of-sale-missing-selections-dialog.component';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

interface PrintableChecklistStudent {
  family: Family;
  student: StudentInfo;
  studentIndex: number;
}

interface SelectedChecklistStudentsResult {
  selectedStudents: PrintableChecklistStudent[];
  missingSelections: MissingSelection[];
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
  private static readonly minimumPrintBodyRows = 36;

  private familyService = inject(FamilyService);
  private dialogService = inject(DialogService);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private familyRefresh = new Subject<number>();
  private snackBar = inject(MatSnackBar);

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
    const { selectedStudents, missingSelections } = this.selectedChecklistStudents(selections);

    if (missingSelections.length > 0) {
      const snackBarRef = this.snackBar.open(
        'Some selected students failed to load.',
        'Details',
        { duration: 10000 }
      );

      snackBarRef.onAction().pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.dialog.open(PointOfSaleMissingSelectionsDialogComponent, {
          data: { missingSelections },
          width: '860px',
          maxWidth: '92vw',
          maxHeight: '90vh'
        });
      });
    }

    if (selectedStudents.length === 0) {
      return;
    }

    const popup = window.open('', '_blank', 'width=900,height=700');

    if (!popup) {
      this.familyLoadError = 'Popup blocked. Allow popups to print checklists.';
      return;
    }

    popup.document.write(this.buildChecklistPreparingDocument());
    popup.document.close();

    this.selectedStudentsWithCurrentChecklists(selectedStudents).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: printableStudents => this.writeChecklistPrintDocument(popup, printableStudents),
      error: (err) => {
        console.error('Failed to prepare printable checklists', err);
        this.familyLoadError = 'Unable to prepare printable checklists right now.';
        this.writeChecklistErrorDocument(popup);
      }
    });
  }

  private selectedStudentsWithCurrentChecklists(
    selectedStudents: PrintableChecklistStudent[]
  ): Observable<PrintableChecklistStudent[]> {
    const checklistRequests = new Map<string, Observable<FamilyChecklist>>();

    for (const { family } of selectedStudents) {
      if (!family._id || checklistRequests.has(family._id)) {
        continue;
      }
      checklistRequests.set(family._id, this.familyService.getCurrentFamilyChecklist(family._id));
    }

    if (checklistRequests.size === 0) {
      return of(selectedStudents);
    }

    const requests = Array.from(checklistRequests.entries()).map(([familyId, request]) =>
      request.pipe(map(checklist => ({ familyId, checklist })))
    );

    return forkJoin(requests).pipe(
      map(checklists => {
        const checklistsByFamilyId = new Map(
          checklists.map(({ familyId, checklist }) => [familyId, checklist])
        );

        return selectedStudents.map(sheet => {
          const checklist = sheet.family._id ? checklistsByFamilyId.get(sheet.family._id) : undefined;
          return checklist
            ? { ...sheet, family: { ...sheet.family, checklist } }
            : sheet;
        });
      })
    );
  }

  private selectedChecklistStudents(
    selections: { family: Family; selectedStudentIndexes: number[] }[]
  ): SelectedChecklistStudentsResult {
    const selectedStudents: PrintableChecklistStudent[] = [];
    const missingSelections: MissingSelection[] = [];

    for (const selection of selections) {
      for (const index of selection.selectedStudentIndexes) {
        const student = selection.family.students?.[index];
        if (student) {
          selectedStudents.push({
            family: selection.family,
            student,
            studentIndex: index
          });
        } else {
          missingSelections.push({
            family: selection.family,
            studentIndex: index
          });
        }
      }
    }

    return { selectedStudents, missingSelections };
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

  private writeChecklistPrintDocument(popup: Window, sheets: PrintableChecklistStudent[]): void {
    popup.document.open();
    popup.document.write(this.buildChecklistPrintDocument(sheets));
    popup.document.close();
    popup.focus();
  }

  private buildChecklistPreparingDocument(): string {
    return this.buildChecklistMessageDocument(
      'Preparing Student Checklists',
      'Preparing student checklists...'
    );
  }

  private writeChecklistErrorDocument(popup: Window): void {
    popup.document.open();
    popup.document.write(this.buildChecklistMessageDocument(
      'Student Checklist Error',
      'Unable to prepare printable checklists right now.'
    ));
    popup.document.close();
  }

  private buildChecklistMessageDocument(title: string, message: string): string {
    return `
      <!doctype html>
      <html>
        <head>
          <title>${this.escapeHtml(title)}</title>
        </head>
        <body>
          <p>${this.escapeHtml(message)}</p>
        </body>
      </html>
    `;
  }

  private buildChecklistPrintPages(sheets: PrintableChecklistStudent[]): string {
    return sheets.map(sheet => `
      <main class="page">
      ${this.buildChecklistHalfSheet(sheet)}
      </main>
    `).join('');
  }

  private buildChecklistHalfSheet(sheet: PrintableChecklistStudent): string {
    const { family, student } = sheet;
    const checklistSection = this.checklistSectionForStudent(sheet);
    const checklistItems = this.validChecklistItems(checklistSection?.items);
    const notGivenItems = this.validChecklistItems(checklistSection?.notGivenItems);

    return `
      <section class="half">
        <header class="sheet-header">
          <h1>Student Supply Checklist</h1>
          <div class="meta-row">
            <span class="meta-field meta-wide"><b>Student:</b> ${this.printValue(student.name)}</span>
            <span class="meta-field meta-wide"><b>Family Guardian:</b> ${this.printValue(family.guardianName)}</span>
            <span class="meta-field"><b>Date:</b> <span class="line"></span></span>
          </div>
          <div class="meta-row">
            <span class="meta-field meta-wide"><b>School:</b> ${this.printValue(student.school)}</span>
            <span class="meta-field"><b>Grade:</b> ${this.printValue(student.grade)}</span>
            <span class="meta-field meta-wide"><b>Teacher:</b> ${this.printValue(student.teacher)}</span>
          </div>
        </header>
        <div class="sheet-rule"></div>
        <div class="cols">
          ${this.buildChecklistColumns(checklistItems)}
        </div>
        ${this.buildChecklistFooterBox(notGivenItems)}
      </section>
    `;
  }

  private checklistSectionForStudent({ family, studentIndex }: PrintableChecklistStudent): ChecklistSection | undefined {
    const sections = family.checklist?.sections ?? [];
    const sectionId = `student-${studentIndex + 1}`;

    return sections.find(section => section.id === sectionId)
      ?? sections[studentIndex];
  }

  private validChecklistItems(items: ChecklistItem[] | null | undefined): ChecklistItem[] {
    return items?.filter(Boolean) ?? [];
  }

  private buildChecklistFooterBox(notGivenItems: ChecklistItem[]): string {
    return `
      <footer class="not-given-footer-box">
        <div class="footer-title">Not Given At Drive</div>
        <span class="footer-empty-line"></span>
        <div class="footer-items">
          ${notGivenItems.map(item => this.buildFooterItem(item)).join('')}
        </div>
      </footer>
    `;
  }

  private buildFooterItem(item: ChecklistItem): string {
    return `
      <div class="footer-item">
        ${this.printValue(item.label)}
      </div>
    `;
  }

  private buildChecklistColumns(items: ChecklistItem[]): string {
    const rowLabels = items.map(item => item.label);
    while (rowLabels.length < PointOfSaleComponent.minimumPrintBodyRows) {
      rowLabels.push('');
    }

    const midpoint = Math.ceil(rowLabels.length / 2);

    return `
      ${this.buildChecklistColumn(rowLabels.slice(0, midpoint))}
      ${this.buildChecklistColumn(rowLabels.slice(midpoint))}
    `;
  }

  private buildChecklistColumn(rowLabels: string[]): string {
    const rows = rowLabels.map(label => this.buildChecklistItemRow(label)).join('');

    return `
      <div class="list">
        ${rows}
      </div>
    `;
  }

  private buildChecklistItemRow(neededItem: string): string {
    return `
      <div class="item">
        <div class="item-copy">
          <div class="needed-row"><b>Need:</b> ${this.printValue(neededItem)}</div>
          <div class="give-row"><b>Give:</b> <span class="line"></span></div>
        </div>
        <div class="check-options">
          <span>Y <span class="check-box">[ ]</span></span>
          <span>N <span class="check-box">[ ]</span></span>
          <span>S <span class="check-box">[ ]</span></span>
        </div>
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
        width: 8.5in;
        height: 11in;
        margin: 0 auto 12px;
        padding: .2in;
        background: white;
        break-after: page;
      }

      .half {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr) auto;
        height: 100%;
        overflow: hidden;
        padding: .06in 0;
      }

      h1 {
        margin: 0 0 .04in;
        font-size: 12px;
      }

      .sheet-header {
        font-size: 8px;
      }

      .meta-row {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(.9in, .8fr);
        gap: .12in;
        margin: .03in 0;
      }

      .meta-field {
        display: flex;
        align-items: flex-end;
        gap: .03in;
        min-width: 0;
        white-space: nowrap;
      }

      .meta-wide {
        min-width: 0;
      }

      .meta-field .line {
        flex: 1 1 auto;
        width: auto;
        min-width: .55in;
      }

      .sheet-rule {
        border-top: 1px solid #333;
        margin: .05in 0 .04in;
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
        min-height: 0;
      }

      .list {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-width: 0;
        min-height: 0;
        font-size: 6.8px;
      }

      .item {
        display: grid;
        flex: 1 1 0;
        grid-template-columns: minmax(0, 1fr) auto;
        column-gap: .06in;
        min-height: 0;
        align-items: center;
        border-bottom: 1px solid #ccc;
      }

      .item > * {
        min-width: 0;
        padding: .02in .04in;
      }

      .item-copy {
        min-width: 0;
      }

      .needed-row,
      .give-row {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        line-height: 1.15;
      }

      .needed-row b,
      .give-row b {
        font-weight: 700;
      }

      .give-row {
        display: flex;
        align-items: flex-end;
        gap: .03in;
      }

      .give-row .line {
        flex: 1 1 auto;
        width: auto;
        min-width: .6in;
      }

      .check-options {
        display: flex;
        align-items: center;
        gap: .035in;
        white-space: nowrap;
        font-size: 6.4px;
      }

      .check-box {
        text-align: center;
        font-size: 7.6px;
        font-weight: 800;
      }

      .not-given-footer-box {
        border: 1px solid #333;
        margin-top: .05in;
        padding: .04in .06in;
        font-size: 7px;
      }

      .footer-title {
        font-weight: bold;
        margin-bottom: .03in;
      }

      .footer-empty-line {
        display: block;
        border-bottom: 1px solid #333;
        min-height: .1in;
      }

      .footer-items {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: .02in .12in;
        margin-top: .03in;
      }

      .footer-item {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        border-bottom: 1px solid #ccc;
        line-height: 1.2;
        min-height: .14in;
      }

      .footer-item .line {
        display: block;
        width: 100%;
      }

      @media print {
        body { background: white; }

        button { display: none; }

        .page { margin: 0; }
      }
    `;
  }

  private printValue(text?: string | null): string {
    const trimmed = text?.trim();
    return trimmed && trimmed.toLowerCase() !== 'n/a'
      ? this.escapeHtml(trimmed)
      : '<span class="line"></span>';
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
  }
}
