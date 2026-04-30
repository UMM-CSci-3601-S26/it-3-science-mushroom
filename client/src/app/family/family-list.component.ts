// Angular Imports
import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule, MatCard, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// RxJS Imports
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

// Family Imports
import { Family, SelectOption } from './family';
import { FamilyCardComponent } from './family-card.component';
import { FamilyService } from './family.service';
import { DashboardStats } from '../family/family';

import { AuthService } from '../auth/auth-service';
import { DeleteFamilyRequestDialogComponent, DeleteFamilyRequestDialogResult } from './family-management/delete-family/delete-family-request-dialog.component';

@Component({
  selector: 'app-family',
  templateUrl: './family-list.component.html',
  styleUrl: './family-list.component.scss',
  providers: [
    { provide: MatPaginatorIntl, useFactory: () => {
      const intl = new MatPaginatorIntl();
      intl.itemsPerPageLabel = 'Families per page:';
      return intl;
    }}
  ],
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatOptionModule,
    MatRadioModule,
    FamilyCardComponent,
    MatListModule,
    RouterLink,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    CommonModule,
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatAutocompleteModule,
    MatDialogModule,
    MatSnackBarModule,
    MatPaginatorModule
  ],
})

export class FamilyListComponent {
  private familyService = inject(FamilyService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  get canExportFamilies(): boolean {
    return this.authService.hasPermission('export_families_csv');
  }

  get canAddFamily(): boolean {
    return this.authService.hasPermission('add_family');
  }

  get canEditFamily(): boolean {
    return this.authService.hasPermission('edit_family');
  }

  get canRequestFamilyDelete(): boolean {
    return this.authService.hasPermission('request_family_delete');
  }

  guardianName = signal<string | undefined>(undefined);
  errMsg = signal<string | undefined>(undefined);
  showOptionsMenu = signal<boolean>(false);

  families = toSignal <Family[]>(
    this.familyService.getFamilies().pipe(
      catchError(() => of([]))
    )
  );

  dashboardStats = toSignal <DashboardStats | undefined>(
    this.familyService.getDashboardStats().pipe(
      catchError(() => of(undefined))
    )
  );

  gradeSort = (a: { key: string }, b: { key: string }) => {
    // PreK comes first
    if (a.key === 'PreK' && b.key === 'PreK') return 0;
    if (a.key === 'PreK') return -1;
    if (b.key === 'PreK') return 1;

    // Kindergarten comes second
    if (a.key === 'Kindergarten' && b.key === 'Kindergarten') return 0;
    if (a.key === 'Kindergarten') return -1;
    if (b.key === 'Kindergarten') return 1;

    // Numeric grades
    return Number(a.key) - Number(b.key);
  };

  private filterOptions(options: SelectOption[], input:string): SelectOption[] {
    if (!input) return options;
    const lower = input.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(lower)||
        option.value.toLowerCase().includes(lower)
    )
  }

  linkStatusFilter = signal<'all' | 'linked' | 'manual'>('all');

  private filterByLinkStatus(families: Family[]): Family[] {
    const status = this.linkStatusFilter();
    if (status === 'all') {
      return families;
    }

    return families.filter(family => {
      const hasLinkedGuardian = !!family.ownerUserId?.trim();
      return status === 'linked' ? hasLinkedGuardian : !hasLinkedGuardian;
    });
  }

  get filteredFamilies(): Family[] {
    return this.filterByLinkStatus(this.serverFilteredFamilies() ?? []);
  }

  clearFamilyFilters() {
    this.linkStatusFilter.set('all');
    this.guardianName.set(undefined);
    this.pageNum.set(0);
  }

  filteredFamilyOptions = computed(() =>
    this.filterOptions(this.familyService.familyOptions(), (this.guardianName() || '').toLowerCase())
  );

  private guardianName$ = toObservable(this.guardianName);

  serverFilteredFamilies =
    toSignal(
      combineLatest([
        this.guardianName$,
      ]).pipe(
        switchMap(([ guardianName ]) =>
          this.familyService.getFamilies({
            guardianName
          })
        ),

        catchError((err) => {
          if (!(err.error instanceof ErrorEvent)) {
            this.errMsg.set(
              `Problem contacting the server - Error Code: ${err.status}\nMessage: ${err.message}`
            );
          }
          this.snackBar.open(this.errMsg(), 'OK', { duration: 6000 });
          return of<Family[]>([]);
        }),
        tap(() => {
          // empty
        })
      )
    );

  pageNum = signal(0);
  pageSize = signal(8);

  familiesPerPage = computed(() => {
    const data = this.filteredFamilies;
    const initialSetup = this.pageNum() * this.pageSize();
    return data.slice(initialSetup, initialSetup + this.pageSize());
  });

  pageChange(event: PageEvent) {
    this.pageNum.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  toggleOptionsMenu() {
    this.showOptionsMenu.update(value => !value);
  }

  downloadCSV() {
    this.familyService.exportFamilies().subscribe(csvData => {
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'families.csv';
      a.click();

      window.URL.revokeObjectURL(url);
      this.showOptionsMenu.set(false);
    });
  }

  downloadPDF() {
    // Reload family data to ensure the PDF has the most up-to-date information
    this.familyService.getFamilies().subscribe({
      next: () => {
        this.familyService.generatePDF();
        this.showOptionsMenu.set(false);
      },
      error: (err) => {
        if (!(err.error instanceof ErrorEvent)) {
          this.errMsg.set(
            `Problem contacting the server - Error Code: ${err.status}\nMessage: ${err.message}`
          );
        }
        this.snackBar.open(this.errMsg(), 'OK', { duration: 6000 });
      }
    });
  }

  submitDeleteRequest(family: Family) {
    if (!this.canRequestFamilyDelete || !family._id) {
      return;
    }

    const dialogRef = this.dialog.open(DeleteFamilyRequestDialogComponent, {
      width: '520px',
      data: { guardianName: family.guardianName }
    });

    dialogRef.afterClosed().subscribe((result: DeleteFamilyRequestDialogResult | undefined) => {
      if (!result?.message?.trim()) {
        return;
      }

      this.familyService.requestFamilyDelete(family._id!, result.message.trim()).subscribe({
        next: () => {
          if (!family.deleteRequest) {
            family.deleteRequest = { requested: true };
          }
          family.deleteRequest.requested = true;
          family.deleteRequest.message = result.message.trim();
          this.snackBar.open('Delete request submitted for admin review.', 'Close', { duration: 2500 });
        },
        error: error => {
          this.snackBar.open(
            error.error?.message || 'Unable to submit delete request right now. Please try again.',
            'Close',
            { duration: 3500 }
          );
        }
      });
    });
  }
}
