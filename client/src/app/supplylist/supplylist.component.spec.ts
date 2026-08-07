import { ComponentFixture, TestBed, waitForAsync, tick, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { MockSupplyListService } from 'src/testing/supplylist.service.mock'
import { SupplyList } from './supplylist';
import { SupplyListComponent } from './supplylist.component';
import { SupplyListService } from './supplylist.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../auth/auth-service';
import { DialogService } from '../shared/dialog/dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { SupplyListInventoryLinkDialogComponent } from './inventory-link-dialog/supply-list-inventory-link-dialog.component';

function supplyListItem(overrides: Partial<SupplyList> = {}): SupplyList {
  return {
    _id: 'supply-1',
    academicYear: '',
    teacher: '',
    school: 'MHS',
    grade: 'PreK',
    item: ['Markers'],
    brand: { exactly: '', anyOf: [] },
    color: { exactly: '', anyOf: [] },
    size: { exactly: '', anyOf: [] },
    type: { exactly: '', anyOf: [] },
    material: { exactly: '', anyOf: [] },
    packageSize: 1,
    quantity: 1,
    notes: '',
    supplyID: '',
    invIDs: [],
    percentageFilled: 0,
    ...overrides
  };
}

describe('SupplyList Table', () => {
  let supplylistTable: SupplyListComponent;
  let fixture: ComponentFixture<SupplyListComponent>
  let supplylistService: SupplyListService;
  let dialogService: jasmine.SpyObj<DialogService>;
  let dialog: MatDialog;

  beforeEach(() => {
    dialogService = jasmine.createSpyObj<DialogService>('DialogService', ['openDialog']);
    dialogService.openDialog.and.returnValue({
      afterClosed: () => of(true)
    } as never);

    TestBed.configureTestingModule({
      imports: [SupplyListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SupplyListService, useClass: MockSupplyListService },
        { provide: AuthService, useValue: { hasPermission: () => true } }, // Tests have permission to run
        { provide: DialogService, useValue: dialogService },
        provideRouter([])
      ],
    });
  });

  beforeEach(fakeAsync(() => {
    TestBed.compileComponents().then(() => {
      fixture = TestBed.createComponent(SupplyListComponent);
      supplylistTable = fixture.componentInstance;
      supplylistService = TestBed.inject(SupplyListService);
      dialog = (supplylistTable as unknown as { dialog: MatDialog }).dialog;
      fixture.detectChanges();
    });
    flushMicrotasks(); // resolve the compileComponents promise
    tick(300);         // advance past the initial debounceTime(300)
  }));

  it('should create the component', () => {
    expect(supplylistTable).toBeTruthy();
  });

  it('should initialize with serverFilteredTable available', () => {
    const SupplyList = supplylistTable.serverFilteredSupplyList();
    expect(SupplyList).toBeDefined();
    expect(Array.isArray(SupplyList)).toBe(true);
  });

  it('should call getSupplyList() when School signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.school.set('Herman');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: 'Herman', grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when grade signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.grade.set('PreK');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: 'PreK', item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when item signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.item.set('Markers');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: 'Markers', brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when brand signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.brand.set('Crayola');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: 'Crayola', color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when color signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.color.set('Red');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: 'Red', size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when size signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.size.set('Wide Ruled');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: 'Wide Ruled', type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when type signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.type.set('Spiral');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: 'Spiral', material: undefined });
  }));

  it('should call getSupplyList() when material signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.material.set('Plastic');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: 'Plastic' });
  }));

  // Tests to verify the use of multiple filter inputs in the same filter
  it('should call getSupplyList() when School signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.school.set('Herman, St. Mary\'s');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: 'Herman, St. Mary\'s', grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when grade signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.grade.set('PreK, 12th grade');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: 'PreK, 12th grade', item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when item signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.item.set('Markers, Crayons');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: 'Markers, Crayons', brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when brand signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.brand.set('Crayola, Five Star');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: 'Crayola, Five Star', color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when color signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.color.set('Red, Black');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: 'Red, Black', size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when size signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.size.set('Wide Ruled, Standard');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: 'Wide Ruled, Standard', type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when type signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.type.set('Spiral, Composition');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: 'Spiral, Composition', material: undefined });
  }));

  it('should call getSupplyList() when material signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.material.set('Plastic, Wood');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: 'Plastic, Wood' });
  }));



  it('should call getSupplyList() when brand and color signals change', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.color.set('Black');
    supplylistTable.brand.set('Crayola');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: 'Crayola', color: 'Black', size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when item, brand, color, and material signals change', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.item.set('Notebook');
    supplylistTable.brand.set('Five Star');
    supplylistTable.color.set('Yellow');
    supplylistTable.type.set('Spiral');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: 'Notebook', brand: 'Five Star', color: 'Yellow', size: undefined, type: 'Spiral', material: undefined });
  }));

  it('should call getSupplyList() when item, brand, color, material, school and grade signals change', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.item.set('Notebook');
    supplylistTable.brand.set('Five Star');
    supplylistTable.color.set('Yellow');
    supplylistTable.type.set('Spiral');
    // Set school first and let detectChanges run the grade-reset effect
    supplylistTable.school.set('MHS');
    fixture.detectChanges();
    tick(300);
    // Now set grade after the school effect has cleared it
    supplylistTable.grade.set('PreK');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: 'MHS', grade: 'PreK', item: 'Notebook', brand: 'Five Star', color: 'Yellow', size: undefined, type: 'Spiral', material: undefined });
  }));

  it('should not show error message on successful load', () => {
    expect(supplylistTable.errMsg()).toBeUndefined();
  });

  it('should include quantity when requesting server-filtered supply list data', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();

    supplylistTable.quantity.set(2);
    fixture.detectChanges();
    tick(300);

    expect(spy).toHaveBeenCalledWith({
      school: undefined,
      grade: undefined,
      item: undefined,
      brand: undefined,
      color: undefined,
      size: undefined,
      type: undefined,
      material: undefined,
      quantity: 2
    });
  }));

  it('should parse comma-separated string values into trimmed arrays', () => {
    expect(supplylistTable.parseStringArray(' Markers, , Crayons ')).toEqual(['Markers', 'Crayons']);
  });

  it('should detect supplies without linked inventory IDs', () => {
    const hasNoLinks = supplylistTable.noLinkedInventoryItems;

    expect(hasNoLinks(supplyListItem({ invIDs: undefined as unknown as string[] }))).toBeTrue();
    expect(hasNoLinks(supplyListItem({ invIDs: [] }))).toBeTrue();
    expect(hasNoLinks(supplyListItem({ invIDs: ['inv-1'] }))).toBeFalse();
  });

  it('should summarize linked inventory counts after normalizing IDs', () => {
    expect(supplylistTable.linkedInventorySummary(undefined)).toBe('No linked inventory');
    expect(supplylistTable.linkedInventorySummary([' inv-1 ', 'inv-1'])).toBe('1 linked item');
    expect(supplylistTable.linkedInventorySummary(['inv-1', 'inv-2'])).toBe('2 linked items');
  });

  it('should prefill the inventory link dialog from an existing supply item', () => {
    const supply = supplyListItem({
      item: ['Markers', 'Crayons'],
      brand: { exactly: 'N/A', anyOf: ['Crayola'] },
      color: { exactly: 'Blue', anyOf: [] },
      size: { exactly: 'Wide', anyOf: [] },
      type: { exactly: 'Washable', anyOf: [] },
      material: { exactly: 'N/A', anyOf: [] },
      packageSize: 8,
      quantity: 2,
      invIDs: [' inv-1 ', 'inv-1']
    });
    const openSpy = spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of(undefined)
    } as never);

    supplylistTable.openInventoryLinkDialogForSupply(supply, false);

    expect(openSpy).toHaveBeenCalledWith(SupplyListInventoryLinkDialogComponent, jasmine.objectContaining({
      width: '920px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: jasmine.objectContaining({
        requirementLabel: jasmine.stringContaining('Markers or Crayons'),
        selectedInventoryIds: ['inv-1'],
        filters: {
          item: 'Markers',
          brand: 'Crayola',
          color: 'Blue',
          size: 'Wide',
          type: 'Washable',
          material: undefined
        }
      })
    }));
  });

  it('should leave linked inventory unchanged when the link dialog is cancelled', () => {
    const supply = supplyListItem({ invIDs: ['inv-1'] });
    const saveSpy = spyOn(supplylistTable, 'saveEdit');
    spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of(undefined)
    } as never);

    supplylistTable.openInventoryLinkDialogForSupply(supply, true);

    expect(supply.invIDs).toEqual(['inv-1']);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should update linked inventory without saving when saveOnClose is false', () => {
    const supply = supplyListItem({ invIDs: [] });
    const saveSpy = spyOn(supplylistTable, 'saveEdit');
    spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of([' inv-2 ', 'inv-2', 'inv-3', ''])
    } as never);

    supplylistTable.openInventoryLinkDialogForSupply(supply, false);

    expect(supply.invIDs).toEqual(['inv-2', 'inv-3']);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should update linked inventory and save when saveOnClose is true', () => {
    const supply = supplyListItem({ invIDs: [] });
    const saveSpy = spyOn(supplylistTable, 'saveEdit');
    spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of(['inv-4'])
    } as never);

    supplylistTable.openInventoryLinkDialogForSupply(supply, true);

    expect(supply.invIDs).toEqual(['inv-4']);
    expect(saveSpy).toHaveBeenCalledWith(supply);
  });

  it('should return undefined filters when supply fields are blank or N/A', () => {
    const helpers = supplylistTable as unknown as {
      inventoryFiltersFromSupply(supply: SupplyList): {
        item?: string;
        brand?: string;
        color?: string;
        size?: string;
        type?: string;
        material?: string;
      };
      firstInventoryItemToken(items: string[] | undefined): string | undefined;
      firstAttributeToken(attribute: SupplyList['brand'] | undefined): string | undefined;
      normalizeInventoryIds(ids: string[] | undefined): string[];
    };

    expect(helpers.inventoryFiltersFromSupply(supplyListItem({
      item: [' ', 'N/A'],
      brand: { exactly: 'N/A', anyOf: [] },
      color: { exactly: '', anyOf: ['N/A'] },
      size: { exactly: '', anyOf: [] },
      type: { exactly: '', anyOf: [] },
      material: { exactly: '', anyOf: [] }
    }))).toEqual({
      item: undefined,
      brand: undefined,
      color: undefined,
      size: undefined,
      type: undefined,
      material: undefined
    });
    expect(helpers.firstInventoryItemToken(undefined)).toBeUndefined();
    expect(helpers.firstAttributeToken(undefined)).toBeUndefined();
    expect(helpers.normalizeInventoryIds(undefined)).toEqual([]);
  });

  it('should group supplies with missing school/grade under fallback labels', fakeAsync(() => {
    spyOn(supplylistService, 'getSupplyList').and.returnValue(of([
      {
        _id: '',
        academicYear: '',
        teacher: '',
        school: '',
        grade: '',
        item: ['Pencil'],
        brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] },
        packageSize: 1,
        size: { exactly: '', anyOf: [] },
        type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] },
        quantity: 0,
        notes: '',
        supplyID: '',
        invIDs: [],
        percentageFilled: 0
      }
    ]));

    supplylistTable.item.set('Pencil'); // trigger signal re-evaluation
    fixture.detectChanges();
    tick(300);

    const groups = supplylistTable.groupedSupplyList();
    expect(groups[0].school).toBe('Unknown School');
    expect(groups[0].grades[0].grade).toBe('Unknown Grade');
  }));

  // ── confirmDelete() tests ──────────────────────────────────────────────────

  describe('confirmDelete()', () => {
    it('calls deleteSupplyList() and removes the item from dataSource on success', fakeAsync(() => {
      const itemWithId: SupplyList = {
        _id: 'delete-me',
        academicYear: '',
        teacher: '',
        school: 'MHS', grade: 'PreK', item: ['Eraser'], brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] }, size: { exactly: '', anyOf: [] }, type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] }, packageSize: 1, quantity: 1, notes: '', supplyID: '', invIDs: [], percentageFilled: 0
      };
      supplylistTable.dataSource.data = [itemWithId];

      const deleteSpy = spyOn(supplylistService, 'deleteSupplyList').and.returnValue(of(undefined));

      supplylistTable.confirmDelete('delete-me');
      tick(300);
      fixture.detectChanges();

      expect(dialogService.openDialog).toHaveBeenCalledWith({
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        buttonOne: 'Cancel',
        buttonTwo: 'Delete'
      });
      expect(deleteSpy).toHaveBeenCalledWith('delete-me');
      expect(supplylistTable.dataSource.data.find(i => i._id === 'delete-me')).toBeUndefined();
    }));

    it('does nothing when the user cancels the confirm dialog', fakeAsync(() => {
      const itemWithId: SupplyList = {
        _id: 'keep-me',
        academicYear: '',
        teacher: '',
        school: 'MHS', grade: 'PreK', item: ['Ruler'], brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] }, size: { exactly: '', anyOf: [] }, type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] }, packageSize: 1, quantity: 1, notes: '', supplyID: '', invIDs: [], percentageFilled: 0
      };
      supplylistTable.dataSource.data = [itemWithId];

      dialogService.openDialog.and.returnValue({
        afterClosed: () => of(false)
      } as never);
      const deleteSpy = spyOn(supplylistService, 'deleteSupplyList').and.returnValue(of(undefined));

      supplylistTable.confirmDelete('keep-me');
      tick();

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(supplylistTable.dataSource.data).toContain(itemWithId);
    }));

    it('does nothing when id is undefined', fakeAsync(() => {
      const deleteSpy = spyOn(supplylistService, 'deleteSupplyList').and.returnValue(of(undefined));

      supplylistTable.confirmDelete(undefined);
      tick();

      expect(dialogService.openDialog).not.toHaveBeenCalled();
      expect(deleteSpy).not.toHaveBeenCalled();
    }));

    it('sets errMsg when deleteSupplyList() returns an error', fakeAsync(() => {
      const itemWithId: SupplyList = {
        _id: 'fail-delete',
        academicYear: '',
        teacher: '',
        school: 'MHS', grade: 'PreK', item: ['Tape'], brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] }, size: { exactly: '', anyOf: [] }, type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] }, packageSize: 1, quantity: 1, notes: '', supplyID: '', invIDs: [], percentageFilled: 0
      };
      supplylistTable.dataSource.data = [itemWithId];

      spyOn(supplylistService, 'deleteSupplyList').and.returnValue(
        new Observable(o => o.error({ status: 500, message: 'Server error' }))
      );

      supplylistTable.confirmDelete('fail-delete');
      tick();

      expect(supplylistTable.errMsg()).toContain('Problem deleting item – Error Code: 500');
    }));
  });

  // ── startEdit() / cancelEdit() / saveEdit() tests ─────────────────────────

  describe('startEdit()', () => {
    it('sets editingItemId to the item\'s _id', () => {
      const item: SupplyList = {
        _id: 'edit-id',
        academicYear: '',
        teacher: '',
        school: 'MHS', grade: 'PreK', item: ['Marker'], brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] }, size: { exactly: '', anyOf: [] }, type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] }, packageSize: 1, quantity: 1, notes: '', supplyID: '', invIDs: [], percentageFilled: 0
      };
      supplylistTable.startEdit(item);
      expect(supplylistTable.editingItemId).toBe('edit-id');
    });

    it('stores a deep copy as backup, separate from the original object', () => {
      const item: SupplyList = {
        _id: 'backup-id',
        academicYear: '',
        teacher: '',
        school: 'Herman',
        grade: '3rd grade',
        item: ['Glue'],
        brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] },
        size: { exactly: '', anyOf: [] },
        type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] },
        packageSize: 1,
        quantity: 2,
        notes: '',
        supplyID: '',
        invIDs: [],
        percentageFilled: 0
      };
      supplylistTable.startEdit(item);
      // Mutating the original should not affect the backup
      item.item = ['Changed'];
      // Access backup via cancelEdit restoring from it
      supplylistTable.dataSource.data = [item];
      supplylistTable.cancelEdit();
      expect(supplylistTable.dataSource.data[0].item).toEqual(['Glue']);
    });
  });

  describe('cancelEdit()', () => {
    it('clears editingItemId after cancelling', () => {
      const item: SupplyList = {
        _id: 'cancel-id',
        academicYear: '',
        teacher: '',
        school: 'MHS',
        grade: 'PreK',
        item: ['Pen'],
        brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] },
        size: { exactly: '', anyOf: [] },
        type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] },
        packageSize: 1,
        quantity: 1,
        notes: '',
        supplyID: '',
        invIDs: [],
        percentageFilled: 0
      };
      supplylistTable.dataSource.data = [item];
      supplylistTable.startEdit(item);
      supplylistTable.cancelEdit();
      expect(supplylistTable.editingItemId).toBeNull();
    });

    it('restores the original item values in dataSource', () => {
      const item: SupplyList = {
        _id: 'restore-id',
        academicYear: '',
        teacher: '',
        school: 'MHS',
        grade: '1st grade',
        item: ['Crayon'],
        brand: { exactly: '', anyOf: ['Crayola'] },
        color: { exactly: '', anyOf: ['Red'] },
        size: { exactly: '', anyOf: [] },
        type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] },
        packageSize: 1,
        quantity: 3,
        notes: '',
        supplyID: '',
        invIDs: [],
        percentageFilled: 0
      };
      supplylistTable.dataSource.data = [{ ...item }];
      supplylistTable.startEdit(supplylistTable.dataSource.data[0]);
      supplylistTable.dataSource.data[0].item = ['Pencil']; // simulate in-progress edit
      supplylistTable.cancelEdit();
      expect(supplylistTable.dataSource.data[0].item).toEqual(['Crayon']);
    });
  });

  describe('saveEdit()', () => {
    it('calls editSupplyList() and clears editing state on success', fakeAsync(() => {
      const item: SupplyList = {
        _id: 'save-id',
        academicYear: '',
        teacher: '',
        school: 'MHS',
        grade: 'PreK',
        item: ['Notebook'],
        brand: { exactly: '', anyOf: ['Five Star'] },
        color: { exactly: '', anyOf: ['Blue'] },
        size: { exactly: 'Wide Ruled', anyOf: [] },
        type: { exactly: 'Spiral', anyOf: [] },
        material: { exactly: '', anyOf: [] },
        packageSize: 1,
        quantity: 2,
        notes: '',
        supplyID: '',
        invIDs: [],
        percentageFilled: 0
      };
      const saveSpy = spyOn(supplylistService, 'editSupplyList').and.returnValue(of(undefined));

      supplylistTable.startEdit(item);
      supplylistTable.saveEdit(item);
      tick();

      expect(saveSpy).toHaveBeenCalledWith('save-id', item);
      expect(supplylistTable.editingItemId).toBeNull();
    }));

    it('does nothing when item has no _id', fakeAsync(() => {
      const item: SupplyList = {
        _id: '',
        academicYear: '',
        teacher: '',
        school: 'MHS',
        grade: 'PreK',
        item: ['Notebook'],
        brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] },
        size: { exactly: '', anyOf: [] },
        type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] },
        packageSize: 1,
        quantity: 1,
        notes: '',
        supplyID: '',
        invIDs: [],
        percentageFilled: 0
      };
      const saveSpy = spyOn(supplylistService, 'editSupplyList').and.returnValue(of(undefined));

      supplylistTable.saveEdit(item);
      tick();

      expect(saveSpy).not.toHaveBeenCalled();
    }));

    it('sets errMsg when editSupplyList() returns an error', fakeAsync(() => {
      const item: SupplyList = {
        _id: 'err-save-id',
        academicYear: '',
        teacher: '',
        school: 'MHS',
        grade: 'PreK',
        item: ['Folder'],
        brand: { exactly: '', anyOf: [] },
        color: { exactly: '', anyOf: [] },
        size: { exactly: '', anyOf: [] },
        type: { exactly: '', anyOf: [] },
        material: { exactly: '', anyOf: [] },
        packageSize: 1,
        quantity: 1,
        notes: '',
        supplyID: '',
        invIDs: [],
        percentageFilled: 0
      };
      spyOn(supplylistService, 'editSupplyList').and.returnValue(
        new Observable(o => o.error({ status: 422, message: 'Unprocessable' }))
      );

      supplylistTable.startEdit(item);
      supplylistTable.saveEdit(item);
      tick();

      expect(supplylistTable.errMsg()).toContain('Problem saving item – Error Code: 422');
    }));
  });
});

