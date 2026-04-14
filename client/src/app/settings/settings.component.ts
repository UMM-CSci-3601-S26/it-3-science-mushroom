// Angular and Material Imports
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';

// RxJS Imports
import { forkJoin } from 'rxjs';

// Settings Service and Type Imports
import { SettingsService } from './settings.service';
import { SchoolInfo, SupplyItemOrder, TimeAvailabilityLabels } from './settings';

// Terms Imports
import { TermsService } from '../terms/terms.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    DragDropModule,
  ]
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private termsService = inject(TermsService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  // Current schools list, loaded from the server on init
  schools: SchoolInfo[] = [];

  // Form for adding a new school entry
  addSchoolForm = new FormGroup({
    name: new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ]))
  });

  // Form for setting clock-time labels for each availability slot
  timeAvailabilityForm = new FormGroup({
    earlyMorning: new FormControl('', Validators.required),
    lateMorning: new FormControl('', Validators.required),
    earlyAfternoon: new FormControl('', Validators.required),
    lateAfternoon: new FormControl('', Validators.required),
  });

  // Drive Order: three buckets of item terms (e.g. "notebook", "folder")
  stagedTerms: string[] = [];    // included in the drive, checklist order matches this list
  unstagedTerms: string[] = []; // included in the drive, appended after staged items
  notGivenTerms: string[] = []; // excluded from checklists entirely

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe(settings => {
      this.schools = settings.schools ?? [];
      if (settings.timeAvailability) {
        this.timeAvailabilityForm.patchValue(settings.timeAvailability);
      }
    });

    this.loadDriveOrder();
  }

  // Loads the drive order from the server and populates the three term lists accordingly
  private loadDriveOrder(): void {
    // Load both the full list of item terms and the saved supply order from the server in parallel
    forkJoin({
      terms: this.termsService.getTerms(),
      settings: this.settingsService.getSettings()
    }).subscribe(({ terms, settings }) => {
      const allTerms: string[] = terms.item ?? [];
      const savedOrder: SupplyItemOrder[] = settings.supplyOrder ?? [];

      // Restore staged order from saved list (skip any terms no longer in the database)
      const stagedTermSet = new Set(
        savedOrder.filter(o => o.status === 'staged').map(o => o.itemTerm));
      const notGivenTermSet = new Set(
        savedOrder.filter(o => o.status === 'notGiven').map(o => o.itemTerm));

      // Staged: in the order saved on the server, but only if the term still exists in the database
      this.stagedTerms = savedOrder
        .filter(o => o.status === 'staged' && allTerms.includes(o.itemTerm))
        .map(o => o.itemTerm);

      // Not Given: sorted alphabetically
      this.notGivenTerms = allTerms
        .filter(t => notGivenTermSet.has(t))
        .sort((a, b) => a.localeCompare(b));

      // Unstaged: every term not yet assigned — sorted alphabetically
      this.unstagedTerms = allTerms
        .filter(t => !stagedTermSet.has(t) && !notGivenTermSet.has(t))
        .sort((a, b) => a.localeCompare(b));
    });
  }

  // Move a term from its current list into Staged (appended at end)
  moveToStaged(term: string): void {
    this.unstagedTerms = this.unstagedTerms.filter(t => t !== term);
    this.notGivenTerms = this.notGivenTerms.filter(t => t !== term);
    this.stagedTerms = [...this.stagedTerms, term];
  }

  // Move a term to Unstaged
  moveToUnstaged(term: string): void {
    this.stagedTerms = this.stagedTerms.filter(t => t !== term);
    this.notGivenTerms = this.notGivenTerms.filter(t => t !== term);
    this.unstagedTerms = [...this.unstagedTerms, term].sort((a, b) => a.localeCompare(b));
  }

  // Mark a term as Not Given (all supplies with this item excluded from checklists)
  moveToNotGiven(term: string): void {
    this.stagedTerms = this.stagedTerms.filter(t => t !== term);
    this.unstagedTerms = this.unstagedTerms.filter(t => t !== term);
    this.notGivenTerms = [...this.notGivenTerms, term].sort((a, b) => a.localeCompare(b));
  }

  // CDK drag-drop handler for reordering the staged list
  dropStaged(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.stagedTerms, event.previousIndex, event.currentIndex);
  }

  // Persists the full drive order to the server
  saveSupplyOrder(): void {
    const order: SupplyItemOrder[] = [
      ...this.stagedTerms.map(t => ({ itemTerm: t, status: 'staged' as const })),
      ...this.unstagedTerms.map(t => ({ itemTerm: t, status: 'unstaged' as const })),
      ...this.notGivenTerms.map(t => ({ itemTerm: t, status: 'notGiven' as const })),
    ];
    this.settingsService.updateSupplyOrder(order).subscribe({
      next: () => this.snackBar.open('Drive order saved', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to save drive order', 'OK', { duration: 3000 })
    });
  }

  // Adds a school to the list and immediately persists to the server
  addSchool(): void {
    if (this.addSchoolForm.valid) {
      this.schools = [...this.schools, { name: this.addSchoolForm.value.name! }];
      this.saveSchools();
      this.addSchoolForm.reset();
    }
  }

  // Removes a school at the given index and immediately persists to the server
  removeSchool(index: number): void {
    this.schools = this.schools.filter((_, i) => i !== index);
    this.saveSchools();
  }

  private saveSchools(): void {
    this.settingsService.updateSchools(this.schools).subscribe({
      next: () => this.snackBar.open('Schools saved', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to save schools', 'OK', { duration: 3000 })
    });
  }

  // Saves the drive order then navigates to the checklist page to regenerate checklists
  saveAndGenerateChecklists(): void {
    const order: SupplyItemOrder[] = [
      ...this.stagedTerms.map(t => ({ itemTerm: t, status: 'staged' as const })),
      ...this.unstagedTerms.map(t => ({ itemTerm: t, status: 'unstaged' as const })),
      ...this.notGivenTerms.map(t => ({ itemTerm: t, status: 'notGiven' as const })),
    ];
    this.settingsService.updateSupplyOrder(order).subscribe({
      next: () => this.router.navigate(['/checklists'], { queryParams: { generate: 'true' } }),
      error: () => this.snackBar.open('Failed to save drive order', 'OK', { duration: 3000 })
    });
  }

  // Persists the time availability labels when the operator clicks Save
  saveTimeAvailability(): void {
    if (this.timeAvailabilityForm.valid) {
      this.settingsService.updateTimeAvailability(
        this.timeAvailabilityForm.value as TimeAvailabilityLabels
      ).subscribe({
        next: () => this.snackBar.open('Time availability saved', 'OK', { duration: 2000 }),
        error: () => this.snackBar.open('Failed to save time availability', 'OK', { duration: 3000 })
      });
    }
  }
}
