// Angular Imports
import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Family Imports
import { FamilyService } from './family.service';

// Settings Imports
import { SettingsService } from '../settings/settings.service';
import { SchoolInfo, TimeAvailabilityLabels } from '../settings/settings';

@Component({
  selector: 'app-add-family',
  templateUrl: './add-family.component.html',
  styleUrls: ['./add-family.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    RouterLink,
    MatRadioButton,
    MatRadioGroup,
    CommonModule,
    MatCheckboxModule
  ]
})
export class AddFamilyComponent implements OnInit {
  private familyService = inject(FamilyService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private settingsService = inject(SettingsService);

  // Schools loaded from settings — used to populate the school dropdown
  schools: SchoolInfo[] = [];

  // Time availability labels loaded from settings — used to label the checkboxes
  timeAvailabilityLabels: TimeAvailabilityLabels = {
    earlyMorning: '8:00–9:00 AM',
    lateMorning: '9:00–10:00 AM',
    earlyAfternoon: '12:00–1:00 PM',
    lateAfternoon: '1:00–2:00 PM'
  };

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe(settings => {
      this.schools = settings.schools ?? [];
      if (settings.timeAvailability) {
        this.timeAvailabilityLabels = settings.timeAvailability;
      }
    });
  }

  // For grade dropdown
  grades: string[] = [
    'PreK', 'Kindergarten', '1', '2', '3', '4', '5',
    '6', '7', '8', '9', '10', '11', '12'
  ];

  addFamilyForm = new FormGroup({
    guardianFirstName: new FormControl('', Validators.compose([
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
    ])),

    guardianLastName: new FormControl('', Validators.compose([
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

    accommodations: new FormControl<string>(''),

    timeSlot: new FormControl('TBD', Validators.compose([
    ])),

    timeAvailability: new FormGroup({
      earlyMorning: new FormControl(false),
      lateMorning: new FormControl(false),
      earlyAfternoon: new FormControl(false),
      lateAfternoon: new FormControl(false)
    }),

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
        Validators.pattern(/^(?:[1-9]|1[0-2]|Kindergarten|PreK)$/) // Grades can only be 1-12, Kindergarten, or PreK (case-sensitive)
      ])),
      school: new FormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(2),
      ])),
      teacher: new FormControl(''),
      backpack: new FormControl<boolean>(undefined),
      headphones: new FormControl<boolean>(undefined),
    }));
  }

  removeStudent(index: number) {
    this.students.removeAt(index);
  }

  readonly addFamilyValidationMessages = {
    guardianFirstName: [
      { type: 'required', message: 'Guardian first name is required' },
      { type: 'minlength', message: 'First name must be at least 2 characters long' },
      { type: 'maxlength', message: 'First name cannot exceed 50 characters' }
    ],
    guardianLastName: [
      { type: 'required', message: 'Guardian last name is required' },
      { type: 'minlength', message: 'Last name must be at least 2 characters long' },
      { type: 'maxlength', message: 'Last name cannot exceed 50 characters' }
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
    students: {
      name: [
        { type: 'required', message: 'Student name is required' },
        { type: 'minlength', message: 'Student name must be at least 2 characters long' },
        { type: 'maxlength', message: 'Student name cannot be more than 50 characters long' }
      ],
      grade: [
        { type: 'required', message: 'Grade is required' },
        { type: 'pattern', message: 'Grade must be 1-12, Kindergarten, or PreK' }
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
  studentControlHasError(studentIndex: number, controlName: 'name' | 'grade' | 'school' | 'teacher'): boolean {
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
  getStudentErrorMessage(studentIndex: number, controlName: 'name' | 'grade' | 'school' | 'teacher'): string {
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
    if (this.addFamilyForm.invalid) {
      this.addFamilyForm.markAllAsTouched();
      return;
    }

    const rawForm = this.addFamilyForm.value;

    type RawStudent = {
      name: string | null;
      grade: string | null;
      school: string | null;
      schoolAbbreviation: string | null;
      teacher: string | null;
      headphones: boolean | null;
      backpack: boolean | null;
    };

    const firstName = rawForm.guardianFirstName || '';
    const lastName = rawForm.guardianLastName || '';

    const guardianName = (firstName + ' ' + lastName).trim();

    const payload: Partial<import('./family').Family> = {
      guardianName: guardianName ?? undefined,
      email: rawForm.email ?? undefined,
      address: rawForm.address ?? undefined,
      accommodations: rawForm.accommodations ?? undefined,
      timeSlot: rawForm.timeSlot ?? undefined,
      timeAvailability: {
        earlyMorning: rawForm.timeAvailability?.earlyMorning ?? false,
        lateMorning: rawForm.timeAvailability?.lateMorning ?? false,
        earlyAfternoon: rawForm.timeAvailability?.earlyAfternoon ?? false,
        lateAfternoon: rawForm.timeAvailability?.lateAfternoon ?? false,
      },
      students: (rawForm.students as RawStudent[])?.map(student => {
        const schoolNameandAbbreviation = this.schools.find(
          s => s.abbreviation === student.school || s.name === student.school
        );

        return {
          name: student.name ?? '',
          grade: student.grade ?? '',
          school: schoolNameandAbbreviation?.name ?? '',
          schoolAbbreviation: schoolNameandAbbreviation?.abbreviation ?? '',
          teacher: student.teacher ?? '',
          headphones: student.headphones ?? false,
          backpack: student.backpack ?? false,
        };
      }) ?? []
    };

    //console.log("Submitting:", JSON.stringify(payload, null, 2)); // Only uncomment during debugging

    this.familyService.addFamily(payload).subscribe({
      next: () => {
        this.snackBar.open(
          `Added family ${guardianName}`,
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