describe('Misbehaving SupplyList Table', () => {
  let supplylistTable: SupplyListComponent;
  let fixture: ComponentFixture<SupplyListComponent>;

  let supplylistServiceStub: {
    getSupplyList: () => Observable<SupplyList[]>;
    //filterSupplyList: () => SupplyList[];
  };

  beforeEach(() => {
    supplylistServiceStub = {
      getSupplyList: () =>
        new Observable((observer) => {
          observer.error('getSupplyList() Observer generates an error');
        }),
      //filterSupplyList: () => []
    };
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        SupplyListComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SupplyListService,
          useValue: supplylistServiceStub
        },
        { provide: AuthService, useValue: { hasPermission: () => true } }, // Tests have permission to run
        provideRouter([])
      ],
    })
      .compileComponents();
  }));

  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(SupplyListComponent);
    supplylistTable = fixture.componentInstance;
    tick(300);
    fixture.detectChanges();
  }));

  it("generates an error if we don't set up a SupplyListService", () => {
    expect(supplylistTable.serverFilteredSupplyList())
      .withContext("service can't give values to the list if it's not there")
      .toEqual([]);
    expect(supplylistTable.errMsg())
      .withContext('the error message will be')
      .toContain('Problem contacting the server - Error Code:');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for SupplyListComponent#toLabel()
// ─────────────────────────────────────────────────────────────────────────────
describe('SupplyListComponent#toLabel()', () => {
  let supplylistTable: SupplyListComponent;

  // Minimal valid SupplyList with no optional fields set
  const base: SupplyList = {
    _id: '', academicYear: '', teacher: '', school: 'MHS', grade: 'K', item: ['crayon'],
    brand: { exactly: '', anyOf: [] }, color: { exactly: '', anyOf: [] },
    size: { exactly: '', anyOf: [] }, type: { exactly: '', anyOf: [] },
    material: { exactly: '', anyOf: [] }, packageSize: 0, quantity: 1, notes: '', supplyID: '', invIDs: [], percentageFilled: 0
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SupplyListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SupplyListService, useClass: MockSupplyListService },
        { provide: AuthService, useValue: { hasPermission: () => true } }, // Tests have permissions
        provideRouter([])
      ],
    });
  });

  beforeEach(fakeAsync(() => {
    TestBed.compileComponents().then(() => {
      const fixture = TestBed.createComponent(SupplyListComponent);
      supplylistTable = fixture.componentInstance;
      fixture.detectChanges();
    });
    flushMicrotasks();
    tick(300);
  }));

  it('should include brand exactly values in the label', () => {
    const label = supplylistTable.toLabel({ ...base, brand: { exactly: 'Crayola', anyOf: [] } } as SupplyList);
    expect(label).toContain('Crayola');
  });

  it('should include brand anyOf values in the label', () => {
    const label = supplylistTable.toLabel({ ...base, brand: { exactly: '', anyOf: ['Expo'] } } as unknown as SupplyList);
    expect(label).toContain('Expo');
  });

  it('should not pluralize size when quantity is 1', () => {
    const label = supplylistTable.toLabel({ ...base, size: { exactly: 'pack', anyOf: [] }, quantity: 1 } as unknown as SupplyList);
    expect(label).toContain('pack of');
    expect(label).not.toContain('packs');
  });

  it('should omit size section when size is empty string', () => {
    const label = supplylistTable.toLabel({ ...base, size: { exactly: '', anyOf: [] } } as unknown as SupplyList);
    expect(label).not.toContain(' of ');
  });

  it('should omit size section when size is N/A', () => {
    const label = supplylistTable.toLabel({ ...base, size: { exactly: 'N/A', anyOf: [] } } as unknown as SupplyList);
    expect(label).not.toContain(' of ');
  });

  it('should pluralize item when quantity > 1 and item does not end with s', () => {
    const label = supplylistTable.toLabel({ ...base, quantity: 2, item: ['crayon'] });
    expect(label).toContain('crayons');
  });

  it('should not double-pluralize item that already ends with s (ternary false branch)', () => {
    // quantity > 1 but itemStr ends with 's' → keep original, don't append another 's'
    const label = supplylistTable.toLabel({ ...base, quantity: 2, item: ['scissors'] });
    expect(label).not.toContain('scissorss');
    expect(label).toContain('scissors');
  });

  it('should omit item portion when item array is empty (if(itemStr) false branch)', () => {
    const label = supplylistTable.toLabel({ ...base, item: [] });
    expect(label.trim()).toBe('1x');
  });

  it('should include notes when notes is a non-empty, non-N/A string', () => {
    const label = supplylistTable.toLabel({ ...base, notes: 'for art class' });
    expect(label).toContain('(for art class)');
  });

  it('should omit notes section when notes is N/A', () => {
    // Covers the s.notes !== 'N/A' false branch
    const label = supplylistTable.toLabel({ ...base, notes: 'N/A' });
    expect(label).not.toContain('N/A');
    expect(label).not.toContain('(');
  });

  it('should handle undefined brand gracefully (attrStr ?? [] fallback for exactly/anyOf)', () => {
    // When brand is undefined, a?.exactly and a?.anyOf are undefined → ?? [] kicks in
    const label = supplylistTable.toLabel({ ...base, brand: undefined } as unknown as SupplyList);
    expect(typeof label).toBe('string');
    expect(label).toBeTruthy();
  });

  it('should handle undefined color gracefully', () => {
    const label = supplylistTable.toLabel({ ...base, color: undefined } as unknown as SupplyList);
    expect(typeof label).toBe('string');
  });

  it('should handle undefined type gracefully', () => {
    const label = supplylistTable.toLabel({ ...base, type: undefined } as unknown as SupplyList);
    expect(typeof label).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for SupplyListComponent#cancelEdit() without prior startEdit
// ─────────────────────────────────────────────────────────────────────────────
describe('SupplyListComponent#cancelEdit() without prior startEdit', () => {
  let supplylistTable: SupplyListComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SupplyListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SupplyListService, useClass: MockSupplyListService },
        { provide: AuthService, useValue: { hasPermission: () => true } }, // Tests have permissions
        provideRouter([])
      ],
    });
  });

  beforeEach(fakeAsync(() => {
    TestBed.compileComponents().then(() => {
      const fixture = TestBed.createComponent(SupplyListComponent);
      supplylistTable = fixture.componentInstance;
      fixture.detectChanges();
    });
    flushMicrotasks();
    tick(300);
  }));

  it('should not throw when cancelEdit is called without prior startEdit (editingBackup is null)', () => {
    // editingBackup is null initially — covers the if(this.editingBackup) false branch (line 244)
    expect(() => supplylistTable.cancelEdit()).not.toThrow();
    expect(supplylistTable.editingItemId).toBeNull();
  });

  it('toggleAll toggles allExpanded signal from false to true', () => {
    expect(supplylistTable.allExpanded()).toBeFalse();
    supplylistTable.toggleAll();
    expect(supplylistTable.allExpanded()).toBeTrue();
  });

  it('toggleAll toggles allExpanded signal from true back to false', () => {
    supplylistTable.toggleAll(); // false → true
    supplylistTable.toggleAll(); // true → false
    expect(supplylistTable.allExpanded()).toBeFalse();
  });
});
