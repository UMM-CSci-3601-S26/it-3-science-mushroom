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
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';

// RxJS Imports
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

// Family Imports
import { Family, SelectOption } from './family';
import { FamilyCardComponent } from './family-card.component';
import { FamilyService } from './family.service';
import { DashboardStats } from '../family/family';

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
    MatPaginatorModule
  ],
})

export class FamilyListComponent {
  private familyService = inject(FamilyService);
  private snackBar = inject(MatSnackBar);

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
    const data = this.serverFilteredFamilies();
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
}
