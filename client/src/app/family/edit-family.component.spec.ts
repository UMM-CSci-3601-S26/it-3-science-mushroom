// Angular Imports
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

// RxJS Imports
import { of, throwError } from 'rxjs'; //of

// Family Imports
import { MockFamilyService } from 'src/testing/family.service.mock';
import { EditFamilyComponent } from './edit-family.component';
import { FamilyService } from './family.service';

import { ActivatedRouteStub } from 'src/testing/activated-route-stub';

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
        { provide: ActivatedRoute, useValue: activatedRoute }
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

  describe('The guardian name field', () => {
    let guardianNameControl: AbstractControl;

    beforeEach(() => {
      guardianNameControl = editFamilyComponent.editFamilyForm.controls.guardianName;
    });

    it('should not allow empty guardian names', () => {
      guardianNameControl.setValue('');
      expect(guardianNameControl.valid).toBeFalsy();
    });

    it('should be fine with "Chris Smith"', () => {
      guardianNameControl.setValue('Chris Smith');
      expect(guardianNameControl.valid).toBeTruthy();
    });

    it('should fail on single character guardian names', () => {
      guardianNameControl.setValue('x');
      expect(guardianNameControl.valid).toBeFalsy();
      expect(guardianNameControl.hasError('minlength')).toBeTruthy();
    });

    it('should fail on really long guardian names', () => {
      guardianNameControl.setValue('x'.repeat(100));
      expect(guardianNameControl.valid).toBeFalsy();
      expect(guardianNameControl.hasError('maxlength')).toBeTruthy();
    });
  });

  describe('Students FormArray', () => {

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

    it('should validate student grade, "Kindergarten", and "Pre-K"', () => {
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
      grade.setValue('pre-k');
      expect(grade.valid).toBeFalse();
      expect(grade.hasError('pattern')).toBeTrue();

      // "Pre-K" is a valid input
      grade.setValue('Pre-K');
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

    it('should be fine with optional requestedSupplies field left empty', () => {
      editFamilyComponent.addStudent();
      const student = editFamilyComponent.students.at(0);

      const requestedSupplies = student.get('requestedSupplies')!;
      requestedSupplies.setValue('');
      expect(requestedSupplies.valid).toBeTrue();
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
      const controlName = 'guardianName';
      const control = editFamilyComponent.editFamilyForm.get(controlName);

      control?.setValue('');
      control?.markAsTouched();

      expect(editFamilyComponent.formControlHasError(controlName)).toBeTrue();
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
      let controlName: keyof typeof editFamilyComponent.editFamilyValidationMessages = 'guardianName';
      editFamilyComponent.editFamilyForm.get(controlName).setErrors({'required': true});
      expect(editFamilyComponent.getFamilyErrorMessage(controlName)).toEqual('Guardian name is required');

      // Email field should display correct messages
      controlName = 'email';
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
      const controlName: keyof typeof editFamilyComponent.editFamilyValidationMessages = 'guardianName';
      editFamilyComponent.editFamilyForm.get(controlName).setErrors({'unknown': true});
      expect(editFamilyComponent.getFamilyErrorMessage(controlName)).toEqual('Unknown error. Please check your form input.');
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
});

// A lot of these tests mock the service using an approach like this doc example
// https://angular.dev/guide/testing/components-scenarios#more-async-tests
// The same way that the following allows the mock to be used:
//
// TestBed.configureTestingModule({
//   providers: [{provide: TwainQuotes, useClass: MockTwainQuotes}], // A (more-async-tests) - provide + use class of the mock
// });
// const twainQuotes = TestBed.inject(TwainQuotes) as MockTwainQuotes; // B (more-async-tests) - inject the service as the mock
//
// Is how these tests work with the mock then being injected in

describe('EditFamilyComponent#submitForm()', () => {
  let component: EditFamilyComponent;
  let fixture: ComponentFixture<EditFamilyComponent>;
  let familyService: FamilyService;
  let location: Location;
  const activatedRoute: ActivatedRouteStub = new ActivatedRouteStub({
    id: 'john_id',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        EditFamilyComponent,
        MatSnackBarModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: FamilyService, useClass: MockFamilyService },
        {provide: ActivatedRoute, useValue: activatedRoute},
      ]
    }).compileComponents().catch(error => {
      expect(error).toBeNull();
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditFamilyComponent);
    component = fixture.componentInstance;
    familyService = TestBed.inject(FamilyService);
    location = TestBed.inject(Location);
    // We need to inject the router and the HttpTestingController, but
    // never need to use them. So, we can just inject them into the TestBed
    // and ignore the returned values.
    TestBed.inject(Router);
    TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should call updateFamily() and handle error response', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 500, message: 'Server error' };
    // "Spy" on the `.updateFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const updateFamilySpy = spyOn(familyService, 'updateFamily')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.updateFamily()` was called with the form's values which we set
    // up above.
    const familyID = 'john_id';
    expect(updateFamilySpy).toHaveBeenCalledWith(familyID, component.editFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });

  it('should call updateFamily() and handle error response for illegal family', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 400, message: 'Illegal family error' };
    // "Spy" on the `.updateFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const updateFamilySpy = spyOn(familyService, 'updateFamily')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.updateFamily()` was called with the form's values which we set
    // up above.
    const familyID = 'john_id';
    expect(updateFamilySpy).toHaveBeenCalledWith(familyID, component.editFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });

  it('should call updateFamily() and handle unexpected error response if it arises', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 404, message: 'Not found' };
    // "Spy" on the `.updateFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const updateFamilySpy = spyOn(familyService, 'updateFamily')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.updateFamily()` was called with the form's values which we set
    // up above.
    const familyID = 'john_id';
    expect(updateFamilySpy).toHaveBeenCalledWith(familyID,component.editFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });

  it('should transform requestedSupplies string into trimmed array', () => {
    const studentsArray = component.editFamilyForm.get('students') as FormArray;
    studentsArray.clear(); // since we are loading the data, there is already one student in the form array, so we need to clear it before adding a new one for this test

    studentsArray.push(new FormGroup({
      name: new FormControl(''),
      grade: new FormControl(''),
      school: new FormControl(''),
      requestedSupplies: new FormControl('')
    }));

    component.editFamilyForm.patchValue({
      students: [{
        name: 'John',
        grade: '5',
        school: 'ABC',
        requestedSupplies: 'pencil, eraser , notebook '
      }]
    });
    const updateFamilySpy = spyOn(familyService, 'updateFamily')
      .and.returnValue(of('1'));
    component.submitForm();
    const familyID = 'john_id';
    expect(updateFamilySpy).toHaveBeenCalledWith(
      familyID,
      jasmine.objectContaining({
        students: [
          jasmine.objectContaining({
            requestedSupplies: ['pencil', 'eraser', 'notebook']
          })
        ]
      })
    );
  });

  it('should transform requestedSupplies string into trimmed array', () => {
    const studentsArray = component.editFamilyForm.get('students') as FormArray;
    studentsArray.clear(); // since we are loading the data, there is already one student in the form array, so we need to clear it before adding a new one for this test
    studentsArray.push(
      new FormGroup({
        name: new FormControl('John'),
        grade: new FormControl('5'),
        school: new FormControl('ABC'),
        requestedSupplies: new FormControl('pencil, eraser , notebook ')
      })
    );
    const updateFamilySpy = spyOn(familyService, 'updateFamily')
      .and.returnValue(of('1'));
    component.submitForm();
    const familyID = 'john_id';
    expect(updateFamilySpy).toHaveBeenCalledWith(
      familyID,
      jasmine.objectContaining({
        students: [
          jasmine.objectContaining({
            requestedSupplies: ['pencil', 'eraser', 'notebook']
          })]
      }));
  });
});
