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
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

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

  families: Family[] = [];
  familySearch = new FormControl('', { nonNullable: true });
  loadingFamilies = true;
  familyLoadError = '';

  ngOnInit(): void {
    this.familySearch.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      tap(() => {
        this.loadingFamilies = true;
        this.familyLoadError = '';
      }),
      switchMap(searchTerm => this.familyService.getFamilies({
        guardianName: searchTerm.trim()
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

    this.loadFamilies();
  }

  clearFamilySearch(): void {
    this.familySearch.setValue('');
  }

  private loadFamilies(): void {
    this.loadingFamilies = true;
    this.familyLoadError = '';
    this.familyService.getFamilies().subscribe({
      next: families => {
        this.families = families;
        this.loadingFamilies = false;
      },
      error: err => {
        console.error('Failed to load families', err);
        this.familyLoadError = 'Unable to load families right now.';
        this.loadingFamilies = false;
      }
    });
  }

  openHelpFamilySession(family: Family): void {
    this.dialog.open(PointOfSaleSessionDialogComponent, {
      data: { family },
      width: '760px',
      maxWidth: '92vw',
      maxHeight: '88vh'
    });
  }
}
