// Angular and Material Imports
import { Component, OnInit, inject, viewChild, signal, effect, computed } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { AuthService } from '../auth/auth-service';

// RxJS Imports
import { catchError, combineLatest, debounceTime, of, switchMap, forkJoin} from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

// Settings Service and Type Imports
import { SettingsService } from './settings.service';
import {
  DefaultScheduleColumns,
  DriveDay,
  SchoolInfo,
  SupplyItemOrder,
  TimeAvailabilityLabels
} from './settings';

// Terms Imports
import { TermsService } from '../terms/terms.service';

// Inventory Imports
import { InventoryService } from '../inventory/inventory.service';
//import { InventoryIndex } from '../inventory/inventory-index';
import { Inventory, SelectOption } from '../inventory/inventory';
import { SupplyListService } from '../supplylist/supplylist.service';
import { SupplyList } from '../supplylist/supplylist';
//import { InventoryComponent } from '../inventory/inventory.component';

// Dialog Imports
import { DialogService } from '../shared/dialog/dialog.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatCardModule,
    MatCheckboxModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    DragDropModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule
  ]
})
export class SettingsComponent implements OnInit {
  private static readonly timeSlotSeparator = /\s*[-\u2013\u2014]\s*/;
  private static readonly meridiemPattern = /(AM|PM)\s*$/i;

  // Services & Components
  private settingsService = inject(SettingsService);
  private termsService = inject(TermsService);
  private inventoryService = inject(InventoryService);
  private supplyListService = inject(SupplyListService);
  private dialogService = inject(DialogService);
  //private inventoryIndex = inject(InventoryIndex);
  //private inventoryComponent = inject(InventoryComponent);

  // Other
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  readonly settingsTabKeys = [
    'schools',
    'time-availability',
    'drive-day',
    'barcode-printing',
    'item-preferences',
    'drive-order',
    'inventory-management'
  ] as const;
  selectedSettingsTabIndex = 0;

  get canEditSchools(): boolean {
    return this.authService.hasPermission('edit_schools');
  }

  get canEditTimeAvailability(): boolean {
    return this.authService.hasPermission('edit_time_availability');
  }

  get canEditSupplyOrder(): boolean {
    return this.authService.hasPermission('edit_supply_order');
  }

  get canEditSupplyPreferences(): boolean {
    return this.authService.hasPermission('edit_supply_list');
  }

  get canEditDriveDay(): boolean {
    return this.authService.hasPermission('edit_drive_day');
  }

  get canEditBarcode(): boolean {
    return this.authService.hasPermission('edit_barcode_print_limit');
  }

  get canEditInventory(): boolean {
    return this.authService.hasPermission('edit_inventory_item');
  }

  // Options for filter dropdowns, built from inventory data
  readonly itemOptions = this.inventoryService.itemOptions;
  readonly brandOptions = this.inventoryService.brandOptions;
  readonly colorOptions = this.inventoryService.colorOptions;
  readonly sizeOptions = this.inventoryService.sizeOptions;
  readonly typeOptions = this.inventoryService.typeOptions;
  readonly materialOptions = this.inventoryService.materialOptions;

  displayedColumnsSimple: string[] = ['description', 'quantity', 'notes'];
  dataSource = new MatTableDataSource<Inventory>([]);
  readonly page = viewChild<MatPaginator>(MatPaginator)
  readonly sort = viewChild<MatSort>(MatSort);

  constructor() {
    effect(() => {
      const items = this.serverFilteredInventory();
      this.dataSource.data = items;
      this.dataSource.sort = this.sort();
      this.dataSource.paginator = this.page();
    });
  }

  errMsg = signal<string | undefined>(undefined);

  item = signal<string | undefined>(undefined);
  brand = signal<string | undefined>(undefined);
  color = signal<string | undefined>(undefined);
  size = signal<string | undefined>(undefined);
  type = signal<string | undefined>(undefined);
  material = signal<string | undefined>(undefined);
  description = signal<string | undefined>(undefined);
  quantity = signal<number | undefined>(undefined);
  reloadTrigger = signal(0);

