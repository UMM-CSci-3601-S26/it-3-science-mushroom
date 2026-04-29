import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
import { DialogService } from '../dialog/dialog.service';
import { Inventory } from '../inventory/inventory';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let settingsServiceSpy: jasmine.SpyObj<SettingsService>;
  let termsServiceSpy: jasmine.SpyObj<TermsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let inventoryServiceSpy: jasmine.SpyObj<InventoryService>;
  let dialogServiceSpy: jasmine.SpyObj<DialogService>;

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
      earlyMorning: '',
      lateMorning: '',
      earlyAfternoon: '',
      lateAfternoon: '',
    },
    supplyOrder: [],
    availableSpots: 5,
  };

  beforeEach(async () => {
    settingsServiceSpy = jasmine.createSpyObj('SettingsService', [
      'getSettings',
      'updateSchools',
      'updateTimeAvailability',
      'updateSupplyOrder',
      'updateAvailableSpots'
    ]);
    termsServiceSpy = jasmine.createSpyObj('TermsService', ['getTerms']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    inventoryServiceSpy = jasmine.createSpyObj('InventoryService', [
      'getInventory',
      'removeItemQuantityById',
      'deleteInventories',
      'clearInventory',
      'resetQuantities'
    ]);
    dialogServiceSpy = jasmine.createSpyObj('DialogService', ['openDialog']);

    // Default: return empty settings and the three mock terms
    settingsServiceSpy.getSettings.and.returnValue(of(mockSettings));
    termsServiceSpy.getTerms.and.returnValue(of(mockTerms));
    settingsServiceSpy.updateSupplyOrder.and.returnValue(of(undefined));
    inventoryServiceSpy.getInventory.and.returnValue(of([]));
    inventoryServiceSpy.removeItemQuantityById.and.returnValue(of(undefined));
    inventoryServiceSpy.deleteInventories.and.returnValue(of(undefined));
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

  it('resetMatchingQuantities resets quantities for matched inventory items', () => {
    const matchedItems: Inventory[] = [
      { internalID: 'INV-1', internalBarcode: '', externalBarcode: [], item: 'Pencil', description: '', brand: 'Acme', color: '', packageSize: 1, size: '', type: '', material: '', quantity: 4, notes: '', maxQuantity: 0, minQuantity: 0, stockState: '' },
      { internalID: 'INV-2', internalBarcode: '', externalBarcode: [], item: 'Pencil', description: '', brand: 'Acme', color: '', packageSize: 1, size: '', type: '', material: '', quantity: 2, notes: '', maxQuantity: 0, minQuantity: 0, stockState: '' },
    ];
    inventoryServiceSpy.getInventory.and.returnValue(of(matchedItems));
    component.inventoryFilterForm.setValue({ item: 'Pencil', brand: 'Acme', color: '', size: '', type: '', material: '' });

    component.resetMatchingQuantities();

    expect(inventoryServiceSpy.getInventory).toHaveBeenCalledWith({ item: 'Pencil', brand: 'Acme' });
    expect(inventoryServiceSpy.removeItemQuantityById).toHaveBeenCalledWith('INV-1', 4);
    expect(inventoryServiceSpy.removeItemQuantityById).toHaveBeenCalledWith('INV-2', 2);
    expect(snackBarSpy.open).toHaveBeenCalledWith('Reset quantities for 2 matching item(s).', 'OK', { duration: 3000 });
  });

  it('deleteMatchingInventory deletes matched inventory items', () => {
    component.inventoryFilterForm.setValue({ item: 'Notebook', brand: 'BrandX', color: '', size: '', type: '', material: '' });

    component.deleteMatchingInventory();

    expect(inventoryServiceSpy.deleteInventories).toHaveBeenCalledWith({ item: 'Notebook', brand: 'BrandX' });
    expect(snackBarSpy.open).toHaveBeenCalledWith('Deleted matching inventory items.', 'OK', { duration: 3000 });
  });
});
