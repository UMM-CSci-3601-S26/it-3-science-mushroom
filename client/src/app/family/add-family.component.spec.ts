// Angular Imports
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AbstractControl, FormGroup } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

// RxJS Imports
import { throwError } from 'rxjs'; //of

// Family Imports
import { MockFamilyService } from 'src/testing/family.service.mock';
import { AddFamilyComponent } from './add-family.component';
import { FamilyService } from './family.service';

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
        { provide: FamilyService, useClass: MockFamilyService }
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

  describe('The guardian name field', () => {
    let guardianNameControl: AbstractControl;

    beforeEach(() => {
      guardianNameControl = addFamilyComponent.addFamilyForm.controls.guardianName;
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
      addFamilyForm.controls.guardianName.setValue('Chris Smith');
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
      const controlName = 'guardianName';
      const control = addFamilyComponent.addFamilyForm.get(controlName);

      control?.setValue('');
      control?.markAsTouched();

      expect(addFamilyComponent.formControlHasError(controlName)).toBeTrue();
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
      let controlName: keyof typeof addFamilyComponent.addFamilyValidationMessages = 'guardianName';
      addFamilyComponent.addFamilyForm.get(controlName).setErrors({'required': true});
      expect(addFamilyComponent.getFamilyErrorMessage(controlName)).toEqual('Guardian name is required');

      // Email field should display correct messages
      controlName = 'email';
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
      const controlName: keyof typeof addFamilyComponent.addFamilyValidationMessages = 'guardianName';
      addFamilyComponent.addFamilyForm.get(controlName).setErrors({'unknown': true});
      expect(addFamilyComponent.getFamilyErrorMessage(controlName)).toEqual('Unknown error. Please check your form input.');
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

describe('AddFamilyComponent#submitForm()', () => {
  let component: AddFamilyComponent;
  let fixture: ComponentFixture<AddFamilyComponent>;
  let familyService: FamilyService;
  let location: Location;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        AddFamilyComponent,
        MatSnackBarModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: FamilyService, useClass: MockFamilyService },
      ]
    }).compileComponents().catch(error => {
      expect(error).toBeNull();
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddFamilyComponent);
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

  beforeEach(() => {
    // Set up the form with valid values
    component.addFamilyForm.controls.guardianName.setValue('Chris Smith');
    component.addFamilyForm.controls.timeSlot.setValue('9:00-10:00');
    component.addFamilyForm.controls.address.setValue('123 Avenue');
    component.addFamilyForm.controls.email.setValue('csmith@email.com');
  });

  it('should call addFamily() and handle error response', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 500, message: 'Server error' };
    // "Spy" on the `.addFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const addFamilySpy = spyOn(familyService, 'addFamily')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.addFamily()` was called with the form's values which we set
    // up above.
    expect(addFamilySpy).toHaveBeenCalledWith(component.addFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });

  it('should call addFamily() and handle error response for illegal family', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 400, message: 'Illegal family error' };
    // "Spy" on the `.addFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const addFamilySpy = spyOn(familyService, 'addFamily')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.addFamily()` was called with the form's values which we set
    // up above.
    expect(addFamilySpy).toHaveBeenCalledWith(component.addFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });

  it('should call addFamily() and handle unexpected error response if it arises', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 404, message: 'Not found' };
    // "Spy" on the `.addFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const addFamilySpy = spyOn(familyService, 'addFamily')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.addFamily()` was called with the form's values which we set
    // up above.
    expect(addFamilySpy).toHaveBeenCalledWith(component.addFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });
});

