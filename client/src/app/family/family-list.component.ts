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

// Auth Imports
import { AuthService } from '../auth/auth-service';
import { DeleteFamilyRequestDialogComponent, DeleteFamilyRequestDialogResult } from './family-management/delete-family/delete-family-request-dialog.component';

/**
 * FamilyListComponent is responsible for displaying a paginated list of families,
 * along with filtering options and actions such as exporting data and requesting family deletion.
 * It interacts with FamilyService to fetch family data and dashboard statistics,
 * and uses AuthService to determine user permissions for various actions.
 * The component also handles error scenarios gracefully by displaying appropriate messages using MatSnackBar.
 */
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

  get canUseFamilyOptionsMenu() : boolean {
    return this.canAddFamily || this.canExportFamilies;
  }

  /**
   * The component uses several signals to manage state related to family data, filtering options,
   * pagination, and error messages.
   * - guardianName: Tracks the current input for filtering families by guardian name.
   * - errMsg: Stores error messages to be displayed in case of server communication issues.
   * - showOptionsMenu: Controls the visibility of the options menu for exporting data.
   * - compactView: Controls the compact view effect with a signal.
   */
  guardianName = signal<string | undefined>(undefined);
  errMsg = signal<string | undefined>(undefined);
  showOptionsMenu = signal<boolean>(false);
  readonly compactView = signal(false);

  /**
   * families signal is populated by fetching family data from the server using FamilyService.
   */
  families = toSignal <Family[]>(
    this.familyService.getFamilies().pipe(
      catchError(() => of([]))
    )
  );

  /**
   * dashboardStats signal fetches summary statistics for the dashboard, such as students per school and grade,
   * total families, and total students. It handles errors by returning undefined if the server request fails.
   */
  dashboardStats = toSignal <DashboardStats | undefined>(
    this.familyService.getDashboardStats().pipe(
      catchError(() => of(undefined))
    )
  );

  /**
   * Sorts families by grade, with PreK coming first and Kindergarten coming second.
   * @param a the first grade to compare
   * @param b the second grade to compare
   * @returns a negative number if a should come before b, a positive number if b should come before a,
   *  or 0 if they are equal
   */
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

  /**
   * Filters the given options based on the input string. It performs a case-insensitive search on both the label and value of each option.
   * If the input is empty or undefined, it returns the original list of options.
   * @param options the list of options to filter
   * @param input the input string to filter by
   * @returns a filtered list of options that match the input string
   */
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

  /**
   * filteredFamilyOptions is a computed signal that provides a filtered list of family options based on the current value of guardianName.
   * It uses the filterOptions method to perform the filtering, allowing for dynamic updates to the options as the guardianName input changes.
   * This is typically used for an autocomplete or dropdown filter in the UI to help users find families by guardian name more easily.
   */
  filteredFamilyOptions = computed(() =>
    this.filterOptions(this.familyService.familyOptions(), (this.guardianName() || '').toLowerCase())
  );

  /**
   * guardianName$ is an observable that emits the current value of the guardianName signal.
   * It is used to trigger server-side filtering of families whenever the guardianName changes.
   * The serverFilteredFamilies signal listens to changes in guardianName$ and makes a request to the server to fetch families that match the current guardian name filter.
   */
  private guardianName$ = toObservable(this.guardianName);

  /**
   * serverFilteredFamilies is a signal that holds the list of families fetched from the server based on the current guardianName filter.
   * It combines the guardianName$ observable with a switchMap to make a request to the server for families that match the guardian name.
   * If there is an error during the server request, it catches the error, sets an appropriate error message, and returns an empty list of families.
   */
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

    if(!this.canUseFamilyOptionsMenu) {
      return
    }
    this.showOptionsMenu.update(value => !value);
  }

  downloadCSV() {
    if (!this.canUseFamilyOptionsMenu) {
      return
    }
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
