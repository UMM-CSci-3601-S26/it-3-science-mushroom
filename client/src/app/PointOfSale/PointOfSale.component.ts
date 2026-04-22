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
import { Subject, catchError, combineLatest, debounceTime, distinctUntilChanged, of, startWith, switchMap, tap } from 'rxjs';

import { Family } from '../family/family';
import { FamilyService } from '../family/family.service';
import { PointOfSaleFamilyCardComponent } from './point-of-sale-family-card.component';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

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
    ReactiveFormsModule,
    PointOfSaleFamilyCardComponent
  ],
  templateUrl: './PointOfSale.html',
  styleUrls: ['./PointOfSale.scss']
})
export class PointOfSaleComponent implements OnInit {
  private familyService = inject(FamilyService);
  private dialog = inject(MatDialog);
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
    combineLatest([
      this.familySearch.valueChanges.pipe(startWith(this.familySearch.value)),
      this.statusFilter.valueChanges.pipe(startWith(this.statusFilter.value)),
      this.familyRefresh.pipe(startWith(0))
    ]).pipe(
      debounceTime(250),
      distinctUntilChanged((previous, current) =>
        previous[0] === current[0] && previous[1] === current[1] && previous[2] === current[2]),
      tap(() => {
        this.loadingFamilies = true;
        this.familyLoadError = '';
      }),
      switchMap(([searchTerm, status]) => this.familyService.getFamilies({
        guardianName: searchTerm.trim(),
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
      if (result?.cleared || result?.draftSaved || result?.completed) {
        this.familyRefresh.next(Date.now());
      }
    });
  }
}