  private filterOptions(options: SelectOption[], input: string): SelectOption[] {
    if (!input) return options;
    const lower = input.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(lower) ||
      option.value.toLowerCase().includes(lower)
    );
  }

  filteredItemOptions = computed(() =>
    this.filterOptions(this.itemOptions(), (this.item() || '').toLowerCase())
  );

  filteredBrandOptions = computed(() =>
    this.filterOptions(this.brandOptions(), (this.brand() || '').toLowerCase())
  );

  filteredColorOptions = computed(() =>
    this.filterOptions(this.colorOptions(), (this.color() || '').toLowerCase())
  );

  filteredSizeOptions = computed(() =>
    this.filterOptions(this.sizeOptions(), (this.size() || '').toLowerCase())
  );

  filteredTypeOptions = computed(() =>
    this.filterOptions(this.typeOptions(), (this.type() || '').toLowerCase())
  );

  filteredMaterialOptions = computed(() =>
    this.filterOptions(this.materialOptions(), (this.material() || '').toLowerCase())
  );

  private item$ = toObservable(this.item);
  private brand$ = toObservable(this.brand);
  private color$ = toObservable(this.color);
  private size$ = toObservable(this.size);
  private type$ = toObservable(this.type);
  private material$ = toObservable(this.material);
  private description$ = toObservable(this.description);
  private quantity$ = toObservable(this.quantity);
  private reloadTrigger$ = toObservable(this.reloadTrigger);

  serverFilteredInventory = toSignal(
    combineLatest([this.item$, this.brand$, this.color$, this.size$, this.type$, this.material$, this.description$, this.quantity$, this.reloadTrigger$]).pipe(
      debounceTime(300),
      switchMap(([ item, brand, color, size, type, material, description, quantity]) =>
        this.inventoryService.getInventory({ item, brand, color, size, type, material, description, quantity})
      ),
      catchError((err) => {
        let message = "Unknown Error";
        if (!(err.error instanceof ErrorEvent)) {
          message = `Problem contacting the server – Error Code: ${err.status}\nMessage: ${err.message}`;
          this.errMsg.set(message);
        }

        this.snackBar.open(message, 'OK', { duration: 6000 });
        return of<Inventory[]>([]);
      })
    ),
    { initialValue: [] }
  );

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
    earlyMorning: new FormControl('', [Validators.required, SettingsComponent.timeSlotValidator()]),
    lateMorning: new FormControl('', [Validators.required, SettingsComponent.timeSlotValidator()]),
    earlyAfternoon: new FormControl('', [Validators.required, SettingsComponent.timeSlotValidator()]),
    lateAfternoon: new FormControl('', [Validators.required, SettingsComponent.timeSlotValidator()]),
    englishFamilies: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
    spanishFamilies: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
  });

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

  // Form for setting drive-day announcement details shown in the family portal
  driveDayForm = new FormGroup({
    date: new FormControl('', Validators.required),
    location: new FormControl('')
  });

  // Drive Order: three buckets of item terms (e.g. "notebook", "folder")
  stagedTerms: string[] = [];    // included in the drive, checklist order matches this list
  unstagedTerms: string[] = []; // included in the drive, appended after staged items
  notGivenTerms: string[] = []; // excluded from checklists entirely

  supplyPreferenceRows = signal<SupplyList[]>([]);
  preferenceInventoryById = signal<Map<string, Inventory>>(new Map());
  loadingSupplyPreferences = signal(false);
  savingSupplyPreferenceIds = signal<Set<string>>(new Set());

  //loads values from backend
  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      const tabIndex = this.settingsTabKeys.indexOf(tab as typeof this.settingsTabKeys[number]);

      this.selectedSettingsTabIndex = tabIndex >= 0 ? tabIndex : 0;
    });

    this.settingsService.getSettings().subscribe(settings => {
      this.schools = settings.schools ?? [];
      if (settings.timeAvailability) {
        this.timeAvailabilityForm.patchValue(settings.timeAvailability);
      }

      if (settings.defaultScheduleColumns) {
        this.timeAvailabilityForm.patchValue(settings.defaultScheduleColumns);
      }

      if (settings.driveDay) {
        this.driveDayForm.patchValue({
          date: settings.driveDay.date,
          location: settings.driveDay.location ?? ''
        });
      }

      this.barcodePrintForm.patchValue({
        barcodePrintWarningLimit: settings.barcodePrintWarningLimit ?? 25
      });
    });

    this.loadDriveOrder();
    this.loadSupplyPreferences();
  }

  selectSettingsTab(index: number): void {
    if (index === this.selectedSettingsTabIndex) {
      return;
    }

    const tab = this.settingsTabKeys[index] ?? this.settingsTabKeys[0];
    this.selectedSettingsTabIndex = index;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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
      const availableTerms = this.uniqueTerms([
        ...allTerms,
        ...savedOrder.map(order => order.itemTerm)
      ]);

      const savedUnstagedTerms = this.termsWithStatus(savedOrder, 'unstaged');

      // Staged: in the order saved on the server.
      this.stagedTerms = this.termsWithStatus(savedOrder, 'staged');

      // Not Given: sorted alphabetically
      this.notGivenTerms = this.sortTerms(this.termsWithStatus(savedOrder, 'notGiven'));

      // Unstaged: every term not yet assigned — sorted alphabetically
      const assignedTerms = [
        ...this.stagedTerms,
        ...savedUnstagedTerms,
        ...this.notGivenTerms
      ];
      const newUnstagedTerms = availableTerms.filter(term => !this.hasTerm(assignedTerms, term));
      this.unstagedTerms = this.sortTerms([
        ...savedUnstagedTerms,
        ...newUnstagedTerms
      ]);
    });
  }

  private loadSupplyPreferences(): void {
    this.loadingSupplyPreferences.set(true);
    forkJoin({
      supplyLists: this.supplyListService.getSupplyList(),
      inventory: this.inventoryService.getInventory({})
    }).subscribe({
      next: ({ supplyLists, inventory }) => {
        const inventoryById = new Map<string, Inventory>();
        for (const item of inventory) {
          if (item.internalID) {
            inventoryById.set(item.internalID, item);
          }
        }

        const rows = supplyLists
          .filter(supplyList => this.linkedInventoryIds(supplyList).length > 0)
          .map(supplyList => ({
            ...supplyList,
            preferredInventoryIds: this.validPreferredInventoryIds(supplyList)
          }))
          .sort((left, right) => this.supplyPreferenceLabel(left).localeCompare(this.supplyPreferenceLabel(right)));

        this.preferenceInventoryById.set(inventoryById);
        this.supplyPreferenceRows.set(rows);
        this.loadingSupplyPreferences.set(false);
      },
      error: () => {
        this.loadingSupplyPreferences.set(false);
        this.snackBar.open('Failed to load item preferences', 'OK', { duration: 3000 });
      }
    });
  }

  linkedInventoryIds(supplyList: SupplyList): string[] {
    return this.uniqueStrings(supplyList.invIDs ?? []);
  }

  isPreferredInventory(supplyList: SupplyList, internalId: string): boolean {
    return this.validPreferredInventoryIds(supplyList).includes(internalId);
  }

  /**
   * Get internalId's rank in this supply list's preference order
   * @param supplyList Supply list to check
   * @param internalId Internal ID to get the rank for
   * @returns Preference rank, or null if it is not preferred
   */
  inventoryPreferenceRank(supplyList: SupplyList, internalId: string): number | null {
    const preferredIndex = this.validPreferredInventoryIds(supplyList).indexOf(internalId);
    return preferredIndex === -1 ? null : preferredIndex + 1;
  }

  /**
   * Build the label for a preference rank
   * @param rank Rank to show
   * @returns Label with ordinal suffix
   */
  inventoryPreferenceRankLabel(rank: number): string {
    return `${this.ordinal(rank)} preference`;
  }

  toggleInventoryPreference(supplyList: SupplyList, internalId: string, checked: boolean): void {
    this.supplyPreferenceRows.update(rows => rows.map(row => row._id === supplyList._id
      ? this.updatedPreferenceRow(row, internalId, checked)
      : row));
  }

  saveInventoryPreferences(supplyList: SupplyList): void {
    if (!this.canEditSupplyPreferences || this.savingSupplyPreferenceIds().has(supplyList._id)) {
      return;
    }

    this.savingSupplyPreferenceIds.update(ids => new Set(ids).add(supplyList._id));
    this.supplyListService.editSupplyList(supplyList._id, {
      ...supplyList,
      preferredInventoryIds: this.validPreferredInventoryIds(supplyList)
    }).subscribe({
      next: () => {
        this.finishSavingSupplyPreference(supplyList._id);
        this.snackBar.open('Item preference saved', 'OK', { duration: 2000 });
      },
      error: () => {
        this.finishSavingSupplyPreference(supplyList._id);
        this.snackBar.open('Failed to save item preference', 'OK', { duration: 3000 });
      }
    });
  }

  isSavingSupplyPreference(supplyListId: string): boolean {
    return this.savingSupplyPreferenceIds().has(supplyListId);
  }

  supplyPreferenceLabel(supplyList: SupplyList): string {
    const quantity = supplyList.quantity > 0 ? `${supplyList.quantity}x ` : '';
    return `${quantity}${supplyList.item.join(' / ')}`;
  }

  inventoryPreferenceLabel(internalId: string): string {
    const inventory = this.preferenceInventoryById().get(internalId);
    if (!inventory) {
      return internalId;
    }

    return inventory.description?.trim() || [inventory.color, inventory.type, inventory.item]
      .filter(value => !!value)
      .join(' ')
      || internalId;
  }

  private validPreferredInventoryIds(supplyList: SupplyList): string[] {
    const linkedIds = this.linkedInventoryIds(supplyList);
    const linkedIdSet = new Set(linkedIds);
    return this.uniqueStrings(supplyList.preferredInventoryIds ?? [])
      .filter(internalId => linkedIdSet.has(internalId));
  }

  /**
   * Update supplyList by adding or removing internalId based on checked
   * @param supplyList Supply list to update
   * @param internalId Internal ID to add or remove
   * @param checked Whether the item is selected
   * @returns Supply list with updated preferences
   */
  private updatedPreferenceRow(supplyList: SupplyList, internalId: string, checked: boolean): SupplyList {
    if (!this.linkedInventoryIds(supplyList).includes(internalId)) {
      return supplyList;
    }

    const preferredInventoryIds = this.validPreferredInventoryIds(supplyList);
    const updatedPreferredInventoryIds = checked
      ? [...preferredInventoryIds.filter(id => id !== internalId), internalId]
      : preferredInventoryIds.filter(id => id !== internalId);

    return {
      ...supplyList,
      preferredInventoryIds: updatedPreferredInventoryIds
    };
  }

  /**
   * Format value with an ordinal suffix
   * @param value Number to format
   * @returns Number with ordinal suffix
   */
  private ordinal(value: number): string {
    const remainder = value % 100;
    if (remainder >= 11 && remainder <= 13) {
      return `${value}th`;
    }

    switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
    }
  }

  private finishSavingSupplyPreference(supplyListId: string): void {
    this.savingSupplyPreferenceIds.update(ids => {
      const updatedIds = new Set(ids);
      updatedIds.delete(supplyListId);
      return updatedIds;
    });
  }

  private uniqueStrings(values: string[]): string[] {
    return values
      .map(value => value.trim())
      .filter((value, index, allValues) => value && allValues.indexOf(value) === index);
  }

  private uniqueTerms(values: Array<string | undefined>): string[] {
    const unique: string[] = [];

    for (const value of values) {
      const term = this.cleanTerm(value);
      if (term && !this.hasTerm(unique, term)) {
        unique.push(term);
      }
    }

    return unique;
  }

  private termsWithStatus(order: SupplyItemOrder[], status: SupplyItemOrder['status']): string[] {
    return this.uniqueTerms(
      order
        .filter(entry => entry.status === status)
        .map(entry => entry.itemTerm)
    );
  }

  private sortTerms(terms: string[]): string[] {
    return this.uniqueTerms(terms).sort((left, right) => left.localeCompare(right));
  }

  private hasTerm(terms: string[], term: string): boolean {
    const cleanTerm = this.cleanTerm(term);
    return !!cleanTerm && terms.some(existingTerm => this.sameTerm(existingTerm, cleanTerm));
  }

  private sameTerm(left: string, right: string): boolean {
    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }

  private cleanTerm(term: string | undefined | null): string {
    return term?.trim() ?? '';
  }

  private removeTermFromBuckets(term: string): void {
    this.stagedTerms = this.stagedTerms.filter(existingTerm => !this.sameTerm(existingTerm, term));
    this.unstagedTerms = this.unstagedTerms.filter(existingTerm => !this.sameTerm(existingTerm, term));
    this.notGivenTerms = this.notGivenTerms.filter(existingTerm => !this.sameTerm(existingTerm, term));
  }

  private buildSupplyOrder(): SupplyItemOrder[] {
    const stagedTerms = this.uniqueTerms(this.stagedTerms);
    const unstagedTerms = this.uniqueTerms(this.unstagedTerms)
      .filter(term => !this.hasTerm(stagedTerms, term));
    const servedTerms = [...stagedTerms, ...unstagedTerms];
    const notGivenTerms = this.uniqueTerms(this.notGivenTerms)
      .filter(term => !this.hasTerm(servedTerms, term));

    return [
      ...stagedTerms.map(itemTerm => ({ itemTerm, status: 'staged' as const })),
      ...unstagedTerms.map(itemTerm => ({ itemTerm, status: 'unstaged' as const })),
      ...notGivenTerms.map(itemTerm => ({ itemTerm, status: 'notGiven' as const })),
    ];
  }

  // Move a term from its current list into Staged (appended at end)
  moveToStaged(term: string): void {
    const cleanTerm = this.cleanTerm(term);
    if (!cleanTerm) {
      return;
    }

    this.removeTermFromBuckets(cleanTerm);
    this.stagedTerms = [...this.stagedTerms, cleanTerm];
  }

  // Move a term to Unstaged
  moveToUnstaged(term: string): void {
    const cleanTerm = this.cleanTerm(term);
    if (!cleanTerm) {
      return;
    }

    this.removeTermFromBuckets(cleanTerm);
    this.unstagedTerms = this.sortTerms([...this.unstagedTerms, cleanTerm]);
  }

  // Mark a term as not served at the drive.
  moveToNotGiven(term: string): void {
    const cleanTerm = this.cleanTerm(term);
    if (!cleanTerm) {
      return;
    }

    this.removeTermFromBuckets(cleanTerm);
    this.notGivenTerms = this.sortTerms([...this.notGivenTerms, cleanTerm]);
  }

  // CDK drag-drop handler for reordering the staged list
  dropStaged(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.stagedTerms, event.previousIndex, event.currentIndex);
  }

  // Persists the full drive order to the server
  saveSupplyOrder(): void {
    if (!this.canEditSupplyOrder) {
      return;
    }

    const order = this.buildSupplyOrder();
    this.settingsService.updateSupplyOrder(order).subscribe({
      next: () => this.snackBar.open('Drive order saved', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to save drive order', 'OK', { duration: 3000 })
    });
  }

  // Adds a school to the list and immediately persists to the server
  addSchool(): void {
    if (!this.canEditSchools) {
      return;
    }

    if (this.addSchoolForm.valid) {
      this.schools = [...this.schools, { name: this.addSchoolForm.value.name!, abbreviation: this.addSchoolForm.value.abbreviation! }];
      this.saveSchools();
      this.addSchoolForm.reset();
    }
  }

  // Removes a school at the given index and immediately persists to the server
  removeSchool(index: number): void {
    if (!this.canEditSchools) {
      return;
    }

    this.schools = this.schools.filter((_, i) => i !== index);
    this.saveSchools();
  }

  private saveSchools(): void {
    this.settingsService.updateSchools(this.schools).subscribe({
      next: () => this.snackBar.open('Schools saved', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to save schools', 'OK', { duration: 3000 })
    });
  }

  // Saves the drive order before the operator starts new POS sessions.
  saveAndOpenPointOfSale(): void {
    if (!this.canEditSupplyOrder) {
      return;
    }

    const order = this.buildSupplyOrder();
    this.settingsService.updateSupplyOrder(order).subscribe({
      next: () => {
        this.router.navigate(['/point-of-sale']);
        this.snackBar.open('Drive order saved for new POS sessions', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to save drive order', 'OK', { duration: 3000 })
    });
  }

  // Persists the time availability labels when the operator clicks Save
  saveTimeAvailability(): void {
    if (!this.canEditTimeAvailability) {
      return;
    }

    if (this.timeAvailabilityForm.valid) {
      const timeAvailability: TimeAvailabilityLabels = {
        earlyMorning: this.timeAvailabilityForm.value.earlyMorning ?? '',
        lateMorning: this.timeAvailabilityForm.value.lateMorning ?? '',
        earlyAfternoon: this.timeAvailabilityForm.value.earlyAfternoon ?? '',
        lateAfternoon: this.timeAvailabilityForm.value.lateAfternoon ?? ''
      };

      this.settingsService.updateTimeAvailability(
        timeAvailability
      ).subscribe({
        next: () => this.snackBar.open('Time availability saved', 'OK', { duration: 2000 }),
        error: () => this.snackBar.open('Failed to save time availability', 'OK', { duration: 3000 })
      });
    }
  }

  saveDefaultColumns(): void {
    if (!this.canEditTimeAvailability) {
      return;
    }

    const englishFamiliesControl = this.timeAvailabilityForm.get('englishFamilies');
    const spanishFamiliesControl = this.timeAvailabilityForm.get('spanishFamilies');

    if (englishFamiliesControl?.invalid || spanishFamiliesControl?.invalid) {
      englishFamiliesControl?.markAsTouched();
      spanishFamiliesControl?.markAsTouched();
      return;
    }

    const defaultScheduleColumns: DefaultScheduleColumns = {
      englishFamilies: this.timeAvailabilityForm.value.englishFamilies ?? 1,
      spanishFamilies: this.timeAvailabilityForm.value.spanishFamilies ?? 0
    };

    this.settingsService.updateDefaultScheduleColumns(defaultScheduleColumns).subscribe({
      next: () => this.snackBar.open('Default schedule columns saved', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to save default schedule columns', 'OK', { duration: 3000 })
    });
  }

  saveDriveDay(): void {
    if (!this.canEditDriveDay) {
      return;
    }
    if (!this.driveDayForm.valid) {
      return;
    }

    this.settingsService.updateDriveDay(this.driveDayForm.value as DriveDay).subscribe({
      next: () => this.snackBar.open('Drive day saved', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to save drive day', 'OK', { duration: 3000 })
    });
  }

  /**
   * Gets filter values from signals and returns an object of only non-empty filters
   */
  private getInventoryTargetFilters(item: string | undefined, brand: string | undefined, color: string | undefined, size: string | undefined, type: string | undefined, material: string | undefined): { item?: string; brand?: string; color?: string; size?: string; type?: string; material?: string } {
    const filters: { item?: string; brand?: string; color?: string; size?: string; type?: string; material?: string } = {};

    if (item) filters.item = item;
    if (brand) filters.brand = brand;
    if (color) filters.color = color;
    if (size) filters.size = size;
    if (type) filters.type = type;
    if (material) filters.material = material;

    return filters;
  }

  private reloadInventory(): void {
    this.inventoryService.loadInventory();
    this.reloadTrigger.update(n => n + 1);
  }

  /**
   * Resets quantity to 0 for all matching inventory items.
   */
  resetMatchingQuantities(): void {
    const filters = this.getInventoryTargetFilters(this.item(), this.brand(), this.color(), this.size(), this.type(), this.material());

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
          this.reloadInventory();
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
    const filters = this.getInventoryTargetFilters(this.item(), this.brand(), this.color(), this.size(), this.type(), this.material());

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
          this.reloadInventory();
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
            this.reloadInventory();
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
            this.reloadInventory();
          },
          error: (err) => {
            console.error('inventory reset failed', err);
            this.snackBar.open('Failed to reset quantities.', 'OK', { duration: 4000 });
          }
        });
      }
    });
  }

  saveBarcodePrintSettings(): void {
    if (!this.canEditBarcode) {
      return;
    }

    if (this.barcodePrintForm.valid) {
      const warningLimit = this.barcodePrintForm.value.barcodePrintWarningLimit ?? 25;

      this.settingsService.updateBarcodePrintWarningLimit(warningLimit).subscribe({
        next: () => this.snackBar.open(`Barcode print warning limit saved: ${warningLimit}`, 'OK', { duration: 2000 }),
        error: () => this.snackBar.open('Failed to save barcode print settings', 'OK', { duration: 3000 })
      });
    }
  }

  private static timeSlotValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = `${control.value ?? ''}`.trim();
      if (!value) {
        return null;
      }

      const rangeParts = value.split(SettingsComponent.timeSlotSeparator, 2);
      const explicitEndMeridiem = rangeParts.length === 2
        ? SettingsComponent.extractMeridiem(rangeParts[1])
        : undefined;
      const explicitStartMeridiem = SettingsComponent.extractMeridiem(rangeParts[0]);
      const startMeridiems = SettingsComponent.startMeridiemCandidates(explicitStartMeridiem, explicitEndMeridiem);
      if (startMeridiems.length === 0) {
        return { timeMeridiem: true };
      }

      let parseError: ValidationErrors | null = null;
      for (const startMeridiem of startMeridiems) {
        const start = SettingsComponent.parseTimeSlotPart(rangeParts[0], startMeridiem);
        if (start === undefined) {
          parseError = { timeSlot: true };
          continue;
        }

        if (rangeParts.length === 1) {
          return null;
        }

        const resolvedEndMeridiem = explicitEndMeridiem ?? startMeridiem;
        const end = SettingsComponent.parseTimeSlotPart(rangeParts[1], resolvedEndMeridiem);
        if (end === undefined) {
          parseError = { timeSlot: true };
          continue;
        }

        if (end > start) {
          return null;
        }
      }

      return parseError ?? { timeOrder: true };
    };
  }

  private static extractMeridiem(timeText: string): 'AM' | 'PM' | undefined {
    return timeText.match(SettingsComponent.meridiemPattern)?.[1].toUpperCase() as 'AM' | 'PM' | undefined;
  }

  private static startMeridiemCandidates(
    explicitStartMeridiem: 'AM' | 'PM' | undefined,
    explicitEndMeridiem: 'AM' | 'PM' | undefined
  ): ('AM' | 'PM')[] {
    if (explicitStartMeridiem) {
      return [explicitStartMeridiem];
    }

    if (explicitEndMeridiem) {
      return [explicitEndMeridiem, SettingsComponent.oppositeMeridiem(explicitEndMeridiem)];
    }

    return [];
  }

  private static oppositeMeridiem(meridiem: 'AM' | 'PM'): 'AM' | 'PM' {
    return meridiem === 'AM' ? 'PM' : 'AM';
  }

  private static parseTimeSlotPart(timeText: string, meridiem: 'AM' | 'PM' | undefined): number | undefined {
    if (!meridiem) {
      return undefined;
    }

    const cleanedTime = timeText.replace(SettingsComponent.meridiemPattern, '').trim();
    const match = cleanedTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return undefined;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return undefined;
    }

    return ((hour % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + minute;
  }
}
