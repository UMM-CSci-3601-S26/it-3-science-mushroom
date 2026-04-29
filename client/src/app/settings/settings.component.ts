// Angular and Material Imports
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
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

// Family Imports
import { FamilyService } from '../family/family.service';

// Terms Imports
import { TermsService } from '../terms/terms.service';

// Inventory Imports
import { InventoryService } from '../inventory/inventory.service';

// Dialog Imports
import { DialogService } from '../dialog/dialog.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
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
  private inventoryService = inject(InventoryService);
  private dialogService = inject(DialogService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private familyService = inject(FamilyService);

  readonly itemOptions = this.inventoryService.itemOptions;
  readonly brandOptions = this.inventoryService.brandOptions;
  readonly colorOptions = this.inventoryService.colorOptions;
  readonly sizeOptions = this.inventoryService.sizeOptions;
  readonly typeOptions = this.inventoryService.typeOptions;
  readonly materialOptions = this.inventoryService.materialOptions;

  // Current schools list, loaded from the server on init
  schools: SchoolInfo[] = [];

  // Form for adding a new school entry
  addSchoolForm = new FormGroup({
    name: new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ])),
    abbreviation: new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(6),
    ]))
  });

  // Form for setting clock-time labels for each availability slot
  timeAvailabilityForm = new FormGroup({
    earlyMorning: new FormControl('', Validators.required),
    lateMorning: new FormControl('', Validators.required),
    earlyAfternoon: new FormControl('', Validators.required),
    lateAfternoon: new FormControl('', Validators.required),
  });

  availableSpotsForm = new FormGroup({
    availableSpots: new FormControl<number>(5, [Validators.required, Validators.min(1)])
  })

  inventoryFilterForm = new FormGroup({
    item: new FormControl(''),
    brand: new FormControl(''),
    color: new FormControl(''),
    size: new FormControl(''),
    type: new FormControl(''),
    material: new FormControl(''),
  });

  barcodePrintForm = new FormGroup({
    barcodePrintWarningLimit: new FormControl<number>(25, [Validators.required, Validators.min(1)])
  });
  // Drive Order: three buckets of item terms (e.g. "notebook", "folder")
  stagedTerms: string[] = [];    // included in the drive, checklist order matches this list
  unstagedTerms: string[] = []; // included in the drive, appended after staged items
  notGivenTerms: string[] = []; // excluded from checklists entirely

  //loads values from backend
  ngOnInit(): void {
    this.settingsService.getSettings().subscribe(settings => {
      this.schools = settings.schools ?? [];
      if (settings.timeAvailability) {
        this.timeAvailabilityForm.patchValue(settings.timeAvailability);
      }
      this.availableSpotsForm.patchValue({ availableSpots: settings.availableSpots});
      this.barcodePrintForm.patchValue({
        barcodePrintWarningLimit: settings.barcodePrintWarningLimit ?? 25
      });
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
      this.schools = [...this.schools, { name: this.addSchoolForm.value.name!, abbreviation: this.addSchoolForm.value.abbreviation! }];
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
      next: () => {
        this.router.navigate(['/checklists'], { queryParams: { generate: 'true' } });
        this.snackBar.open('Successfully generated checklist', 'OK', { duration: 2000 })
      },
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

  saveAvailableSpots(): void {
    if (this.availableSpotsForm.valid) {
      this.settingsService.updateAvailableSpots(
        this.availableSpotsForm.value as number
      ).subscribe({
        next: () => {
          const availableSpots = this.availableSpotsForm.value.availableSpots;
          console.log('Updated spots:', availableSpots);
          this.snackBar.open(`Available spots setting saved: ${availableSpots}`, 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to save available spots', 'OK', { duration: 3000 })
      });
    }
  }

  clearInventoryTargetFilters(): void {
    this.inventoryFilterForm.reset({
      item: '',
      brand: '',
      color: '',
      size: '',
      type: '',
      material: '',
    });
  }

  private getInventoryTargetFilters(): { item?: string; brand?: string; color?: string; size?: string; type?: string; material?: string } {
    const values = this.inventoryFilterForm.value;
    const filters: { item?: string; brand?: string; color?: string; size?: string; type?: string; material?: string } = {};

    (['item', 'brand', 'color', 'size', 'type', 'material'] as const).forEach(key => {
      const value = (values[key] ?? '').trim();
      if (value) {
        filters[key] = value;
      }
    });

    return filters;
  }

  /**
   * Resets quantity to 0 for all matching inventory items.
   */
  resetMatchingQuantities(): void {
    const filters = this.getInventoryTargetFilters();

    if (Object.keys(filters).length === 0) {
      this.snackBar.open('Enter at least one inventory field to target specific items.', 'OK', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialogService.openDialog({
      title: 'Confirm Reset Matching Quantities',
      message: 'Are you sure you want to reset quantities for all matching inventory items?',
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm',
    }, '420px', '220px');

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }

      this.snackBar.open('Resetting matching inventory items...', 'OK', { duration: 1500 });

      this.inventoryService.resetMatchingQuantities(filters).subscribe({
        next: response => {
          this.snackBar.open(response.message, 'OK', { duration: 3000 });
        },
        error: (err) => {
          console.error('inventory reset matching quantities failed', err);
          this.snackBar.open('Failed to reset matching quantities.', 'OK', { duration: 4000 });
        }
      });
    });
  }

  /**
   * Deletes all matching inventory items.
   */
  deleteMatchingInventory(): void {
    const filters = this.getInventoryTargetFilters();

    if (Object.keys(filters).length === 0) {
      this.snackBar.open('Enter at least one inventory field to target specific items.', 'OK', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialogService.openDialog({
      title: 'Confirm Delete Matching Inventory',
      message: 'Are you sure you want to delete all matching inventory items?',
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm',
    }, '420px', '220px');

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }

      this.snackBar.open('Deleting matching inventory items...', 'OK', { duration: 1500 });

      this.inventoryService.deleteInventories(filters).subscribe({
        next: response => {
          this.snackBar.open(response.message, 'OK', { duration: 3000 });
        },
        error: (err) => {
          console.error('inventory delete matching items failed', err);
          this.snackBar.open('Failed to delete matching inventory items.', 'OK', { duration: 4000 });
        }
      });
    });
  }

  /**
   * Clears inventory entirely. Confirms with dialog-service first. Uses inventory service for logic.
   */
  clearInventory(): void {
    const dialogRef = this.dialogService.openDialog({
      title: 'Confirm Clear Inventory',
      message: `Are you sure you want to delete all inventory items?`,
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm',
    }, '400px', '200px');

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.inventoryService) return;
        this.snackBar.open(
          `Clearing inventory...`,
          `Okay`,
          { duration: 2000 }
        );

        this.inventoryService.clearInventory().subscribe({
          next: () => {
            this.snackBar.open(`Cleared inventory.`, 'OK', {
              duration: 3000
            });
          },
          error: (err) => {
            console.error('inventory clear failed', err);
            this.snackBar.open('Failed to clear inventory.', 'OK', { duration: 4000 });
          }
        });
      }
    });
  }

  /**
   * Resets quantity of all items to 0. Confirms with dialog-service first. Uses inventory service for logic.
   */
  resetAllQuantities(): void {
    const dialogRef = this.dialogService.openDialog({
      title: 'Confirm Reset Quantities',
      message: `Are you sure you want to reset quantities for all inventory items?`,
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm',
    }, '400px', '200px');

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.inventoryService) return;
        this.snackBar.open(
          `Resetting quantities...`,
          `Okay`,
          { duration: 2000 }
        );

        this.inventoryService.resetAllQuantities().subscribe({
          next: () => {
            this.snackBar.open(`Quantities reset.`, 'OK', {
              duration: 3000
            });
          },
          error: (err) => {
            console.error('inventory reset failed', err);
            this.snackBar.open('Failed to reset quantities.', 'OK', { duration: 4000 });
          }
        });
  scheduleFamilies(): void {
    this.settingsService.updateAvailableSpots(this.availableSpotsForm.value as number).subscribe({
      next: () => {
        this.familyService.scheduleFamilies().subscribe({
          next: () => {
            this.router.navigate(['/family']);
            this.snackBar.open('Families scheduled' , 'OK', {duration: 2000});
          },
          error: (err) => {
            console.error('Schedule families error:', err);
            console.log('Error content:', err.error);
            if (err.error.title === 'Not all families were able to be sorted, your event capacity may be too low') {
              this.snackBar.open('Your capacity is too low for the number of families', 'OK', {duration: 3000});
            } else {
              this.snackBar.open('Failed to schedule families', 'OK', {duration: 3000});
            }
          }
        })
      },
      error: () => {
        this.snackBar.open('Failed to update available spots', 'OK', { duration: 3000 });
      }
    });
  }

  saveBarcodePrintSettings(): void {
    if (this.barcodePrintForm.valid) {
      const warningLimit = this.barcodePrintForm.value.barcodePrintWarningLimit ?? 25;

      this.settingsService.updateBarcodePrintWarningLimit(warningLimit).subscribe({
        next: () => this.snackBar.open(`Barcode print warning limit saved: ${warningLimit}`, 'OK', { duration: 2000 }),
        error: () => this.snackBar.open('Failed to save barcode print settings', 'OK', { duration: 3000 })
      });
    }
  }
}
