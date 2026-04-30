import { Component } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MockSupplyListService } from 'src/testing/supplylist.service.mock';
import { AddSupplyListComponent } from './add-supplylist.component';
import { SupplyListService } from '../supplylist.service';
import { GRADES } from '../supplylist';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { AbstractControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { TermsService } from '../../terms/terms.service';

// Minimal terms object reused across parse / helper tests
const testTerms = {
  item:     ['crayon', 'marker', 'notebook', 'pencil', 'folder', 'tissue'],
  brand:    ['Crayola', 'Kleenex', 'Expo', 'BIC'],
  color:    ['red', 'blue', 'green', 'yellow', 'black'],
  size:     ['letter', 'legal', 'wide ruled', 'college ruled'],
  type:     ['spiral', 'washable'],
  material: ['plastic', 'paper']
};

@Component({ template: '', standalone: true })
class DummyRouteComponent {}

// ─── Shared provider array ────────────────────────────────────────────────────
const sharedProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([
    { path: 'supplylist', component: DummyRouteComponent }
  ]),
  { provide: SupplyListService, useClass: MockSupplyListService }
];

// ─── Helper: create component and inject test terms synchronously ─────────────
function createComponentWithTerms(): { component: AddSupplyListComponent; fixture: ComponentFixture<AddSupplyListComponent> } {
  const fixture = TestBed.createComponent(AddSupplyListComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (component as any).terms = testTerms;
  return { component, fixture };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('AddSupplyListComponent', () => {
  let addSupplyListComponent: AddSupplyListComponent;
  let addSupplyListForm: FormGroup;
  let fixture: ComponentFixture<AddSupplyListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: sharedProviders
    }).compileComponents().catch(error => {
      expect(error).toBeNull();
    });
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddSupplyListComponent);
    addSupplyListComponent = fixture.componentInstance;
    fixture.detectChanges();
    addSupplyListForm = addSupplyListComponent.addSupplyListForm;
    expect(addSupplyListForm).toBeDefined();
    expect(addSupplyListForm.controls).toBeDefined();
  });

  it('should create the component and form', () => {
    expect(addSupplyListComponent).toBeTruthy();
    expect(addSupplyListForm).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(addSupplyListForm.valid).toBeFalsy();
  });

  describe('The school field', () => {
    let schoolControl: AbstractControl;

    beforeEach(() => {
      schoolControl = addSupplyListForm.controls['school'];
    });

    it('should not allow empty school', () => {
      schoolControl.setValue('');
      expect(schoolControl.valid).toBeFalsy();
    });

    it('should be valid with a school name', () => {
      schoolControl.setValue('MHS');
      expect(schoolControl.valid).toBeTruthy();
    });
  });

  describe('The grade field', () => {
    let gradeControl: AbstractControl;

    beforeEach(() => {
      gradeControl = addSupplyListForm.controls['grade'];
    });

    it('should not allow empty grade', () => {
      gradeControl.setValue('');
      expect(gradeControl.valid).toBeFalsy();
    });

    it('should be valid with a grade value', () => {
      gradeControl.setValue('3rd');
      expect(gradeControl.valid).toBeTruthy();
    });

    it('should be valid with "High School"', () => {
      gradeControl.setValue('High School');
      expect(gradeControl.valid).toBeTruthy();
    });
  });

  describe('GRADES constant', () => {
    it('should include "High School" as a selectable grade', () => {
      expect(GRADES).toContain('High School');
    });

    it('should still include all numeric grades 1–12', () => {
      for (let g = 1; g <= 12; g++) {
        expect(GRADES).toContain(String(g));
      }
    });

    it('should still include PreK and Kindergarten', () => {
      expect(GRADES).toContain('PreK');
      expect(GRADES).toContain('Kindergarten');
    });
  });

  describe('The item field', () => {
    let itemControl: AbstractControl;

    beforeEach(() => {
      itemControl = addSupplyListForm.controls['item'];
    });

    it('should not allow empty item', () => {
      itemControl.setValue('');
      expect(itemControl.valid).toBeFalsy();
    });

    it('should be valid with an item name', () => {
      itemControl.setValue('Markers');
      expect(itemControl.valid).toBeTruthy();
    });
  });

  describe('The brand field', () => {
    let brandControl: AbstractControl;

    beforeEach(() => {
      brandControl = addSupplyListForm.controls['brand'];
    });

    it('should allow empty brand (optional field)', () => {
      brandControl.setValue('');
      expect(brandControl.valid).toBeTruthy();
    });

    it('should be valid with a brand name', () => {
      brandControl.setValue('Crayola');
      expect(brandControl.valid).toBeTruthy();
    });
  });

  describe('The color field', () => {
    let colorControl: AbstractControl;

    beforeEach(() => {
      colorControl = addSupplyListForm.controls['color'];
    });

    it('should allow empty color (optional field)', () => {
      colorControl.setValue('');
      expect(colorControl.valid).toBeTruthy();
    });

    it('should be valid with a color value', () => {
      colorControl.setValue('Red');
      expect(colorControl.valid).toBeTruthy();
    });
  });

  describe('The packageSize field', () => {
    let packageSizeControl: AbstractControl;

    beforeEach(() => {
      packageSizeControl = addSupplyListForm.controls['packageSize'];
    });

    it('should allow empty packageSize (no required validator)', () => {
      packageSizeControl.setValue('');
      expect(packageSizeControl.valid).toBeTruthy();
    });

    it('should be valid with a positive number', () => {
      packageSizeControl.setValue(5);
      expect(packageSizeControl.valid).toBeTruthy();
    });

    it('should not allow packageSize less than 1', () => {
      packageSizeControl.setValue(0);
      expect(packageSizeControl.valid).toBeFalsy();
      expect(packageSizeControl.hasError('min')).toBeTruthy();
    });
  });

  describe('The size field', () => {
    let sizeControl: AbstractControl;

    beforeEach(() => {
      sizeControl = addSupplyListForm.controls['size'];
    });

    it('should allow empty size (optional field)', () => {
      sizeControl.setValue('');
      expect(sizeControl.valid).toBeTruthy();
    });

    it('should be valid with a size value', () => {
      sizeControl.setValue('Wide');
      expect(sizeControl.valid).toBeTruthy();
    });
  });

  describe('The type field', () => {
    let typeControl: AbstractControl;

    beforeEach(() => {
      typeControl = addSupplyListForm.controls['type'];
    });

    it('should allow empty type (optional field)', () => {
      typeControl.setValue('');
      expect(typeControl.valid).toBeTruthy();
    });

    it('should be valid with a type value', () => {
      typeControl.setValue('Washable');
      expect(typeControl.valid).toBeTruthy();
    });
  });

  describe('The material field', () => {
    let materialControl: AbstractControl;

    beforeEach(() => {
      materialControl = addSupplyListForm.controls['material'];
    });

    it('should allow empty material (optional field)', () => {
      materialControl.setValue('');
      expect(materialControl.valid).toBeTruthy();
    });

    it('should be valid with a material value', () => {
      materialControl.setValue('Plastic');
      expect(materialControl.valid).toBeTruthy();
    });
  });

  describe('The quantity field', () => {
    let quantityControl: AbstractControl;

    beforeEach(() => {
      quantityControl = addSupplyListForm.controls['quantity'];
    });

    it('should not allow empty quantity', () => {
      quantityControl.setValue('');
      expect(quantityControl.valid).toBeFalsy();
    });

    it('should be valid with a positive number', () => {
      quantityControl.setValue(4);
      expect(quantityControl.valid).toBeTruthy();
    });

    it('should not allow quantity less than 1', () => {
      quantityControl.setValue(0);
      expect(quantityControl.valid).toBeFalsy();
      expect(quantityControl.hasError('min')).toBeTruthy();
    });
  });

  describe('The notes field', () => {
    let notesControl: AbstractControl;

    beforeEach(() => {
      notesControl = addSupplyListForm.controls['notes'];
    });

    it('should allow empty notes', () => {
      notesControl.setValue('');
      expect(notesControl.valid).toBeTruthy();
    });

    it('should be valid with notes text', () => {
      notesControl.setValue('Some extra notes');
      expect(notesControl.valid).toBeTruthy();
    });
  });

  describe('getErrorMessage()', () => {
    it('should return the correct error messages for required fields', () => {
      let controlName: keyof typeof addSupplyListComponent.validationMessages = 'school';
      addSupplyListComponent.addSupplyListForm.get(controlName)!.setErrors({ required: true });
      expect(addSupplyListComponent.getErrorMessage(controlName)).toEqual('School is required');

      controlName = 'item';
      addSupplyListComponent.addSupplyListForm.get(controlName)!.setErrors({ required: true });
      expect(addSupplyListComponent.getErrorMessage(controlName)).toEqual('Item is required');

      controlName = 'quantity';
      addSupplyListComponent.addSupplyListForm.get(controlName)!.setErrors({ required: true });
      expect(addSupplyListComponent.getErrorMessage(controlName)).toEqual('Quantity is required');

      controlName = 'quantity';
      addSupplyListComponent.addSupplyListForm.get(controlName)!.setErrors({ min: true });
      expect(addSupplyListComponent.getErrorMessage(controlName)).toEqual('Quantity must be at least 1');

      controlName = 'packageSize';
      addSupplyListComponent.addSupplyListForm.get(controlName)!.setErrors({ min: true });
      expect(addSupplyListComponent.getErrorMessage(controlName)).toEqual('Count must be at least 1');
    });

    it('should return "Unknown error" if no error message is found', () => {
      const controlName: keyof typeof addSupplyListComponent.validationMessages = 'notes';
      addSupplyListComponent.addSupplyListForm.get(controlName)!.setErrors({ unknown: true });
      expect(addSupplyListComponent.getErrorMessage(controlName)).toEqual('Unknown error');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for AddSupplyListComponent#submitForm()
// ─────────────────────────────────────────────────────────────────────────────
describe('AddSupplyListComponent#submitForm()', () => {
  let component: AddSupplyListComponent;
  let fixture: ComponentFixture<AddSupplyListComponent>;
  let supplyListService: SupplyListService;
  let location: Location;
  let router: Router;

  // All 12 form controls must be supplied for setValue() to work
  const validFormValues = {
    school:   'MHS',
    grade:    'PreK',
    item:     'Markers',
    brand:    'Crayola',
    color:    'N/A',
    packageSize:    '8',
    size:     'Wide',
    type:     'Washable',
    material: 'N/A',
    quantity: '3',
    notes:    ''
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: sharedProviders
    }).compileComponents().catch(error => {
      expect(error).toBeNull();
    });
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddSupplyListComponent);
    component = fixture.componentInstance;
    supplyListService = TestBed.inject(SupplyListService);
    location = TestBed.inject(Location);
    router = TestBed.inject(Router);
    TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  beforeEach(() => {
    component.addSupplyListForm.setValue(validFormValues);
  });

  it('should call addSupplyList() and navigate to /supplylist on success', () => {
    const addSupplyListSpy = spyOn(supplyListService, 'addSupplyList').and.returnValue(of(undefined));
    const navigateSpy = spyOn(router, 'navigate');
    component.submitForm();
    expect(addSupplyListSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/supplylist']);
  });

  it('should call addSupplyList() and handle 500 error response', () => {
    const path = location.path();
    const errorResponse = { status: 500, message: 'Server error' };
    const addSupplyListSpy = spyOn(supplyListService, 'addSupplyList')
      .and.returnValue(throwError(() => errorResponse));
    component.submitForm();
    expect(addSupplyListSpy).toHaveBeenCalled();
    expect(location.path()).toBe(path);
  });

  it('should call addSupplyList() and handle 400 error response', () => {
    const path = location.path();
    const errorResponse = { status: 400, message: 'Bad request' };
    const addSupplyListSpy = spyOn(supplyListService, 'addSupplyList')
      .and.returnValue(throwError(() => errorResponse));
    component.submitForm();
    expect(addSupplyListSpy).toHaveBeenCalled();
    expect(location.path()).toBe(path);
  });

  it('should call addSupplyList() and handle 404 error response', () => {
    const path = location.path();
    const errorResponse = { status: 404, message: 'Not found' };
    const addSupplyListSpy = spyOn(supplyListService, 'addSupplyList')
      .and.returnValue(throwError(() => errorResponse));
    component.submitForm();
    expect(addSupplyListSpy).toHaveBeenCalled();
    expect(location.path()).toBe(path);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for AddSupplyListComponent#parseDescription()
// ─────────────────────────────────────────────────────────────────────────────
describe('AddSupplyListComponent#parseDescription()', () => {
  let component: AddSupplyListComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: sharedProviders
    }).compileComponents();
  }));

  beforeEach(() => {
    ({ component } = createComponentWithTerms());
  });

  it('should do nothing for empty input', () => {
    component.parseDescription('');
    expect(component.showPreview).toBeFalse();
  });

  it('should do nothing for whitespace-only input', () => {
    component.parseDescription('   ');
    expect(component.showPreview).toBeFalse();
  });

  it('should set showPreview to true on any non-empty input', () => {
    component.parseDescription('notebook');
    expect(component.showPreview).toBeTrue();
  });

  it('should parse quantity from a leading number', () => {
    component.parseDescription('3 notebooks');
    expect(component.addSupplyListForm.get('quantity')?.value).toBe('3');
  });

  it('should parse quantity from a "N boxes of …" pattern', () => {
    component.parseDescription('2 boxes of crayons');
    expect(component.addSupplyListForm.get('quantity')?.value).toBe('2');
  });

  it('should parse packageSize from a "N count" pattern', () => {
    component.parseDescription('24 count crayons');
    expect(component.addSupplyListForm.get('packageSize')?.value).toBe('24');
  });

  it('should parse packageSize from a "pack of N" pattern', () => {
    component.parseDescription('pack of 12 crayons');
    expect(component.addSupplyListForm.get('packageSize')?.value).toBe('12');
  });

  it('should match an item by exact term', () => {
    component.parseDescription('notebook');
    expect(component.addSupplyListForm.get('item')?.value).toBe('notebook');
  });

  it('should match an item using its plural form (crayons → crayon)', () => {
    component.parseDescription('crayons');
    expect(component.addSupplyListForm.get('item')?.value).toBe('crayon');
  });

  it('should match a brand from the terms list', () => {
    component.parseDescription('Crayola markers');
    expect(component.addSupplyListForm.get('brand')?.value).toBe('Crayola');
  });

  it('should infer item from brand hint when no item is in the input (Kleenex → tissue)', () => {
    component.parseDescription('Kleenex');
    expect(component.addSupplyListForm.get('item')?.value).toBe('tissue');
  });

  it('should detect a single color', () => {
    component.parseDescription('red notebook');
    expect(component.addSupplyListForm.get('color')?.value).toBe('red');
  });

  it('should join multiple colors with ", " when "or" is absent (allOf)', () => {
    component.parseDescription('red and blue notebook');
    const color = component.addSupplyListForm.get('color')?.value as string;
    expect(color).toContain('red');
    expect(color).toContain('blue');
    expect(color).not.toContain('|');
  });

  it('should join multiple colors with " | " when "or" is present (anyOf)', () => {
    component.parseDescription('red or blue notebook');
    const color = component.addSupplyListForm.get('color')?.value as string;
    expect(color).toContain('red');
    expect(color).toContain('blue');
    expect(color).toContain('|');
  });

  it('should parse a parenthetical note into the notes field', () => {
    component.parseDescription('crayons (for art class)');
    expect(component.addSupplyListForm.get('notes')?.value).toBe('for art class');
  });

  it('should NOT put a count-like parenthetical into notes', () => {
    component.parseDescription('crayons (24 ct.)');
    expect(component.addSupplyListForm.get('notes')?.value || '').toBe('');
    expect(component.addSupplyListForm.get('packageSize')?.value).toBe('24');
  });

  it('should append a new note to existing notes, separated by "; "', () => {
    component.addSupplyListForm.patchValue({ notes: 'existing note' });
    component.parseDescription('crayons (for art class)');
    expect(component.addSupplyListForm.get('notes')?.value).toBe('existing note; for art class');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for AddSupplyListComponent#clearForm()
// ─────────────────────────────────────────────────────────────────────────────
describe('AddSupplyListComponent#clearForm()', () => {
  let component: AddSupplyListComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: sharedProviders
    }).compileComponents();
  }));

  beforeEach(() => {
    ({ component } = createComponentWithTerms());
  });

  it('should reset all form controls to null', () => {
    component.addSupplyListForm.patchValue({ school: 'MHS', grade: 'K', item: 'notebook', quantity: '2' });
    component.clearForm();
    expect(component.addSupplyListForm.get('school')?.value).toBeNull();
    expect(component.addSupplyListForm.get('grade')?.value).toBeNull();
    expect(component.addSupplyListForm.get('item')?.value).toBeNull();
    expect(component.addSupplyListForm.get('quantity')?.value).toBeNull();
  });

  it('should clear descriptionInput', () => {
    component.descriptionInput = 'some text';
    component.clearForm();
    expect(component.descriptionInput).toBe('');
  });

  it('should hide the preview card', () => {
    component.showPreview = true;
    component.clearForm();
    expect(component.showPreview).toBeFalse();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for private helper methods
// ─────────────────────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
describe('AddSupplyListComponent private helpers', () => {
  let component: AddSupplyListComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: sharedProviders
    }).compileComponents();
  }));

  beforeEach(() => {
    ({ component } = createComponentWithTerms());
  });

  // ── pluralForms() ──────────────────────────────────────────────────────────
  describe('pluralForms()', () => {
    it('should include both singular and the -s plural for regular words', () => {
      const forms = (component as any).pluralForms('crayon') as string[];
      expect(forms).toContain('crayon');
      expect(forms).toContain('crayons');
    });

    it('should generate the -ies plural for consonant+y words', () => {
      const forms = (component as any).pluralForms('candy') as string[];
      expect(forms).toContain('candy');
      expect(forms).toContain('candies');
    });

    it('should recover the singular by stripping -ies', () => {
      const forms = (component as any).pluralForms('candies') as string[];
      expect(forms).toContain('candies');
      expect(forms).toContain('candy');
    });

    it('should generate the -es plural for words ending in -sh', () => {
      const forms = (component as any).pluralForms('brush') as string[];
      expect(forms).toContain('brush');
      expect(forms).toContain('brushes');
    });

    it('should recover the singular by stripping -es for -sh words', () => {
      const forms = (component as any).pluralForms('brushes') as string[];
      expect(forms).toContain('brushes');
      expect(forms).toContain('brush');
    });

    it('should recover the singular by stripping a trailing -s', () => {
      const forms = (component as any).pluralForms('crayons') as string[];
      expect(forms).toContain('crayons');
      expect(forms).toContain('crayon');
    });

    it('should not generate a double -s for words already ending in -s', () => {
      const forms = (component as any).pluralForms('scissors') as string[];
      expect(forms).not.toContain('scissorss');
    });
  });

  // ── bestTermMatch() ────────────────────────────────────────────────────────
  describe('bestTermMatch()', () => {
    it('should return null for an empty terms list', () => {
      const result = (component as any).bestTermMatch('notebook', []) as string | null;
      expect(result).toBeNull();
    });

    it('should return null when no term matches', () => {
      const result = (component as any).bestTermMatch('notaword', ['crayon', 'marker']) as string | null;
      expect(result).toBeNull();
    });

    it('should return the matching term', () => {
      const result = (component as any).bestTermMatch('notebook', ['crayon', 'notebook', 'marker']) as string | null;
      expect(result).toBe('notebook');
    });

    it('should prefer the longest matching term to avoid false partial matches', () => {
      const result = (component as any).bestTermMatch('marker', ['mark', 'marker']) as string | null;
      expect(result).toBe('marker');
    });

    it('should match via plural form ("crayons" matches term "crayon")', () => {
      const result = (component as any).bestTermMatch('crayons', ['crayon', 'marker']) as string | null;
      expect(result).toBe('crayon');
    });

    it('should not match a partial substring that lacks a word boundary', () => {
      // "pen" must NOT match inside "pencil"
      const result = (component as any).bestTermMatch('pencil', ['pen']) as string | null;
      expect(result).toBeNull();
    });

    it('should preserve the original casing of the term from the list', () => {
      const result = (component as any).bestTermMatch('crayola', ['Crayola']) as string | null;
      expect(result).toBe('Crayola');
    });
  });

  // ── allTermMatches() ───────────────────────────────────────────────────────
  describe('allTermMatches()', () => {
    it('should return an empty array when terms is empty', () => {
      const result = (component as any).allTermMatches('red notebook', []) as string[];
      expect(result).toEqual([]);
    });

    it('should return all terms that appear in the input', () => {
      const result = (component as any).allTermMatches('red and blue notebook', ['red', 'blue', 'green']) as string[];
      expect(result).toContain('red');
      expect(result).toContain('blue');
      expect(result).not.toContain('green');
    });

    it('should not return duplicates even when a term appears multiple times', () => {
      const result = (component as any).allTermMatches('red and red again', ['red']) as string[];
      expect(result.length).toBe(1);
    });

    it('should match terms via plural forms', () => {
      const result = (component as any).allTermMatches('i need crayons and markers', ['crayon', 'marker']) as string[];
      expect(result).toContain('crayon');
      expect(result).toContain('marker');
    });

    it('should return an empty array when no terms match', () => {
      const result = (component as any).allTermMatches('notebook', ['crayon', 'marker']) as string[];
      expect(result).toEqual([]);
    });
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────────────────────────────────────
// Tests for AddSupplyListComponent#ngOnInit() with school/grade query params
// ─────────────────────────────────────────────────────────────────────────────
describe('AddSupplyListComponent#ngOnInit() with route query params', () => {
  let component: AddSupplyListComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SupplyListService, useClass: MockSupplyListService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => {
                  if (key === 'school') return 'South High';
                  if (key === 'grade') return '3rd Grade';
                  return null;
                }
              }
            }
          }
        }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    ({ component } = createComponentWithTerms());
  });

  it('should pre-populate school from route query param', () => {
    expect(component.addSupplyListForm.get('school')?.value).toBe('South High');
  });

  it('should pre-populate grade from route query param', () => {
    expect(component.addSupplyListForm.get('grade')?.value).toBe('3rd Grade');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for AddSupplyListComponent#ngOnInit() — getTerms error path
// ─────────────────────────────────────────────────────────────────────────────
describe('AddSupplyListComponent#ngOnInit() — getTerms error path', () => {
  let component: AddSupplyListComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SupplyListService, useClass: MockSupplyListService },
        {
          provide: TermsService,
          useValue: {
            getTerms: () => throwError(() => new Error('Terms unavailable'))
          }
        }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    ({ component } = createComponentWithTerms());
  });

  it('should initialise filteredItem$ to emit empty array on getTerms error', (done) => {
    component.filteredItem$.subscribe(items => {
      expect(items).toEqual([]);
      done();
    });
  });

  it('should initialise filteredBrand$ to emit empty array on getTerms error', (done) => {
    component.filteredBrand$.subscribe(items => {
      expect(items).toEqual([]);
      done();
    });
  });

  it('should initialise filteredColor$ to emit empty array on getTerms error', (done) => {
    component.filteredColor$.subscribe(items => {
      expect(items).toEqual([]);
      done();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for AddSupplyListComponent#submitForm() — pipe separator (anyOf) path
// ─────────────────────────────────────────────────────────────────────────────
describe('AddSupplyListComponent#submitForm() — pipe separator (anyOf) path', () => {
  let component: AddSupplyListComponent;
  let supplyListService: SupplyListService;

  const baseFormValues = {
    school: 'MHS', grade: 'PreK', item: 'Markers',
    brand: '', color: '', packageSize: '', size: '', type: '', material: '', quantity: '1', notes: ''
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: sharedProviders
    }).compileComponents();
  }));

  beforeEach(() => {
    ({ component } = createComponentWithTerms());
    supplyListService = TestBed.inject(SupplyListService);
    component.addSupplyListForm.setValue(baseFormValues);
  });

  it('should map a | separator to anyOf when submitting', () => {
    const addSpy = spyOn(supplyListService, 'addSupplyList').and.returnValue(of(undefined));
    component.addSupplyListForm.patchValue({ color: 'red | blue' });
    component.submitForm();
    expect(addSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      color: jasmine.objectContaining({ anyOf: ['red', 'blue'], allOf: [] })
    }));
  });

  it('should map a comma-separated value to allOf when submitting', () => {
    const addSpy = spyOn(supplyListService, 'addSupplyList').and.returnValue(of(undefined));
    component.addSupplyListForm.patchValue({ color: 'Red, Blue' });
    component.submitForm();
    expect(addSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      color: jasmine.objectContaining({ allOf: ['Red', 'Blue'], anyOf: [] })
    }));
  });

  it('should produce empty allOf/anyOf for empty field (toAttr empty-val branch)', () => {
    const addSpy = spyOn(supplyListService, 'addSupplyList').and.returnValue(of(undefined));
    // brand, type etc. are all empty — toAttr('') should return { allOf:[], anyOf:[] }
    component.submitForm();
    expect(addSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      brand: { allOf: "", anyOf: [] },
      type: { allOf: "", anyOf: [] }
    }));
  });

  it('should produce empty allOf/anyOf for empty color field', () => {
    const addSpy = spyOn(supplyListService, 'addSupplyList').and.returnValue(of(undefined));
    // color is empty — toAttr('') should return { allOf:[], anyOf:[] } rather than null or undefined
    component.submitForm();
    expect(addSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      color: { allOf: [], anyOf: [] }
    }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for AddSupplyListComponent#parseDescription() — note-filter edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe('AddSupplyListComponent#parseDescription() — note filter edge cases', () => {
  let component: AddSupplyListComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AddSupplyListComponent, MatSnackBarModule],
      providers: sharedProviders
    }).compileComponents();
  }));

  beforeEach(() => {
    ({ component } = createComponentWithTerms());
  });

  it('should ignore an empty-string fragment from empty parentheses like ()', () => {
    // '()' → fragment is '' → !fragment is true → filtered out, not added to notes
    component.parseDescription('crayon ()');
    expect(component.addSupplyListForm.get('notes')?.value || '').toBe('');
  });

  it('should not add a known-term paren into notes (bestTermMatch returns non-null)', () => {
    // '(Crayola)' → fragment matches brand term → filtered out, not added to notes
    component.parseDescription('crayon (Crayola)');
    expect(component.addSupplyListForm.get('notes')?.value || '').toBe('');
  });
});
