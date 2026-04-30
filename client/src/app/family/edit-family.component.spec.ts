// Angular Imports
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AbstractControl, FormGroup, UntypedFormGroup } from '@angular/forms';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

// RxJS Imports
import { throwError, of } from 'rxjs'; //of

// Family Imports
import { MockFamilyService } from 'src/testing/family.service.mock';
import { EditFamilyComponent } from './edit-family.component';
import { FamilyService } from './family.service';

import { ActivatedRouteStub } from 'src/testing/activated-route-stub';

// Settings Imports
import { SettingsService } from '../settings/settings.service';
import { AppSettings } from '../settings/settings';
import { AuthService } from '../auth/auth-service';

// Dialog import

describe('editFamilyComponent', () => {
  let editFamilyComponent: EditFamilyComponent;
  let editFamilyForm: FormGroup;
  let fixture: ComponentFixture<EditFamilyComponent>;
  const activatedRoute: ActivatedRouteStub = new ActivatedRouteStub({
    id: 'john_id',
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        EditFamilyComponent,
        MatSnackBarModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamilyService, useClass: MockFamilyService },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: SettingsService, useValue: { getSettings: () => of({ schools: [{ name: 'Test School', abbreviation: 'TS' }] } as unknown as AppSettings) }},
        { provide: AuthService, useValue: { hasPermission: () => true } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    }).compileComponents().catch(error => {
      expect(error).toBeNull();
    });
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditFamilyComponent);
    editFamilyComponent = fixture.componentInstance;
    fixture.detectChanges();
    editFamilyForm = editFamilyComponent.editFamilyForm;
    expect(editFamilyForm).toBeDefined();
    expect(editFamilyForm.controls).toBeDefined();
  });


  it('should create the component and form', () => {
    expect(editFamilyComponent).toBeTruthy();
    expect(editFamilyForm).toBeTruthy();
  });

  // Tests that a loaded form is valid
  it('form should be invalid when empty', () => {
    expect(editFamilyForm.valid).toBeTruthy();
  });

  describe('Guardian first and last name fields', () => {
    let guardianFirstNameControl: AbstractControl;
    let guardianLastNameControl: AbstractControl;

    beforeEach(() => {
      guardianFirstNameControl = editFamilyComponent.editFamilyForm.controls.guardianFirstName;
      guardianLastNameControl = editFamilyComponent.editFamilyForm.controls.guardianLastName;
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
      guardianLastNameControl.setValue('y');
      expect(guardianLastNameControl.valid).toBeFalsy();
      expect(guardianLastNameControl.hasError('minlength')).toBeTruthy();
    });

    it('should fail on really long guardian names', () => {
      guardianFirstNameControl.setValue('x'.repeat(100));
      expect(guardianFirstNameControl.valid).toBeFalsy();
      expect(guardianFirstNameControl.hasError('maxlength')).toBeTruthy();
      guardianLastNameControl.setValue('y'.repeat(100));
      expect(guardianLastNameControl.valid).toBeFalsy();
      expect(guardianLastNameControl.hasError('maxlength')).toBeTruthy();
    });
  });

  describe('The address field', () => {
    let addressControl: AbstractControl;

    beforeEach(() => {
      addressControl = editFamilyComponent.editFamilyForm.controls.address;
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
      emailControl = editFamilyComponent.editFamilyForm.controls.email;
    });

    it('should not allow empty values', () => {
      emailControl.setValue(null);
      expect(emailControl.valid).toBeFalsy();
      expect(emailControl.hasError('required')).toBeTruthy();
    });

    it('should accept legal emails', () => {
      emailControl.setValue('conniestewart@ohmnet.com');
      expect(emailControl.valid).toBeTruthy();
    });

    it('should fail without @', () => {
      emailControl.setValue('conniestewart');
      expect(emailControl.valid).toBeFalsy();
      expect(emailControl.hasError('email')).toBeTruthy();
    });
  });

  describe('Students FormArray', () => {

    it('should start with students in the students array', () => {
      const students = editFamilyComponent.students;
      expect(students).toBeDefined();
      expect(students.length).toBeGreaterThan(0);
    });

    it('should add a student when addStudent() is called', () => {
      editFamilyComponent.addStudent();
      const students = editFamilyComponent.students;

      // Since there is one student in the test family upon editing,
      // we expect that after adding a student, there will be two students in the form array
      expect(students.length).toBe(2);
      expect(students.at(0)).toBeTruthy();
      expect(students.at(0) instanceof FormGroup).toBeTrue();
    });

    it('should remove a student when removeStudent() is called', () => {
      editFamilyComponent.removeStudent(0);
      const students = editFamilyComponent.students;

      expect(students.length).toBe(0);
      expect(students.at(0)).toBeFalsy();
      expect(students.at(0) instanceof FormGroup).toBeFalse();
    });

    //We are loading the data so it should be valid when the form is initialized.
    it('should be valid when all fields are filled with correct information', () => {
      expect(editFamilyForm.valid).toBeTrue();
    });

    it('should validate student name', () => {
      editFamilyComponent.addStudent();
      const student = editFamilyComponent.students.at(0);

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
      editFamilyComponent.addStudent();
      const student = editFamilyComponent.students.at(0);

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
      grade.setValue('prek');
      expect(grade.valid).toBeFalse();
      expect(grade.hasError('pattern')).toBeTrue();

      // "Pre-K" is a valid input
      grade.setValue('PreK');
      expect(grade.valid).toBeTrue();
    });

    it('should validate student school', () => {
      editFamilyComponent.addStudent();
      const student = editFamilyComponent.students.at(0);

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

    it('should be fine with the teacher field left empty', () => {
      editFamilyComponent.addStudent();
      const student = editFamilyComponent.students.at(0);

      const teacher = student.get('teacher')!;
      teacher.setValue('');
      expect(teacher.valid).toBeTrue();
    });
  });

  describe('control error helper methods', () => {
    it('formControlHasError should return true for invalid touched family control', () => {
      const controlFirstName = 'guardianFirstName';
      const control1 = editFamilyComponent.editFamilyForm.get(controlFirstName);

      control1?.setValue('');
      control1?.markAsTouched();

      expect(editFamilyComponent.formControlHasError(controlFirstName)).toBeTrue();

      const controlLastName = 'guardianLastName';
      const control2 = editFamilyComponent.editFamilyForm.get(controlLastName);

      control2?.setValue('');
      control2?.markAsTouched();

      expect(editFamilyComponent.formControlHasError(controlLastName)).toBeTrue();
    });

    it('studentControlHasError should return true for invalid touched student control', () => {
      editFamilyComponent.addStudent();
      const studentIndex = 0;
      const controlName: 'name' | 'grade' | 'school' = 'name';
      const control = (editFamilyComponent.students.at(studentIndex) as FormGroup).get(controlName);

      control?.setValue('');
      control?.markAsTouched();

      expect(editFamilyComponent.studentControlHasError(studentIndex, controlName)).toBeTrue();
    });

    it('studentControlHasError should return false when invalid student control is untouched', () => {
      editFamilyComponent.addStudent();
      const studentIndex = 0;
      const controlName: 'name' | 'grade' | 'school' = 'name';
      const control = (editFamilyComponent.students.at(studentIndex) as FormGroup).get(controlName);

      control?.setValue('');

      expect(editFamilyComponent.studentControlHasError(studentIndex, controlName)).toBeFalse();
    });
  });

  describe('getErrorMessage()', () => {
    it('should return the correct error message for the family form', () => {
      // The type statement is needed to ensure that `controlName` isn't just any
      // random string, but rather one of the keys of the `addFamilyValidationMessages`
      // map in the component.
      const controlFirstName: keyof typeof editFamilyComponent.editFamilyValidationMessages = 'guardianFirstName';
      editFamilyComponent.editFamilyForm.get(controlFirstName).setErrors({'required': true});
      expect(editFamilyComponent.getFamilyErrorMessage(controlFirstName)).toEqual('Guardian first name is required');

      const controlLastName: keyof typeof editFamilyComponent.editFamilyValidationMessages = 'guardianLastName';
      editFamilyComponent.editFamilyForm.get(controlLastName).setErrors({'required': true});
      expect(editFamilyComponent.getFamilyErrorMessage(controlLastName)).toEqual('Guardian last name is required');

      // Email field should display correct messages
      const controlName = 'email';
      editFamilyComponent.editFamilyForm.get(controlName).setErrors({'required': true});
      expect(editFamilyComponent.getFamilyErrorMessage(controlName)).toEqual('Email is required');

      editFamilyComponent.editFamilyForm.get(controlName).setErrors({'email': true});
      expect(editFamilyComponent.getFamilyErrorMessage(controlName)).toEqual('Email must be formatted properly');
    });

    it('should return the correct error message for the student form', () => {
      editFamilyComponent.addStudent();
      const studentIndex = 0;
      const controlName: 'name' | 'grade' | 'school' = 'name';
      const control = (editFamilyComponent.students.at(studentIndex) as FormGroup).get(controlName);

      // Student field should return correct messages
      control.setErrors({'required': true});
      expect(editFamilyComponent.getStudentErrorMessage(studentIndex, controlName)).toEqual('Student name is required');

      control.setErrors({'minlength': true});
      expect(editFamilyComponent.getStudentErrorMessage(studentIndex, controlName)).toEqual('Student name must be at least 2 characters long');

      control.setErrors({'maxlength': true});
      expect(editFamilyComponent.getStudentErrorMessage(studentIndex, controlName)).toEqual('Student name cannot be more than 50 characters long');
    });

    // Family form
    it('should return "Unknown error. Please check your form input." if no error message is found', () => {
      // The type statement is needed to ensure that `controlName` isn't just any
      // random string, but rather one of the keys of the `addFamilyValidationMessages`
      // map in the component.
      const controlFirstName: keyof typeof editFamilyComponent.editFamilyValidationMessages = 'guardianFirstName';
      editFamilyComponent.editFamilyForm.get(controlFirstName).setErrors({'unknown': true});
      expect(editFamilyComponent.getFamilyErrorMessage(controlFirstName)).toEqual('Unknown error. Please check your form input.');

      const controlLastName: keyof typeof editFamilyComponent.editFamilyValidationMessages = 'guardianLastName';
      editFamilyComponent.editFamilyForm.get(controlLastName).setErrors({'unknown': true});
      expect(editFamilyComponent.getFamilyErrorMessage(controlLastName)).toEqual('Unknown error. Please check your form input.');
    });

    // Student form
    it('should return "Unknown error. Please check your form input." if no error message is found', () => {
      // We don't use a type statement like family does because student form controls are under family, and so are error keys.
      // Instead, we just have to set the control names to be valid keys of the student form controls and error keys.
      editFamilyComponent.addStudent();
      const studentIndex = 0;
      const controlName: 'name' | 'grade' | 'school' = 'name';

      const control = (editFamilyComponent.students.at(studentIndex) as FormGroup).get(controlName);
      control.setErrors({'unknown': true});

      expect(editFamilyComponent.getStudentErrorMessage(studentIndex, controlName))
        .toEqual('Unknown error. Please check your form input.');
    });

    it('should return an empty string if the validation method is not an array', () => {
      const result = editFamilyComponent.getFamilyErrorMessage('students');
      expect(result).toBe('');
    })
  });

  describe('Submit behavior', () => {
    it('should call updateFamily and navigate to the family list on successful submission', () => {
      const familyService = TestBed.inject(FamilyService);
      const editFamilySpy = spyOn(familyService, 'updateFamily').and.returnValue(of('1'));
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');

      editFamilyComponent.addStudent();
      (editFamilyComponent.editFamilyForm as unknown as UntypedFormGroup).setValue({
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
          },
          {
            name: 'abby',
            grade: '7',
            school: 'Morris Middle School',
            teacher: 'N/A',
            backpack: true,
            headphones: false
          }
        ],
        timeAvailability: { earlyMorning: false, lateMorning: true, earlyAfternoon: false, lateAfternoon: false },
        timeSlot: 'TBD'
      });

      editFamilyComponent.submitForm();

      expect(editFamilySpy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/family']);
    });

    it('should show snackBar on 400 error', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'updateFamily').and.returnValue(throwError(() => ({ status: 400 })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');

      editFamilyComponent.submitForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/illegal family/i),
        'OK',
        { duration: 5000 }
      );
    });

    it('should show snackBar on 500 error', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'updateFamily').and.returnValue(throwError(() => ({ status: 500 })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');

      editFamilyComponent.submitForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/server failed to process/i),
        'OK',
        { duration: 5000 }
      );
    });

    it('should show snackBar on unexpected error status', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'updateFamily').and.returnValue(throwError(() => ({ status: 409, message: 'Conflict' })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');

      editFamilyComponent.submitForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/unexpected error/i),
        'OK',
        { duration: 5000 }
      );
    });

    it('should use undefined for null form fields via nullish coalescing', () => {
      const familyService = TestBed.inject(FamilyService);
      const editFamilySpy = spyOn(familyService, 'updateFamily').and.returnValue(of('1'));

      editFamilyComponent.addStudent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setNull = (path: string) => (editFamilyComponent.editFamilyForm.get(path) as any).setValue(null);
      setNull('guardianFirstName');
      setNull('guardianLastName');
      setNull('email');
      setNull('address');
      setNull('students.0.name');
      setNull('students.0.grade');
      setNull('students.0.school');

      // If statement in the submit form method checks for an invalid form and returns early,
      // so we need to mock the form as valid to test the nullish coalescing behavior.
      spyOnProperty(editFamilyComponent.editFamilyForm, 'invalid', 'get').and.returnValue(false);

      editFamilyComponent.submitForm();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const call = editFamilySpy.calls.mostRecent().args[0] as any;
      expect(call.guardianFirstName).toBeUndefined();
      expect(call.guardianLastName).toBeUndefined();
      expect(call.email).toBeUndefined();
      expect(call.address).toBeUndefined();
    });
  });

  describe('formControlHasError edge cases', () => {
    it('should return false for a non-existent control name', () => {
      expect(editFamilyComponent.formControlHasError('nonExistentControl')).toBeFalse();
    });

    it('should return true if control is invalid and dirty (not touched)', () => {
      const firstNameControl = editFamilyForm.controls.guardianFirstName;
      firstNameControl.setValue('');
      firstNameControl.markAsDirty();
      firstNameControl.markAsUntouched();

      expect(editFamilyComponent.formControlHasError('guardianFirstName')).toBeTrue();

      const lastNameControl = editFamilyForm.controls.guardianLastName;
      lastNameControl.setValue('');
      lastNameControl.markAsDirty();
      lastNameControl.markAsUntouched();

      expect(editFamilyComponent.formControlHasError('guardianLastName')).toBeTrue();
    });
  });

  describe('ngOnInit with settings', () => {
    it('should use empty array when settings.schools is null', () => {
      const settingsService = TestBed.inject(SettingsService);
      spyOn(settingsService, 'getSettings').and.returnValue(of({ schools: undefined } as unknown as AppSettings));

      editFamilyComponent.ngOnInit();

      expect(editFamilyComponent.schools).toEqual([]);
    });

    it('should populate schools from settings', () => {
      const settingsService = TestBed.inject(SettingsService);
      spyOn(settingsService, 'getSettings').and.returnValue(
        of({ schools: [{ name: 'Test School', abbreviation: 'TS' }] } as unknown as AppSettings)
      );

      editFamilyComponent.ngOnInit();

      expect(editFamilyComponent.schools.length).toBe(1);
      expect(editFamilyComponent.schools[0].name).toBe('Test School');
    });
  });

  describe('Delete behavior', () => {
    it('should call deleteFamily and navigate to the family list on successful deletion', () => {
      const familyService = TestBed.inject(FamilyService);
      const deleteSpy = spyOn(familyService, 'deleteFamily').and.returnValue(of(void 0));
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');
      const matDialog = TestBed.inject(MatDialog);

      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as MatDialogRef<unknown>);

      editFamilyComponent.deleteForm();

      expect(deleteSpy).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/family']);
    });

    it('should show snackBar on 400 error', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'deleteFamily').and.returnValue(throwError(() => ({ status: 400 })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');
      const matDialog = TestBed.inject(MatDialog);

      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as MatDialogRef<unknown>);

      editFamilyComponent.deleteForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/illegal family/i),
        'OK',
        { duration: 5000 }
      );
    });

    it('should show snackBar on 500 error', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'deleteFamily').and.returnValue(throwError(() => ({ status: 500 })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');
      const matDialog = TestBed.inject(MatDialog);

      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as MatDialogRef<unknown>);

      editFamilyComponent.deleteForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/server failed to process/i),
        'OK',
        { duration: 5000 }
      );
    });

    it('should show snackBar on unexpected error status', () => {
      const familyService = TestBed.inject(FamilyService);
      spyOn(familyService, 'deleteFamily').and.returnValue(throwError(() => ({ status: 409, message: 'Conflict' })));
      const snackBar = TestBed.inject(MatSnackBar);
      const snackBarSpy = spyOn(snackBar, 'open');
      const matDialog = TestBed.inject(MatDialog);

      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as MatDialogRef<unknown>);

      editFamilyComponent.deleteForm();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/unexpected error/i),
        'OK',
        { duration: 5000 }
      );
    });
  });
});
