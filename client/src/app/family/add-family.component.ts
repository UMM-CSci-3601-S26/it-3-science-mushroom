// Angular Imports
import { Component, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

// Family Imports
import { FamilyService } from './family.service';

@Component({
  selector: 'app-add-family',
  templateUrl: './add-family.component.html',
  styleUrls: ['./add-family.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatOptionModule, MatButtonModule]
})
export class AddFamilyComponent {
  private familyService = inject(FamilyService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  addFamilyForm = new FormGroup({
    guardianName: new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
    ])),

    email: new FormControl('', Validators.compose([
      Validators.required,
      Validators.email,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/), // Same regex pattern the server uses
    ])),

    address: new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(2),
    ])),

    timeSlot: new FormControl('', Validators.compose([
      Validators.required,
      Validators.pattern(/^(?:1[0-2]|[1-9]):[0-5]\d-(?:1[0-2]|[1-9]):[0-5]\d$/) // Time slot must be HH:MM-HH:MM using 12-hour times
    ])),

    students: new FormArray([], Validators.required)
  });

  get students(): FormArray {
    return this.addFamilyForm.get('students') as FormArray;
  }

  addStudent() {
    this.students.push(new FormGroup({
      name: new FormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
      ])),
      grade: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^(?:[1-9]|1[0-2]|Kindergarten|Pre-K)$/) // Grades can only be 1-9, Kindergarten, or Pre-K (case-sensitive)
      ])),
      school: new FormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(2),
      ])),
    }));
  }

  removeStudent(index: number) {
    this.students.removeAt(index);
  }

  readonly addFamilyValidationMessages = {
    guardianName: [
      { type: 'required', message: 'Guardian name is required' },
      { type: 'minlength', message: 'Name must be at least 2 characters long' },
      { type: 'maxlength', message: 'Name cannot exceed 50 characters' }
    ],
    email: [
      { type: 'required', message: 'Email is required' },
      { type: 'email', message: 'Email must be formatted properly' },
      { type: 'pattern', message: 'Email must be formatted properly' }
    ],
    address: [
      { type: 'required', message: 'Address is required' },
      { type: 'minlength', message: 'Address must be at least 2 characters long' }
    ],
    timeSlot: [
      { type: 'required', message: 'Time slot is required' },
      { type: 'pattern', message: 'Time slot must be in the format HH:MM-HH:MM using 12-hour times' }
    ],
    students: {
      name: [
        { type: 'required', message: 'Student name is required' },
        { type: 'minlength', message: 'Student name must be at least 2 characters long' },
        { type: 'maxlength', message: 'Student name cannot be more than 50 characters long' }
      ],
      grade: [
        { type: 'required', message: 'Grade is required' },
        { type: 'pattern', message: 'Grade must be 1-9, Kindergarten, or Pre-K' }
      ],
      school: [
        { type: 'required', message: 'School is required' },
        { type: 'minlength', message: 'School must be at least 2 characters long' }
      ]
    }
  };

  // Form validation helper methods
  formControlHasError(controlName: string): boolean {
    const control = this.addFamilyForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // Student form validation helper methods
  studentControlHasError(studentIndex: number, controlName: 'name' | 'grade' | 'school'): boolean {
    const control = (this.students.at(studentIndex) as FormGroup).get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // Error message helper methods
  getFamilyErrorMessage(controlName: keyof typeof this.addFamilyValidationMessages): string {
    const messages = this.addFamilyValidationMessages[controlName];
    if (!Array.isArray(messages)) {
      return '';
    }
    for (const { type, message } of messages) {
      if (this.addFamilyForm.get(controlName)?.hasError(type)) {
        return message;
      }
    }
    return 'Unknown error. Please check your form input.';
  }

  // Student error message helper method
  // Necessary because the student form is a FormArray nested in FormGroup,
  // so we need to specify which student and which control we're checking for erros
  getStudentErrorMessage(studentIndex: number, controlName: 'name' | 'grade' | 'school'): string {
    const control = (this.students.at(studentIndex) as FormGroup).get(controlName);
    const messages = this.addFamilyValidationMessages.students[controlName];

    for (const { type, message } of messages) {
      if (control?.hasError(type)) {
        return message;
      }
    }

    return 'Unknown error. Please check your form input.';
  }

  submitForm() {
    const rawForm = this.addFamilyForm.value;

    //console.log("Submitting:", JSON.stringify(payload, null, 2)); // Only uncomment during debugging

    this.familyService.addFamily(rawForm).subscribe({
      next: () => {
        this.snackBar.open(
          `Added family ${rawForm.guardianName}`,
          null,
          { duration: 2000 }
        );
        this.router.navigate(['/family']);
      },
      error: err => {
        if (err.status === 400) {
          this.snackBar.open(
            `Tried to add an illegal new family – Error Code: ${err.status}\nMessage: ${err.message}`,
            'OK',
            { duration: 5000 }
          );
        } else if (err.status === 500) {
          this.snackBar.open(
            `The server failed to process your request to add a new family. Is the server up? – Error Code: ${err.status}\nMessage: ${err.message}`,
            'OK',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            `An unexpected error occurred – Error Code: ${err.status}\nMessage: ${err.message}`,
            'OK',
            { duration: 5000 }
          );
        }
      },
    });
  }
}
