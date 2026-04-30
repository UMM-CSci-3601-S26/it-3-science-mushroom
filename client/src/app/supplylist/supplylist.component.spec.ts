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

describe('SupplyList Table', () => {
  let supplylistTable: SupplyListComponent;
  let fixture: ComponentFixture<SupplyListComponent>
  let supplylistService: SupplyListService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SupplyListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SupplyListService, useClass: MockSupplyListService },
        { provide: AuthService, useValue: { hasPermission: () => true } }, // Tests have permission to run
        provideRouter([])
      ],
    });
  });

  beforeEach(fakeAsync(() => {
    TestBed.compileComponents().then(() => {
      fixture = TestBed.createComponent(SupplyListComponent);
      supplylistTable = fixture.componentInstance;
      supplylistService = TestBed.inject(SupplyListService);
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

  it('should group supplies with missing school/grade under fallback labels', fakeAsync(() => {
    spyOn(supplylistService, 'getSupplyList').and.returnValue(of([
      {
        _id: '',
        academicYear: '',
        teacher: '',
        school: '',
        grade: '',
        item: ['Pencil'],
        brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] },
        packageSize: 1,
        size: { allOf: '', anyOf: [] },
        type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] },
        quantity: 0,
        notes: ''
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
        school: 'MHS', grade: 'PreK', item: ['Eraser'], brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] }, size: { allOf: '', anyOf: [] }, type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] }, packageSize: 1, quantity: 1, notes: ''
      };
      supplylistTable.dataSource.data = [itemWithId];

      spyOn(window, 'confirm').and.returnValue(true);
      const deleteSpy = spyOn(supplylistService, 'deleteSupplyList').and.returnValue(of(undefined));

      supplylistTable.confirmDelete('delete-me');
      tick(300);
      fixture.detectChanges();

      expect(deleteSpy).toHaveBeenCalledWith('delete-me');
      expect(supplylistTable.dataSource.data.find(i => i._id === 'delete-me')).toBeUndefined();
    }));

    it('does nothing when the user cancels the confirm dialog', fakeAsync(() => {
      const itemWithId: SupplyList = {
        _id: 'keep-me',
        academicYear: '',
        teacher: '',
        school: 'MHS', grade: 'PreK', item: ['Ruler'], brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] }, size: { allOf: '', anyOf: [] }, type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] }, packageSize: 1, quantity: 1, notes: ''
      };
      supplylistTable.dataSource.data = [itemWithId];

      spyOn(window, 'confirm').and.returnValue(false);
      const deleteSpy = spyOn(supplylistService, 'deleteSupplyList').and.returnValue(of(undefined));

      supplylistTable.confirmDelete('keep-me');
      tick();

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(supplylistTable.dataSource.data).toContain(itemWithId);
    }));

    it('does nothing when id is undefined', fakeAsync(() => {
      spyOn(window, 'confirm').and.returnValue(true);
      const deleteSpy = spyOn(supplylistService, 'deleteSupplyList').and.returnValue(of(undefined));

      supplylistTable.confirmDelete(undefined);
      tick();

      expect(deleteSpy).not.toHaveBeenCalled();
    }));

    it('sets errMsg when deleteSupplyList() returns an error', fakeAsync(() => {
      const itemWithId: SupplyList = {
        _id: 'fail-delete',
        academicYear: '',
        teacher: '',
        school: 'MHS', grade: 'PreK', item: ['Tape'], brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] }, size: { allOf: '', anyOf: [] }, type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] }, packageSize: 1, quantity: 1, notes: ''
      };
      supplylistTable.dataSource.data = [itemWithId];

      spyOn(window, 'confirm').and.returnValue(true);
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
        school: 'MHS', grade: 'PreK', item: ['Marker'], brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] }, size: { allOf: '', anyOf: [] }, type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] }, packageSize: 1, quantity: 1, notes: ''
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
        brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] },
        size: { allOf: '', anyOf: [] },
        type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] },
        packageSize: 1,
        quantity: 2,
        notes: ''
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
        brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] },
        size: { allOf: '', anyOf: [] },
        type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] },
        packageSize: 1,
        quantity: 1,
        notes: ''
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
        brand: { allOf: '', anyOf: ['Crayola'] },
        color: { allOf: [], anyOf: ['Red'] },
        size: { allOf: '', anyOf: [] },
        type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] },
        packageSize: 1,
        quantity: 3,
        notes: ''
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
        brand: { allOf: '', anyOf: ['Five Star'] },
        color: { allOf: [], anyOf: ['Blue'] },
        size: { allOf: 'Wide Ruled', anyOf: [] },
        type: { allOf: 'Spiral', anyOf: [] },
        material: { allOf: '', anyOf: [] },
        packageSize: 1,
        quantity: 2,
        notes: ''
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
        brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] },
        size: { allOf: '', anyOf: [] },
        type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] },
        packageSize: 1,
        quantity: 1,
        notes: ''
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
        brand: { allOf: '', anyOf: [] },
        color: { allOf: [], anyOf: [] },
        size: { allOf: '', anyOf: [] },
        type: { allOf: '', anyOf: [] },
        material: { allOf: '', anyOf: [] },
        packageSize: 1,
        quantity: 1,
        notes: ''
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
    brand: { allOf: '', anyOf: [] }, color: { allOf: [], anyOf: [] },
    size: { allOf: '', anyOf: [] }, type: { allOf: '', anyOf: [] },
    material: { allOf: '', anyOf: [] }, packageSize: 0, quantity: 1, notes: ''
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

  it('should include brand allOf values in the label', () => {
    const label = supplylistTable.toLabel({ ...base, brand: { allOf: ['Crayola'], anyOf: [] } } as unknown as SupplyList);
    expect(label).toContain('Crayola');
  });

  it('should include brand anyOf values in the label', () => {
    const label = supplylistTable.toLabel({ ...base, brand: { allOf: [], anyOf: ['Expo'] } } as unknown as SupplyList);
    expect(label).toContain('Expo');
  });

  it('should not pluralize size when quantity is 1', () => {
    const label = supplylistTable.toLabel({ ...base, size: { allOf: 'pack', anyOf: [] }, quantity: 1 } as unknown as SupplyList);
    expect(label).toContain('pack of');
    expect(label).not.toContain('packs');
  });

  it('should omit size section when size is empty string', () => {
    const label = supplylistTable.toLabel({ ...base, size: { allOf: '', anyOf: [] } } as unknown as SupplyList);
    expect(label).not.toContain(' of ');
  });

  it('should omit size section when size is N/A', () => {
    const label = supplylistTable.toLabel({ ...base, size: { allOf: 'N/A', anyOf: [] } } as unknown as SupplyList);
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

  it('should handle undefined brand gracefully (attrStr ?? [] fallback for allOf/anyOf)', () => {
    // When brand is undefined, a?.allOf and a?.anyOf are undefined → ?? [] kicks in
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
