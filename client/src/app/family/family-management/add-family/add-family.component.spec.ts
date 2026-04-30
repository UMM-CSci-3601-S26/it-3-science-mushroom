// Angular Imports
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AbstractControl, FormGroup , UntypedFormGroup } from '@angular/forms';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter } from '@angular/router';

// RxJS Imports
import { throwError, of } from 'rxjs'; //of

// Family Imports
import { MockFamilyService } from 'src/testing/family.service.mock';
import { AddFamilyComponent } from './add-family.component';
import { FamilyService } from '../../family.service';

// Settings imports
import { SettingsService } from '../../../settings/settings.service';
import { AppSettings } from '../../../settings/settings';

describe('AddFamilyComponent', () => {
  let addFamilyComponent: AddFamilyComponent;
  let addFamilyForm: FormGroup;
  let fixture: ComponentFixture<AddFamilyComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        AddFamilyComponent,
        MatSnackBarModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: FamilyService,
          useClass: MockFamilyService
        },
        {
          provide: SettingsService,
          useValue: { getSettings: () => of({ schools: [{ name: 'Test School', abbreviation: 'TS' }] } as unknown as AppSettings) }
        }
      ]
    }).compileComponents().catch(error => {
      expect(error).toBeNull();
    });
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddFamilyComponent);
    addFamilyComponent = fixture.componentInstance;
    fixture.detectChanges();
    addFamilyForm = addFamilyComponent.addFamilyForm;
    expect(addFamilyForm).toBeDefined();
    expect(addFamilyForm.controls).toBeDefined();
  });

  // Not terribly important; if the component doesn't create
  // successfully that will probably blow up a lot of things.
  // Including it, though, does give us confidence that our
  // our component definitions don't have errors that would
  // prevent them from being successfully constructed.
  it('should create the component and form', () => {
    expect(addFamilyComponent).toBeTruthy();
    expect(addFamilyForm).toBeTruthy();
  });

  // Confirms that an initial, empty form is *not* valid, so
  // people can't submit an empty form.
  it('form should be invalid when empty', () => {
    expect(addFamilyForm.valid).toBeFalsy();
  });

  describe('Guardian first and last name fields', () => {
    let guardianFirstNameControl: AbstractControl;
    let guardianLastNameControl: AbstractControl;

    beforeEach(() => {
      guardianFirstNameControl = addFamilyComponent.addFamilyForm.controls.guardianFirstName;
      guardianLastNameControl = addFamilyComponent.addFamilyForm.controls.guardianLastName;
    });

    it('should not allow empty guardian names', () => {
      guardianFirstNameControl.setValue('');
      expect(guardianFirstNameControl.valid).toBeFalsy();

      guardianLastNameControl.setValue('');
      expect(guardianLastNameControl.valid).toBeFalsy();
    });

    it('should be fine with "Chris Smith"', () => {
      guardianFirstNameControl.setValue('Chris');
      expect(guardianFirstNameControl.valid).toBeTruthy();

      guardianLastNameControl.setValue('Smith');
      expect(guardianLastNameControl.valid).toBeTruthy();
    });

    it('should fail on single character guardian names', () => {
      guardianFirstNameControl.setValue('x');
      expect(guardianFirstNameControl.valid).toBeFalsy();
      expect(guardianFirstNameControl.hasError('minlength')).toBeTruthy();

      guardianLastNameControl.setValue('x');
      expect(guardianLastNameControl.valid).toBeFalsy();
      expect(guardianLastNameControl.hasError('minlength')).toBeTruthy();
    });

    it('should fail on really long guardian names', () => {
      guardianFirstNameControl.setValue('x'.repeat(100));
      expect(guardianFirstNameControl.valid).toBeFalsy();
      expect(guardianFirstNameControl.hasError('maxlength')).toBeTruthy();

      guardianLastNameControl.setValue('x'.repeat(100));
      expect(guardianLastNameControl.valid).toBeFalsy();
      expect(guardianLastNameControl.hasError('maxlength')).toBeTruthy();
    });
  });

  describe('Students FormArray', () => {
    // Confirms we start with an empty field
    it('should start with an empty students array', () => {
      const students = addFamilyComponent.students;
      expect(students).toBeDefined();
      expect(students.length).toBe(0);
    });

    it('should add a student when addStudent() is called', () => {
      addFamilyComponent.addStudent();
      const students = addFamilyComponent.students;

      expect(students.length).toBe(1);
      expect(students.at(0)).toBeTruthy();
      expect(students.at(0) instanceof FormGroup).toBeTrue();
    });

    it('should remove a student when removeStudent() is called', () => {
      addFamilyComponent.removeStudent(0);
      const students = addFamilyComponent.students;

      expect(students.length).toBe(0);
      expect(students.at(0)).toBeFalsy();
      expect(students.at(0) instanceof FormGroup).toBeFalse();
    });

    it('should be valid when all fields are filled with correct information', () => {
      addFamilyForm.controls.guardianFirstName.setValue('Chris');
      addFamilyForm.controls.guardianLastName.setValue('Smith');
      addFamilyForm.controls.timeSlot.setValue('9:00-10:00');
      addFamilyForm.controls.address.setValue('123 Avenue');
      addFamilyForm.controls.email.setValue('csmith@email.com');

      addFamilyComponent.addStudent();
      const student = addFamilyComponent.students.at(0);

      student.get('name')!.setValue('Jimmy');
      student.get('grade')!.setValue('3');
      student.get('school')!.setValue('Morris Elementary');
      student.get('teacher')!.setValue('Kurtis');

      expect(addFamilyForm.valid).toBeTrue();
    });

    it('should validate student name', () => {
      addFamilyComponent.addStudent();
      const student = addFamilyComponent.students.at(0);

      // Name should not be valid if there is no input
      const name = student.get('name')!;
      name.setValue('');
      expect(name.valid).toBeFalse();
      expect(name.hasError('required')).toBeTrue();

      // Name should not be valid unless there is more than one character in input
      name.setValue('A');
      expect(name.valid).toBeFalse();
      expect(name.hasError('minlength')).toBeTrue();

      // Name should be valid
      name.setValue('Lilly');
      expect(name.valid).toBeTrue();
    });

    it('should validate student grade, "Kindergarten", and "PreK"', () => {
      addFamilyComponent.addStudent();
      const student = addFamilyComponent.students.at(0);

      // Should be invalid with no input
      const grade = student.get('grade')!;
      grade.setValue('');
      expect(grade.valid).toBeFalse();
      expect(grade.hasError('required')).toBeTrue();

      // Should not be valid
      grade.setValue('abc');
      expect(grade.valid).toBeFalse();
      expect(grade.hasError('pattern')).toBeTrue();

      // Mixed values are invalid
      grade.setValue('k1');
      expect(grade.valid).toBeFalse();
      expect(grade.hasError('pattern')).toBeTrue();

      // Integers outside of 1-12 are invalid
      grade.setValue('13');
      expect(grade.valid).toBeFalse();

      // Integers 1-12 are valid
      grade.setValue('5');
      expect(grade.valid).toBeTrue();

      // "kindergarten" is an invalid input
      grade.setValue('kindergarten');
      expect(grade.valid).toBeFalse();
      expect(grade.hasError('pattern')).toBeTrue();

      // "Kindergarten" is a valid input
      grade.setValue('Kindergarten');
      expect(grade.valid).toBeTrue();

      // "pre-k" is an an invalid input
      grade.setValue('pre-k');
      expect(grade.valid).toBeFalse();
      expect(grade.hasError('pattern')).toBeTrue();

      // "PreK" is a valid input
      grade.setValue('PreK');
      expect(grade.valid).toBeTrue();
    });

    it('should validate student school', () => {
      addFamilyComponent.addStudent();
      const student = addFamilyComponent.students.at(0);

      // Should be invalid without input
      const school = student.get('school')!;
      school.setValue('');
      expect(school.valid).toBeFalse();
      expect(school.hasError('required')).toBeTrue();

      // Should be invalid without proper length
      school.setValue('A');
      expect(school.valid).toBeFalse();
      expect(school.hasError('minlength')).toBeTrue();

      // Should be valid
      school.setValue('Lincoln Elementary');
      expect(school.valid).toBeTrue();
    });
  });

  describe('The address field', () => {
    let addressControl: AbstractControl;

    beforeEach(() => {
      addressControl = addFamilyComponent.addFamilyForm.controls.address;
    });

    it('should not allow empty addresses', () => {
      addressControl.setValue('');
      expect(addressControl.valid).toBeFalsy();
    });

    it('should allow numbers and letters to input', () => {
      addressControl.setValue('123 Avenue');
      expect(addressControl.valid).toBeTruthy();
    });


  });

  describe('The email field', () => {
    let emailControl: AbstractControl;

    beforeEach(() => {
      emailControl = addFamilyComponent.addFamilyForm.controls.email;
    });

    it('should not allow empty values', () => {
      emailControl.setValue(null);
      expect(emailControl.valid).toBeFalsy();
      expect(emailControl.hasError('required')).toBeTruthy();
    });

    it('should fail without @', () => {
      emailControl.setValue('conniestewart');
      expect(emailControl.valid).toBeFalsy();
      expect(emailControl.hasError('pattern')).toBeTruthy();
    });

    it('should accept legal emails', () => {
      emailControl.setValue('conniestewart@ohmnet.com');
      expect(emailControl.valid).toBeTruthy();
    });
  });

  describe('control error helper methods', () => {
    it('formControlHasError should return true for invalid touched family control', () => {
      const controlFirstName = 'guardianFirstName';
      const control1 = addFamilyComponent.addFamilyForm.get(controlFirstName);

      control1?.setValue('');
      control1?.markAsTouched();

      expect(addFamilyComponent.formControlHasError(controlFirstName)).toBeTrue();

      const controlLastName = 'guardianLastName';
      const control2 = addFamilyComponent.addFamilyForm.get(controlLastName);

      control2?.setValue('');
      control2?.markAsTouched();

      expect(addFamilyComponent.formControlHasError(controlLastName)).toBeTrue();
    });

    it('studentControlHasError should return true for invalid touched student control', () => {
      addFamilyComponent.addStudent();
      const studentIndex = 0;
      const controlName: 'name' | 'grade' | 'school' = 'name';
      const control = (addFamilyComponent.students.at(studentIndex) as FormGroup).get(controlName);

      control?.setValue('');
      control?.markAsTouched();

      expect(addFamilyComponent.studentControlHasError(studentIndex, controlName)).toBeTrue();
    });

    it('studentControlHasError should return false when invalid student control is untouched', () => {
      addFamilyComponent.addStudent();
      const studentIndex = 0;
      const controlName: 'name' | 'grade' | 'school' = 'name';
      const control = (addFamilyComponent.students.at(studentIndex) as FormGroup).get(controlName);

      control?.setValue('');

      expect(addFamilyComponent.studentControlHasError(studentIndex, controlName)).toBeFalse();
    });
  });

  describe('getErrorMessage()', () => {
    it('should return the correct error message for the family form', () => {
      // The type statement is needed to ensure that `controlName` isn't just any
      // random string, but rather one of the keys of the `addFamilyValidationMessages`
      // map in the component.
      const controlFirstName: keyof typeof addFamilyComponent.addFamilyValidationMessages = 'guardianFirstName';
      addFamilyComponent.addFamilyForm.get(controlFirstName).setErrors({'required': true});
      expect(addFamilyComponent.getFamilyErrorMessage(controlFirstName)).toEqual('Guardian first name is required');

      const controlLastName: keyof typeof addFamilyComponent.addFamilyValidationMessages = 'guardianLastName';
      addFamilyComponent.addFamilyForm.get(controlLastName).setErrors({'required': true});
      expect(addFamilyComponent.getFamilyErrorMessage(controlLastName)).toEqual('Guardian last name is required');

      // Email field should display correct messages
      const controlName = 'email';
      addFamilyComponent.addFamilyForm.get(controlName).setErrors({'required': true});
      expect(addFamilyComponent.getFamilyErrorMessage(controlName)).toEqual('Email is required');

      addFamilyComponent.addFamilyForm.get(controlName).setErrors({'email': true});
      expect(addFamilyComponent.getFamilyErrorMessage(controlName)).toEqual('Email must be formatted properly');
    });

    it('should return the correct error message for the student form', () => {
      addFamilyComponent.addStudent();
      const studentIndex = 0;
      const controlName: 'name' | 'grade' | 'school' = 'name';
      const control = (addFamilyComponent.students.at(studentIndex) as FormGroup).get(controlName);

      // Student field should return correct messages
      control.setErrors({'required': true});
      expect(addFamilyComponent.getStudentErrorMessage(studentIndex, controlName)).toEqual('Student name is required');

      control.setErrors({'minlength': true});
      expect(addFamilyComponent.getStudentErrorMessage(studentIndex, controlName)).toEqual('Student name must be at least 2 characters long');

      control.setErrors({'maxlength': true});
      expect(addFamilyComponent.getStudentErrorMessage(studentIndex, controlName)).toEqual('Student name cannot be more than 50 characters long');
    });

    // Family form
    it('should return "Unknown error. Please check your form input." if no error message is found', () => {
      // The type statement is needed to ensure that `controlName` isn't just any
      // random string, but rather one of the keys of the `addFamilyValidationMessages`
      // map in the component.
      const controlFirstName: keyof typeof addFamilyComponent.addFamilyValidationMessages = 'guardianFirstName';
      addFamilyComponent.addFamilyForm.get(controlFirstName).setErrors({'unknown': true});
      expect(addFamilyComponent.getFamilyErrorMessage(controlFirstName)).toEqual('Unknown error. Please check your form input.');

      const controlLastName: keyof typeof addFamilyComponent.addFamilyValidationMessages = 'guardianLastName';
      addFamilyComponent.addFamilyForm.get(controlLastName).setErrors({'unknown': true});
      expect(addFamilyComponent.getFamilyErrorMessage(controlLastName)).toEqual('Unknown error. Please check your form input.');
    });

    // Student form
    it('should return "Unknown error. Please check your form input." if no error message is found', () => {
      // We don't use a type statement like family does because student form controls are under family, and so are error keys.
      // Instead, we just have to set the control names to be valid keys of the student form controls and error keys.
      addFamilyComponent.addStudent();
      const studentIndex = 0;
      const controlName: 'name' | 'grade' | 'school' = 'name';

      const control = (addFamilyComponent.students.at(studentIndex) as FormGroup).get(controlName);
      control.setErrors({'unknown': true});

      expect(addFamilyComponent.getStudentErrorMessage(studentIndex, controlName))
        .toEqual('Unknown error. Please check your form input.');
    });

    it('should return an empty string if the validation method is not an array', () => {
      const result = addFamilyComponent.getFamilyErrorMessage('students');
      expect(result).toBe('');
    })
  });

  describe('Submit behavior', () => {
    it('should call addFamily and navigate to the family list on successful submission', () => {
      const familyService = TestBed.inject(FamilyService);
      const addFamilySpy = spyOn(familyService, 'addFamily').and.returnValue(of('1'));
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');

      addFamilyComponent.addStudent();
      (addFamilyComponent.addFamilyForm as unknown as UntypedFormGroup).setValue({
        guardianFirstName: 'Chris',
        guardianLastName: 'Smith',
        address: '123 Avenue',
        accommodations: 'None',
        email: 'csmith@email.com',
        students: [
          {
            name: 'Jimmy',
            grade: '3',
            school: 'Morris Elementary',
            teacher: 'N/A',
            backpack: true,
            headphones: false
          }
        ],
        timeAvailability: { earlyMorning: false, lateMorning: true, earlyAfternoon: false, lateAfternoon: false },
        timeSlot: null
      });

      addFamilyComponent.submitForm();

      expect(addFamilySpy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/family']);
    });

    it('should show snackBar on 400 error', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'addFamily').and.returnValue(throwError(() => ({ status: 400 })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');

      addFamilyComponent.addStudent();
      (addFamilyComponent.addFamilyForm as unknown as UntypedFormGroup).setValue({
        guardianFirstName: 'Chris',
        guardianLastName: 'Smith',
        address: '123 Avenue',
        accommodations: 'None',
        email: 'csmith@email.com',
        students: [
          {
            name: 'Jimmy',
            grade: '3',
            school: 'Morris Elementary',
            teacher: 'N/A',
            backpack: true,
            headphones: false
          }
        ],
        timeAvailability: { earlyMorning: false, lateMorning: true, earlyAfternoon: false, lateAfternoon: false },
        timeSlot: null
      });

      addFamilyComponent.submitForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/illegal new family/i),
        'OK',
        { duration: 5000 }
      );
    });

    it('should show snackBar on 500 error', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'addFamily').and.returnValue(throwError(() => ({ status: 500 })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');

      addFamilyComponent.addStudent();
      (addFamilyComponent.addFamilyForm as unknown as UntypedFormGroup).setValue({
        guardianFirstName: 'Chris',
        guardianLastName: 'Smith',
        address: '123 Avenue',
        accommodations: 'None',
        email: 'csmith@email.com',
        students: [
          {
            name: 'Jimmy',
            grade: '3',
            school: 'Morris Elementary',
            teacher: 'N/A',
            backpack: true,
            headphones: false
          }
        ],
        timeAvailability: { earlyMorning: false, lateMorning: true, earlyAfternoon: false, lateAfternoon: false },
        timeSlot: null
      });

      addFamilyComponent.submitForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/server failed to process/i),
        'OK',
        { duration: 5000 }
      );
    });

    it('should show snackBar on unexpected error status', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'addFamily').and.returnValue(throwError(() => ({ status: 409, message: 'Conflict' })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');

      addFamilyComponent.addStudent();
      (addFamilyComponent.addFamilyForm as unknown as UntypedFormGroup).setValue({
        guardianFirstName: 'Chris',
        guardianLastName: 'Smith',
        address: '123 Avenue',
        accommodations: 'None',
        email: 'csmith@email.com',
        students: [
          {
            name: 'Jimmy',
            grade: '3',
            school: 'Morris Elementary',
            teacher: 'N/A',
            backpack: true,
            headphones: false
          }
        ],
        timeAvailability: { earlyMorning: false, lateMorning: true, earlyAfternoon: false, lateAfternoon: false },
        timeSlot: null
      });

      addFamilyComponent.submitForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/unexpected error/i),
        'OK',
        { duration: 5000 }
      );
    });

    it('should use undefined for null form fields via nullish coalescing', () => {
      const familyService = TestBed.inject(FamilyService);
      const addFamilySpy = spyOn(familyService, 'addFamily').and.returnValue(of('1'));

      addFamilyComponent.addStudent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setNull = (path: string) => (addFamilyComponent.addFamilyForm.get(path) as any).setValue(null);
      setNull('guardianFirstName');
      setNull('guardianLastName');
      setNull('email');
      setNull('address');
      setNull('students.0.name');
      setNull('students.0.grade');
      setNull('students.0.school');

      // If statement in the submit form method checks for an invalid form and returns early,
      // so we need to mock the form as valid to test the nullish coalescing behavior.
      spyOnProperty(addFamilyComponent.addFamilyForm, 'invalid', 'get').and.returnValue(false);

      addFamilyComponent.submitForm();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const call = addFamilySpy.calls.mostRecent().args[0] as any;
      expect(call.guardianFirstName).toBeUndefined();
      expect(call.guardianLastName).toBeUndefined();
      expect(call.email).toBeUndefined();
      expect(call.address).toBeUndefined();
    });
  });

  describe('formControlHasError edge cases', () => {
    it('should return false for a non-existent control name', () => {
      expect(addFamilyComponent.formControlHasError('nonExistentControl')).toBeFalse();
    });

    it('should return true if control is invalid and dirty (not touched)', () => {
      const firstNameControl = addFamilyForm.controls.guardianFirstName;
      firstNameControl.setValue('');
      firstNameControl.markAsDirty();
      firstNameControl.markAsUntouched();

      expect(addFamilyComponent.formControlHasError('guardianFirstName')).toBeTrue();

      const lastNameControl = addFamilyForm.controls.guardianLastName;
      lastNameControl.setValue('');
      lastNameControl.markAsDirty();
      lastNameControl.markAsUntouched();

      expect(addFamilyComponent.formControlHasError('guardianLastName')).toBeTrue();
    });
  });

  describe('ngOnInit with settings', () => {
    it('should use empty array when settings.schools is null', () => {
      const settingsService = TestBed.inject(SettingsService);
      spyOn(settingsService, 'getSettings').and.returnValue(of({ schools: undefined } as unknown as AppSettings));

      addFamilyComponent.ngOnInit();

      expect(addFamilyComponent.schools).toEqual([]);
    });

    it('should populate schools from settings', () => {
      const settingsService = TestBed.inject(SettingsService);
      spyOn(settingsService, 'getSettings').and.returnValue(
        of({ schools: [{ name: 'Test School', abbreviation: 'TS' }] } as unknown as AppSettings)
      );

      addFamilyComponent.ngOnInit();

      expect(addFamilyComponent.schools.length).toBe(1);
      expect(addFamilyComponent.schools[0].name).toBe('Test School');
    });
  });
});

