import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { Family } from '../family';
import { SchoolInfo, TimeAvailabilityLabels } from '../../settings/settings';
import { FamilyPortalFormPayload, FamilyPortalService } from './family-portal.service';

@Component({
  selector: 'app-family-portal-form',
  templateUrl: './family-portal-form.component.html',
  styleUrls: ['./family-portal-form.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatRadioButton,
    MatRadioGroup,
    MatSnackBarModule,
  ]
})
export class FamilyPortalFormComponent implements OnInit {
  private familyPortalService = inject(FamilyPortalService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  schools: SchoolInfo[] = [];
  isLoading = true;

  timeAvailabilityLabels: TimeAvailabilityLabels = {
    earlyMorning: '8:00-9:00 AM',
    lateMorning: '9:00-10:00 AM',
    earlyAfternoon: '12:00-1:00 PM',
    lateAfternoon: '1:00-2:00 PM',
  };

  readonly grades: string[] = [
    'PreK', 'Kindergarten', '1', '2', '3', '4', '5',
    '6', '7', '8', '9', '10', '11', '12'
  ];

  familyForm = new FormGroup({
    guardianFirstName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
    ]),
    guardianLastName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
    ]),
    address: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
    ]),
    accommodations: new FormControl<string>(''),
    timeSlot: new FormControl('to be assigned'),
    students: new FormArray([], [Validators.required]),
    timeAvailability: new FormGroup({
      earlyMorning: new FormControl(false),
      lateMorning: new FormControl(false),
      earlyAfternoon: new FormControl(false),
      lateAfternoon: new FormControl(false)
    })
  });

  readonly validationMessages = {
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

  get students(): FormArray {
    return this.familyForm.get('students') as FormArray;
  }

  ngOnInit(): void {
    this.familyPortalService.getSummary().subscribe({
      next: summary => {
        this.schools = summary.schools ?? [];
        if (summary.timeAvailability) {
          this.timeAvailabilityLabels = summary.timeAvailability;
        }

        if (summary.family) {
          this.patchFromFamily(summary.family);
        } else {
          this.addStudent();
        }
        this.isLoading = false;
      },
      error: () => {
        this.addStudent();
        this.isLoading = false;
      }
    });
  }

  addStudent() {
    this.students.push(new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
      ]),
      grade: new FormControl('', [
        Validators.required,
        Validators.pattern(/^(?:[1-9]|1[0-2]|Kindergarten|PreK)$/)
      ]),
      school: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      teacher: new FormControl(''),
      backpack: new FormControl<boolean>(undefined),
      headphones: new FormControl<boolean>(undefined),
    }));
  }

  removeStudent(index: number) {
    this.students.removeAt(index);
  }

  formControlHasError(controlName: string): boolean {
    const control = this.familyForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  studentControlHasError(studentIndex: number, controlName: 'name' | 'grade' | 'school' | 'teacher'): boolean {
    const control = (this.students.at(studentIndex) as FormGroup).get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFamilyErrorMessage(controlName: keyof typeof this.validationMessages): string {
    const messages = this.validationMessages[controlName];
    if (!Array.isArray(messages)) {
      return '';
    }
    for (const { type, message } of messages) {
      if (this.familyForm.get(controlName)?.hasError(type)) {
        return message;
      }
    }
    return 'Unknown error. Please check your form input.';
  }

  getStudentErrorMessage(studentIndex: number, controlName: 'name' | 'grade' | 'school'): string {
    const control = (this.students.at(studentIndex) as FormGroup).get(controlName);
    const messages = this.validationMessages.students[controlName];

    for (const { type, message } of messages) {
      if (control?.hasError(type)) {
        return message;
      }
    }

    return 'Unknown error. Please check your form input.';
  }

  saveForm() {
    if (this.familyForm.invalid) {
      this.familyForm.markAllAsTouched();
      this.snackBar.open('Please complete all required fields.', 'OK', { duration: 2500 });
      return;
    }

    const payload = this.buildPayload();

    this.familyPortalService.upsertForm(payload).subscribe({
      next: () => {
        this.snackBar.open('Family form saved.', 'OK', { duration: 2000 });
        this.router.navigate(['/family-portal']);
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to save family form.';
        this.snackBar.open(message, 'OK', { duration: 3500 });
      }
    });
  }

  private buildPayload(): FamilyPortalFormPayload {
    const raw = this.familyForm.getRawValue();
    const guardianName = `${raw.guardianFirstName ?? ''} ${raw.guardianLastName ?? ''}`.trim();

    return {
      guardianName,
      email: raw.email ?? '',
      address: raw.address ?? '',
      accommodations: raw.accommodations ?? '',
      timeSlot: raw.timeSlot ?? 'to be assigned',
      students: (raw.students ?? []).map(student => {
        const school = this.schools.find(
          item => item.abbreviation === student?.school || item.name === student?.school
        );

        return {
          name: student?.name ?? '',
          grade: student?.grade ?? '',
          school: school?.name ?? student?.school ?? '',
          schoolAbbreviation: school?.abbreviation ?? student?.school ?? '',
          teacher: student?.teacher ?? '',
          headphones: student?.headphones ?? false,
          backpack: student?.backpack ?? false,
        };
      }),
      timeAvailability: {
        earlyMorning: raw.timeAvailability?.earlyMorning ?? false,
        lateMorning: raw.timeAvailability?.lateMorning ?? false,
        earlyAfternoon: raw.timeAvailability?.earlyAfternoon ?? false,
        lateAfternoon: raw.timeAvailability?.lateAfternoon ?? false,
      }
    };
  }

  private patchFromFamily(family: Partial<Family>) {
    const nameParts = (family.guardianName ?? '').trim().split(/\s+/);
    const guardianFirstName = nameParts[0] ?? '';
    const guardianLastName = nameParts.slice(1).join(' ');

    this.familyForm.patchValue({
      guardianFirstName,
      guardianLastName,
      email: family.email ?? '',
      address: family.address ?? '',
      accommodations: family.accommodations ?? '',
      timeSlot: family.timeSlot || 'to be assigned',
      timeAvailability: family.timeAvailability
    });

    this.students.clear();
    for (const student of family.students ?? []) {
      this.students.push(new FormGroup({
        name: new FormControl(student.name, [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ]),
        grade: new FormControl(student.grade, [
          Validators.required,
          Validators.pattern(/^(?:[1-9]|1[0-2]|Kindergarten|PreK)$/)
        ]),
        school: new FormControl(student.schoolAbbreviation || student.school, [
          Validators.required,
          Validators.minLength(2),
        ]),
        teacher: new FormControl(student.teacher ?? ''),
        backpack: new FormControl<boolean>(student.backpack ?? false),
        headphones: new FormControl<boolean>(student.headphones ?? false),
      }));
    }

    if (this.students.length === 0) {
      this.addStudent();
    }
  }
}
