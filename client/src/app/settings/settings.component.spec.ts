import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

import { SettingsComponent } from './settings.component';
import { SettingsService } from './settings.service';
import { TermsService } from '../terms/terms.service';
import { AppSettings } from './settings';
import { Terms } from '../terms/terms';
import { InventoryService } from '../inventory/inventory.service';
import { SelectOption } from '../inventory/inventory';
import { DialogService } from '../dialog/dialog.service';
import { FamilyService } from '../family/family.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let settingsServiceSpy: jasmine.SpyObj<SettingsService>;
  let termsServiceSpy: jasmine.SpyObj<TermsService>;
  let familyServiceSpy: jasmine.SpyObj<FamilyService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let inventoryServiceSpy: jasmine.SpyObj<InventoryService>;
  let dialogServiceSpy: jasmine.SpyObj<DialogService>;
  let itemOptionsSignal: WritableSignal<SelectOption[]>;
  let brandOptionsSignal: WritableSignal<SelectOption[]>;
  let colorOptionsSignal: WritableSignal<SelectOption[]>;
  let sizeOptionsSignal: WritableSignal<SelectOption[]>;
  let typeOptionsSignal: WritableSignal<SelectOption[]>;
  let materialOptionsSignal: WritableSignal<SelectOption[]>;

  const mockTerms: Terms = {
    item: ['folder', 'notebook', 'pencil'],
    brand: [],
    color: [],
    size: [],
    type: [],
    material: []
  };

  const mockSettings: AppSettings = {
    schools: [],
    timeAvailability: {
      earlyMorning: 'early morning',
      lateMorning: 'late morning',
      earlyAfternoon: 'early afternoon',
      lateAfternoon: 'late afternoon',
    },
    supplyOrder: [],
    availableSpots: 5,
    barcodePrintWarningLimit: 25,
  };

  beforeEach(async () => {
    settingsServiceSpy = jasmine.createSpyObj('SettingsService', [
      'getSettings',
      'updateSchools',
      'updateTimeAvailability',
      'updateSupplyOrder',
      'updateAvailableSpots',
      'scheduleFamilies',
      'updateBarcodePrintWarningLimit'
    ]);
    termsServiceSpy = jasmine.createSpyObj('TermsService', ['getTerms']);
    familyServiceSpy = jasmine.createSpyObj('FamilyService', ['scheduleFamilies']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    itemOptionsSignal = signal<SelectOption[]>([]);
    brandOptionsSignal = signal<SelectOption[]>([]);
    colorOptionsSignal = signal<SelectOption[]>([]);
    sizeOptionsSignal = signal<SelectOption[]>([]);
    typeOptionsSignal = signal<SelectOption[]>([]);
    materialOptionsSignal = signal<SelectOption[]>([]);
    inventoryServiceSpy = jasmine.createSpyObj('InventoryService', [
      'getInventory',
      'removeItemQuantityById',
      'loadInventory',
      'deleteInventories',
      'clearInventory',
      'resetAllQuantities',
      'resetMatchingQuantities'
    ], {
      itemOptions: itemOptionsSignal,
      brandOptions: brandOptionsSignal,
      colorOptions: colorOptionsSignal,
      sizeOptions: sizeOptionsSignal,
      typeOptions: typeOptionsSignal,
      materialOptions: materialOptionsSignal
    });
    dialogServiceSpy = jasmine.createSpyObj('DialogService', ['openDialog']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);


    // Default: return empty settings and the three mock terms
    settingsServiceSpy.getSettings.and.returnValue(of(mockSettings));
    termsServiceSpy.getTerms.and.returnValue(of(mockTerms));
    settingsServiceSpy.updateSupplyOrder.and.returnValue(of(undefined));
    inventoryServiceSpy.getInventory.and.returnValue(of([]));
    inventoryServiceSpy.removeItemQuantityById.and.returnValue(of(undefined));
    inventoryServiceSpy.deleteInventories.and.returnValue(of({
      matchedCount: 1,
      message: 'Deleted 1 matching inventory item(s).'
    }));
    inventoryServiceSpy.resetMatchingQuantities.and.returnValue(of({
      matchedCount: 1,
      message: 'Reset quantities for 1 matching inventory item(s).'
    }));
    dialogServiceSpy.openDialog.and.returnValue({
      afterClosed: () => of(true)
    } as never);

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: TermsService, useValue: termsServiceSpy },
        { provide: InventoryService, useValue: inventoryServiceSpy },
        { provide: DialogService, useValue: dialogServiceSpy },
        { provide: FamilyService, useValue: familyServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ---- loadDriveOrder ----

  it('populates unstagedTerms with all terms when no saved order exists', () => {
    // All three terms are unsorted/unstaged by default (no supplyOrder saved)
    expect(component.unstagedTerms).toEqual(['folder', 'notebook', 'pencil']); // alphabetical
    expect(component.stagedTerms).toEqual([]);
    expect(component.notGivenTerms).toEqual([]);
  });

  it('restores staged terms in saved order from server', fakeAsync(() => {
    const savedSettings: AppSettings = {
      ...mockSettings,
      supplyOrder: [
        { itemTerm: 'notebook', status: 'staged' },
        { itemTerm: 'folder', status: 'staged' },
      ],
    };
    settingsServiceSpy.getSettings.and.returnValue(of(savedSettings));

    // Re-init component to pick up new spy return value
    component.ngOnInit();
    tick();

    expect(component.stagedTerms).toEqual(['notebook', 'folder']); // order preserved
    expect(component.unstagedTerms).toEqual(['pencil']); // alphabetical remainder
    expect(component.notGivenTerms).toEqual([]);
  }));

  it('restores notGiven terms from server and excludes them from unstaged bucket', fakeAsync(() => {
    const savedSettings: AppSettings = {
      ...mockSettings,
      supplyOrder: [{ itemTerm: 'pencil', status: 'notGiven' }],
    };
    settingsServiceSpy.getSettings.and.returnValue(of(savedSettings));
    component.ngOnInit();
    tick();

    expect(component.notGivenTerms).toEqual(['pencil']);
    expect(component.unstagedTerms).toEqual(['folder', 'notebook']); // pencil excluded
  }));

  it('ignores saved terms that no longer exist in the terms database', fakeAsync(() => {
    const savedSettings: AppSettings = {
      ...mockSettings,
      supplyOrder: [{ itemTerm: 'eraser', status: 'staged' }], // eraser not in mockTerms
    };
    settingsServiceSpy.getSettings.and.returnValue(of(savedSettings));
    component.ngOnInit();
    tick();

    expect(component.stagedTerms).toEqual([]); // eraser dropped
    expect(component.unstagedTerms).toEqual(['folder', 'notebook', 'pencil']);
  }));

  // ---- moveToStaged ----

  it('moveToStaged moves a term from unstaged to staged', () => {
    component.unstagedTerms = ['folder', 'notebook', 'pencil'];
    component.stagedTerms = [];
    component.notGivenTerms = [];

    component.moveToStaged('notebook');

    expect(component.stagedTerms).toEqual(['notebook']);
    expect(component.unstagedTerms).not.toContain('notebook');
    expect(component.notGivenTerms).not.toContain('notebook');
  });

  it('moveToStaged moves a term from notGiven to staged', () => {
    component.notGivenTerms = ['pencil'];
    component.stagedTerms = [];
    component.unstagedTerms = [];

    component.moveToStaged('pencil');

    expect(component.stagedTerms).toContain('pencil');
    expect(component.notGivenTerms).not.toContain('pencil');
  });

  // ---- moveToUnstaged ----

  it('moveToUnstaged moves a term from staged to unstaged (sorted alphabetically)', () => {
    component.stagedTerms = ['notebook'];
    component.unstagedTerms = ['folder'];
    component.notGivenTerms = [];

    component.moveToUnstaged('notebook');

    expect(component.stagedTerms).not.toContain('notebook');
    expect(component.unstagedTerms).toEqual(['folder', 'notebook']); // alphabetical
  });

  it('moveToUnstaged moves a term from notGiven to unstaged', () => {
    component.notGivenTerms = ['pencil'];
    component.stagedTerms = [];
    component.unstagedTerms = [];

    component.moveToUnstaged('pencil');

    expect(component.notGivenTerms).not.toContain('pencil');
    expect(component.unstagedTerms).toContain('pencil');
  });

  // ---- moveToNotGiven ----

  it('moveToNotGiven moves a term from unstaged to notGiven (sorted alphabetically)', () => {
    component.unstagedTerms = ['folder', 'notebook'];
    component.notGivenTerms = [];
    component.stagedTerms = [];

    component.moveToNotGiven('notebook');

    expect(component.unstagedTerms).not.toContain('notebook');
    expect(component.notGivenTerms).toContain('notebook');
  });

  it('moveToNotGiven moves a term from staged to notGiven', () => {
    component.stagedTerms = ['folder'];
    component.notGivenTerms = [];
    component.unstagedTerms = [];

    component.moveToNotGiven('folder');

    expect(component.stagedTerms).not.toContain('folder');
    expect(component.notGivenTerms).toContain('folder');
  });

  // ---- dropStaged ----

  it('dropStaged reorders terms within the staged list', () => {
    component.stagedTerms = ['folder', 'notebook', 'pencil'];

    // Simulate dragging index 2 ('pencil') to index 0
    const event = { previousIndex: 2, currentIndex: 0 } as CdkDragDrop<string[]>;
    component.dropStaged(event);

    expect(component.stagedTerms[0]).toBe('pencil');
    expect(component.stagedTerms[1]).toBe('folder');
    expect(component.stagedTerms[2]).toBe('notebook');
  });

  it('dropStaged with same index leaves order unchanged', () => {
    component.stagedTerms = ['folder', 'notebook'];
    const event = { previousIndex: 1, currentIndex: 1 } as CdkDragDrop<string[]>;
    component.dropStaged(event);

    expect(component.stagedTerms).toEqual(['folder', 'notebook']);
  });

  // ---- saveSupplyOrder ----

  it('saveSupplyOrder calls updateSupplyOrder with staged, unstaged, and notGiven entries', () => {
    component.stagedTerms = ['notebook'];
    component.unstagedTerms = ['folder'];
    component.notGivenTerms = ['pencil'];

    component.saveSupplyOrder();

    expect(settingsServiceSpy.updateSupplyOrder).toHaveBeenCalledWith([
      { itemTerm: 'notebook', status: 'staged' },
      { itemTerm: 'folder', status: 'unstaged' },
      { itemTerm: 'pencil', status: 'notGiven' },
    ]);
  });

  it('saveSupplyOrder shows success snack bar on success', () => {
    settingsServiceSpy.updateSupplyOrder.and.returnValue(of(undefined));
    component.stagedTerms = ['notebook'];
    component.unstagedTerms = [];
    component.notGivenTerms = [];

    component.saveSupplyOrder();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Drive order saved', 'OK', { duration: 2000 });
  });

  it('saveSupplyOrder shows error snack bar on failure', () => {
    settingsServiceSpy.updateSupplyOrder.and.returnValue(throwError(() => new Error('Network error')));
    component.stagedTerms = [];
    component.unstagedTerms = [];
    component.notGivenTerms = [];

    component.saveSupplyOrder();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to save drive order', 'OK', { duration: 3000 });
  });

  it('saveSupplyOrder sends all three buckets even when some are empty', () => {
    component.stagedTerms = [];
    component.unstagedTerms = [];
    component.notGivenTerms = [];

    component.saveSupplyOrder();

    expect(settingsServiceSpy.updateSupplyOrder).toHaveBeenCalledWith([]);
  });

  it('saveAndGenerateChecklists saves and navigates to /checklists?generate=true', () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    // Patch the component's router with our spy
    (component as unknown as { router: jasmine.SpyObj<Router> }).router = routerSpy;
    component.stagedTerms = ['notebook'];
    component.unstagedTerms = ['folder'];
    component.notGivenTerms = ['pencil'];
    settingsServiceSpy.updateSupplyOrder.and.returnValue(of(undefined));

    component.saveAndGenerateChecklists();

    expect(settingsServiceSpy.updateSupplyOrder).toHaveBeenCalledWith([
      { itemTerm: 'notebook', status: 'staged' },
      { itemTerm: 'folder', status: 'unstaged' },
      { itemTerm: 'pencil', status: 'notGiven' },
    ]);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/checklists'], { queryParams: { generate: 'true' } });
  });

  it('saveAndGenerateChecklists shows error snack bar on failure', () => {
    settingsServiceSpy.updateSupplyOrder.and.returnValue(throwError(() => new Error('Network error')));
    component.stagedTerms = [];
    component.unstagedTerms = [];
    component.notGivenTerms = [];

    component.saveAndGenerateChecklists();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to save drive order', 'OK', { duration: 3000 });
  });

  // ---- addSchool / removeSchool / saveSchools ----

  it('addSchool adds school to list and calls updateSchools', () => {
    settingsServiceSpy.updateSchools.and.returnValue(of(undefined));
    component.addSchoolForm.setValue({ name: 'Test School', abbreviation: 'TS' });

    component.addSchool();

    expect(settingsServiceSpy.updateSchools).toHaveBeenCalledWith([{ name: 'Test School', abbreviation: 'TS' }]);
    expect(component.addSchoolForm.value.name).toBeNull(); // form is reset
  });

  it('addSchool does nothing when form is invalid', () => {
    settingsServiceSpy.updateSchools.and.returnValue(of(undefined));
    component.addSchoolForm.setValue({ name: 'A', abbreviation: 'A' }); // too short — minLength(2) but 1 char fails

    component.addSchool();

    expect(settingsServiceSpy.updateSchools).not.toHaveBeenCalled();
  });

  it('addSchool shows success snack bar on success', () => {
    settingsServiceSpy.updateSchools.and.returnValue(of(undefined));
    component.addSchoolForm.setValue({ name: 'Test School', abbreviation: 'TS' });

    component.addSchool();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Schools saved', 'OK', { duration: 2000 });
  });

  it('addSchool shows error snack bar on failure', () => {
    settingsServiceSpy.updateSchools.and.returnValue(throwError(() => new Error('fail')));
    component.addSchoolForm.setValue({ name: 'Test School', abbreviation: 'TS' });

    component.addSchool();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to save schools', 'OK', { duration: 3000 });
  });

  it('removeSchool removes school at given index and calls updateSchools', () => {
    settingsServiceSpy.updateSchools.and.returnValue(of(undefined));
    component.schools = [{ name: 'School A', abbreviation: 'A' }, { name: 'School B', abbreviation: 'B' }];

    component.removeSchool(0);

    expect(component.schools).toEqual([{ name: 'School B', abbreviation: 'B' }]);
    expect(settingsServiceSpy.updateSchools).toHaveBeenCalledWith([{ name: 'School B', abbreviation: 'B' }]);
  });

  it('removeSchool shows error snack bar on failure', () => {
    settingsServiceSpy.updateSchools.and.returnValue(throwError(() => new Error('fail')));
    component.schools = [{ name: 'School A', abbreviation: 'A' }];

    component.removeSchool(0);

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to save schools', 'OK', { duration: 3000 });
  });

  // ---- saveTimeAvailability ----

  it('saveTimeAvailability calls updateTimeAvailability and shows success snack bar', () => {
    settingsServiceSpy.updateTimeAvailability.and.returnValue(of(undefined));
    component.timeAvailabilityForm.setValue({
      earlyMorning: '8:00 AM',
      lateMorning: '10:00 AM',
      earlyAfternoon: '12:00 PM',
      lateAfternoon: '2:00 PM',
    });

    component.saveTimeAvailability();

    expect(settingsServiceSpy.updateTimeAvailability).toHaveBeenCalledWith({
      earlyMorning: '8:00 AM',
      lateMorning: '10:00 AM',
      earlyAfternoon: '12:00 PM',
      lateAfternoon: '2:00 PM',
    });
    expect(snackBarSpy.open).toHaveBeenCalledWith('Time availability saved', 'OK', { duration: 2000 });
  });

  it('saveTimeAvailability shows error snack bar on failure', () => {
    settingsServiceSpy.updateTimeAvailability.and.returnValue(throwError(() => new Error('fail')));
    component.timeAvailabilityForm.setValue({
      earlyMorning: '8:00 AM',
      lateMorning: '10:00 AM',
      earlyAfternoon: '12:00 PM',
      lateAfternoon: '2:00 PM',
    });

    component.saveTimeAvailability();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to save time availability', 'OK', { duration: 3000 });
  });

  it('saveTimeAvailability does nothing when form is invalid', () => {
    settingsServiceSpy.updateTimeAvailability.and.returnValue(of(undefined));
    component.timeAvailabilityForm.setValue({
      earlyMorning: '',
      lateMorning: '',
      earlyAfternoon: '',
      lateAfternoon: '',
    });

    component.saveTimeAvailability();

    expect(settingsServiceSpy.updateTimeAvailability).not.toHaveBeenCalled();
  });

  it('Should call updateAvailableSpots and show success snack bar', () => {
    settingsServiceSpy.updateAvailableSpots.and.returnValue(of(undefined));
    component.availableSpotsForm.setValue({ availableSpots: 28 });

    component.saveAvailableSpots();

    const availableSpots = component.availableSpotsForm.get('availableSpots').value;

    expect(snackBarSpy.open).toHaveBeenCalledWith(`Available spots setting saved: ${availableSpots}`, 'OK', { duration: 2000 });
  });

  it('Should call updateAvailableSpots and show failure snack bar', () => {
    settingsServiceSpy.updateAvailableSpots.and.returnValue(throwError(() => new Error('fail')));
    component.availableSpotsForm.setValue({ availableSpots: 28 });

    component.saveAvailableSpots();

    expect(snackBarSpy.open).toHaveBeenCalledWith(`Failed to save available spots`, 'OK', { duration: 3000 });
  });

  it('filters inventory management dropdown options using the typed filter values', () => {
    itemOptionsSignal.set([
      { label: 'Markers', value: 'Markers' },
      { label: 'Folder', value: 'Folder' }
    ]);
    brandOptionsSignal.set([
      { label: 'Crayola', value: 'Crayola' },
      { label: 'OfficeCo', value: 'OfficeCo' }
    ]);
    colorOptionsSignal.set([
      { label: 'Blue', value: 'Blue' },
      { label: 'Yellow', value: 'Yellow' }
    ]);
    sizeOptionsSignal.set([
      { label: 'Large', value: 'Large' },
      { label: 'Small', value: 'Small' }
    ]);
    typeOptionsSignal.set([
      { label: 'School', value: 'School' },
      { label: 'Writing', value: 'Writing' }
    ]);
    materialOptionsSignal.set([
      { label: 'Plastic', value: 'Plastic' },
      { label: 'Wood', value: 'Wood' }
    ]);

    component.item.set('mark');
    component.brand.set('cray');
    component.color.set('blu');
    component.size.set('lar');
    component.type.set('sch');
    component.material.set('plas');

    expect(component.filteredItemOptions()).toEqual([
      { label: 'Markers', value: 'Markers' }
    ]);
    expect(component.filteredBrandOptions()).toEqual([
      { label: 'Crayola', value: 'Crayola' }
    ]);
    expect(component.filteredColorOptions()).toEqual([
      { label: 'Blue', value: 'Blue' }
    ]);
    expect(component.filteredSizeOptions()).toEqual([
      { label: 'Large', value: 'Large' }
    ]);
    expect(component.filteredTypeOptions()).toEqual([
      { label: 'School', value: 'School' }
    ]);
    expect(component.filteredMaterialOptions()).toEqual([
      { label: 'Plastic', value: 'Plastic' }
    ]);
  });

  // ---- resetMatchingQuantities ----
  describe('resetMatchingQuantities', () => {
    it('resetMatchingQuantities shows error when no filters entered', () => {
      component.item.set('');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.resetMatchingQuantities();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Enter at least one inventory field to target specific items.', 'OK', { duration: 3000 });
      expect(inventoryServiceSpy.resetMatchingQuantities).not.toHaveBeenCalled();
    });

    it('resetMatchingQuantities does not proceed if dialog is cancelled', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(false)
      } as never);
      component.item.set('Pencil');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.resetMatchingQuantities();
      tick();

      expect(inventoryServiceSpy.resetMatchingQuantities).not.toHaveBeenCalled();
    }));

    it('resetMatchingQuantities shows loading message when dialog confirmed', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.resetMatchingQuantities.and.returnValue(of({
        matchedCount: 2,
        message: 'Reset quantities for 2 matching inventory item(s).'
      }));
      component.item.set('Pencil');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.resetMatchingQuantities();
      tick();

      // Should show loading message first
      expect(snackBarSpy.open).toHaveBeenCalledWith('Resetting matching inventory items...', 'OK', { duration: 1500 });
    }));

    it('resetMatchingQuantities with matching filters shows backend response on success', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.resetMatchingQuantities.and.returnValue(of({
        matchedCount: 2,
        message: 'Reset quantities for 2 matching inventory item(s).'
      }));
      component.item.set('Pencil');
      component.brand.set('Acme');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.resetMatchingQuantities();
      tick();

      expect(inventoryServiceSpy.resetMatchingQuantities).toHaveBeenCalledWith({ item: 'Pencil', brand: 'Acme' });
      expect(snackBarSpy.open).toHaveBeenCalledWith('Reset quantities for 2 matching inventory item(s).', 'OK', { duration: 3000 });
    }));

    it('resetMatchingQuantities with non-matching filters shows no-match response from backend', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.resetMatchingQuantities.and.returnValue(of({
        matchedCount: 0,
        message: 'No inventory items matched the provided filters.'
      }));
      component.item.set('NonExistent');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.resetMatchingQuantities();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('No inventory items matched the provided filters.', 'OK', { duration: 3000 });
    }));

    it('resetMatchingQuantities shows error snack bar on backend failure', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.resetMatchingQuantities.and.returnValue(throwError(() => new Error('Network error')));
      component.item.set('Pencil');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.resetMatchingQuantities();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to reset matching quantities.', 'OK', { duration: 4000 });
    }));
  });

  // ---- deleteMatchingInventory ----
  describe('deleteMatchingInventory', () => {
    it('deleteMatchingInventory shows error when no filters entered', () => {
      component.item.set('');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.deleteMatchingInventory();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Enter at least one inventory field to target specific items.', 'OK', { duration: 3000 });
      expect(inventoryServiceSpy.deleteInventories).not.toHaveBeenCalled();
    });

    it('deleteMatchingInventory does not proceed if dialog is cancelled', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(false)
      } as never);
      component.item.set('Notebook');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.deleteMatchingInventory();
      tick();

      expect(inventoryServiceSpy.deleteInventories).not.toHaveBeenCalled();
    }));

    it('deleteMatchingInventory shows loading message when dialog confirmed', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.deleteInventories.and.returnValue(of({
        matchedCount: 2,
        message: 'Deleted 2 matching inventory item(s).'
      }));
      component.item.set('Notebook');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.deleteMatchingInventory();
      tick();

      // Should show loading message first
      expect(snackBarSpy.open).toHaveBeenCalledWith('Deleting matching inventory items...', 'OK', { duration: 1500 });
    }));

    it('deleteMatchingInventory with matching filters shows backend response on success', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.deleteInventories.and.returnValue(of({
        matchedCount: 2,
        message: 'Deleted 2 matching inventory item(s).'
      }));
      component.item.set('Notebook');
      component.brand.set('BrandX');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.deleteMatchingInventory();
      tick();

      expect(inventoryServiceSpy.deleteInventories).toHaveBeenCalledWith({ item: 'Notebook', brand: 'BrandX' });
      expect(snackBarSpy.open).toHaveBeenCalledWith('Deleted 2 matching inventory item(s).', 'OK', { duration: 3000 });
    }));

    it('deleteMatchingInventory with non-matching filters shows no-match response from backend', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.deleteInventories.and.returnValue(of({
        matchedCount: 0,
        message: 'No inventory items matched the provided filters.'
      }));
      component.item.set('NonExistent');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.deleteMatchingInventory();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('No inventory items matched the provided filters.', 'OK', { duration: 3000 });
    }));

    it('deleteMatchingInventory shows error snack bar on backend failure', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.deleteInventories.and.returnValue(throwError(() => new Error('Network error')));
      component.item.set('Notebook');
      component.brand.set('');
      component.color.set('');
      component.size.set('');
      component.type.set('');
      component.material.set('');

      component.deleteMatchingInventory();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to delete matching inventory items.', 'OK', { duration: 4000 });
    }));
  });

  // ---- clearInventory ----

  describe('clearInventory', () => {
    it('clearInventory does not proceed if dialog is cancelled', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(false)
      } as never);

      component.clearInventory();
      tick();

      expect(inventoryServiceSpy.clearInventory).not.toHaveBeenCalled();
    }));

    it('clearInventory shows loading message when dialog confirmed', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.clearInventory.and.returnValue(of(undefined));

      component.clearInventory();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Clearing inventory...', 'Okay', { duration: 2000 });
    }));

    it('clearInventory shows success message on completion', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.clearInventory.and.returnValue(of(undefined));

      component.clearInventory();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Cleared inventory.', 'OK', { duration: 3000 });
    }));

    it('clearInventory shows error snack bar on backend failure', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.clearInventory.and.returnValue(throwError(() => new Error('Network error')));

      component.clearInventory();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to clear inventory.', 'OK', { duration: 4000 });
    }));
  });

  // ---- resetAllQuantities ----
  describe('resetAllQuantities', () => {
    it('resetAllQuantities does not proceed if dialog is cancelled', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(false)
      } as never);

      component.resetAllQuantities();
      tick();

      expect(inventoryServiceSpy.resetAllQuantities).not.toHaveBeenCalled();
    }));

    it('resetAllQuantities shows loading message when dialog confirmed', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.resetAllQuantities.and.returnValue(of(undefined));

      component.resetAllQuantities();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Resetting quantities...', 'Okay', { duration: 2000 });
    }));

    it('resetAllQuantities shows success message on completion', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.resetAllQuantities.and.returnValue(of(undefined));

      component.resetAllQuantities();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Quantities reset.', 'OK', { duration: 3000 });
    }));

    it('resetAllQuantities shows error snack bar on backend failure', fakeAsync(() => {
      dialogServiceSpy.openDialog.and.returnValue({
        afterClosed: () => of(true)
      } as never);
      inventoryServiceSpy.resetAllQuantities.and.returnValue(throwError(() => new Error('Network error')));

      component.resetAllQuantities();
      tick();

      expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to reset quantities.', 'OK', { duration: 4000 });
    }));
  });

  it('Should call scheduleFamilies and show successful snackBar', fakeAsync(() => {
    component.availableSpotsForm.setValue({ availableSpots: 5 });

    settingsServiceSpy.updateAvailableSpots.and.returnValue(of(undefined));
    familyServiceSpy.scheduleFamilies.and.returnValue(of(undefined));

    component.scheduleFamilies();
    tick();
    tick();

    expect(familyServiceSpy.scheduleFamilies).toHaveBeenCalled();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/family']);

    expect(snackBarSpy.open).toHaveBeenCalledWith('Families scheduled', 'OK', { duration: 2000 });
  }));

  it('Should call scheduleFamilies and show capacity error snackBar', fakeAsync(() => {
    component.availableSpotsForm.setValue({ availableSpots: 0 });

    settingsServiceSpy.updateAvailableSpots.and.returnValue(of(undefined));
    familyServiceSpy.scheduleFamilies.and.returnValue(
      throwError(() => ({
        error: {
          title: 'Not all families were able to be sorted, your event capacity may be too low'
        }
      }))
    );

    component.scheduleFamilies();
    tick();
    tick();

    expect(familyServiceSpy.scheduleFamilies).toHaveBeenCalled();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Your capacity is too low for the number of families', 'OK', { duration: 3000 });
  }));

  it('Should call scheduleFamilies and show general error snackBar', fakeAsync(() => {
    component.availableSpotsForm.setValue({ availableSpots: 0 });

    settingsServiceSpy.updateAvailableSpots.and.returnValue(of(undefined));
    familyServiceSpy.scheduleFamilies.and.returnValue(
      throwError(() => ({
        error: { title: 'general error' }
      }))
    );

    component.scheduleFamilies();
    tick();
    tick();

    expect(familyServiceSpy.scheduleFamilies).toHaveBeenCalled();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to schedule families', 'OK', { duration: 3000 });
  }));

  it('Should call scheduleFamilies and show update available spots error snackBar', fakeAsync(() => {
    component.availableSpotsForm.setValue({ availableSpots: 0 });

    settingsServiceSpy.updateAvailableSpots.and.returnValue(
      throwError(() => ({
        error: { title: 'update available spots error'}
      }))
    );

    component.scheduleFamilies();
    tick();
    tick();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to update available spots', 'OK', { duration: 3000 });
  }));
  it('saves the barcode print warning limit setting', () => {
    settingsServiceSpy.updateBarcodePrintWarningLimit.and.returnValue(of(undefined));
    component.barcodePrintForm.setValue({ barcodePrintWarningLimit: 30 });

    component.saveBarcodePrintSettings();

    expect(settingsServiceSpy.updateBarcodePrintWarningLimit).toHaveBeenCalledWith(30);
    expect(snackBarSpy.open).toHaveBeenCalledWith('Barcode print warning limit saved: 30', 'OK', { duration: 2000 });
  });

  it('shows an error when barcode print settings fail to save', () => {
    settingsServiceSpy.updateBarcodePrintWarningLimit.and.returnValue(throwError(() => new Error('fail')));
    component.barcodePrintForm.setValue({ barcodePrintWarningLimit: 30 });

    component.saveBarcodePrintSettings();

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to save barcode print settings', 'OK', { duration: 3000 });
  });
});
