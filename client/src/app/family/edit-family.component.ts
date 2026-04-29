// Angular Imports
import { ChangeDetectorRef, Component, effect, inject, Signal, signal, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink, ActivatedRoute, ParamMap } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Dialog Imports
import { DialogService } from '../dialog/dialog.service';

// Family Imports
import { Family } from './family';
import { FamilyService } from './family.service';

// Settings Imports
import { SettingsService } from '../settings/settings.service';
import { SchoolInfo, TimeAvailabilityLabels } from '../settings/settings';
import { AuthService } from '../auth/auth-service';

@Component({
  selector: 'app-edit-family',
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
  ],
  templateUrl: './edit-family.component.html',
  styleUrl: './edit-family.component.scss',
})

export class EditFamilyComponent implements OnInit {
  private familyService = inject(FamilyService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialogService = inject(DialogService);
  private settingsService = inject(SettingsService);
  private authService = inject(AuthService);

  get canDeleteFamily(): boolean {
    return this.authService.hasPermission('delete_family');
  }

  error = signal({ help: '', httpResponse: '', message: '' });

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

  family: Signal<Family> = toSignal(
    this.route.paramMap.pipe(
      // Map the paramMap into the id
      map((paramMap: ParamMap) => paramMap.get('id')),
      // Maps the `id` string into the Observable<Family>,
      // which will emit zero or one values depending on whether there is a
      // `Family` with that ID.
      switchMap((id: string) => this.familyService.getFamilyById(id)),
      catchError((_err) => {
        this.error.set({
          help: 'There was a problem loading the family – try again.',
          httpResponse: _err.message,
          message: _err.error?.title,
        });
        return of();
      })
    )
  );

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private cd: ChangeDetectorRef) {}

  makeStudentsVisible = effect(() => {
    const family = this.family();

    family.students.forEach(() => {
      this.addStudent();
      this.cd.detectChanges(); // Force change detection to avoid (NG0100 error) when adding students during the effect
    });
  });

  editFamilyForm = new FormGroup({
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
      earlyMorning: new FormControl(undefined),
      lateMorning: new FormControl(undefined),
      earlyAfternoon: new FormControl(undefined),
      lateAfternoon: new FormControl(undefined)
    }),

    students: new FormArray([], Validators.required)
  });

  getGuardianFirstAndLastName = effect(() => {
    const family = this.family();

    const firstAndLastName = (family.guardianName ?? '').trim().split(/\s+/);

    const firstName = firstAndLastName[0] ?? '';
    const lastName = firstAndLastName.slice(1).join(' ') ?? '';

    this.editFamilyForm.patchValue({
      guardianFirstName: firstName,
      guardianLastName: lastName,
    });
  });

  get students(): FormArray {
    return this.editFamilyForm.get('students') as FormArray;
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
      teacher: new FormControl<string>(''),
      backpack: new FormControl<boolean>(undefined),
      headphones: new FormControl<boolean>(undefined),
    }));
  }

  removeStudent(index: number) {
    this.students.removeAt(index);
  }

  readonly editFamilyValidationMessages = {
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
    const control = this.editFamilyForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // Student form validation helper methods
  studentControlHasError(studentIndex: number, controlName: 'name' | 'grade' | 'school'): boolean {
    const control = (this.students.at(studentIndex) as FormGroup).get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // Error message helper methods
  getFamilyErrorMessage(controlName: keyof typeof this.editFamilyValidationMessages): string {
    const messages = this.editFamilyValidationMessages[controlName];
    if (!Array.isArray(messages)) {
      return '';
    }
    for (const { type, message } of messages) {
      if (this.editFamilyForm.get(controlName)?.hasError(type)) {
        return message;
      }
    }
    return 'Unknown error. Please check your form input.';
  }

  // Student error message helper method
  // Necessary because the student form is a FormArray nested in FormGroup,
  // so we need to specify which student and which control we're checking for errors
  getStudentErrorMessage(studentIndex: number, controlName: 'name' | 'grade' | 'school'): string {
    const control = (this.students.at(studentIndex) as FormGroup).get(controlName);
    const messages = this.editFamilyValidationMessages.students[controlName];

    for (const { type, message } of messages) {
      if (control?.hasError(type)) {
        return message;
      }
    }

    return 'Unknown error. Please check your form input.';
  }

  submitForm() {
    if (this.editFamilyForm.invalid) {
      this.editFamilyForm.markAllAsTouched();
      return;
    }

    const familyId = this.route.snapshot.paramMap.get('id');
    const rawForm = this.editFamilyForm.value;

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

    this.familyService.updateFamily(familyId, payload).subscribe({
      next: () => {
        this.snackBar.open(
          `Updated family ${guardianName}`,
          null,
          { duration: 5000 }
        );
        this.router.navigate(['/family']);
      },
      error: err => {
        if (err.status === 400) {
          this.snackBar.open(
            `Tried to update an illegal family – Error Code: ${err.status}\nMessage: ${err.message}`,
            'OK',
            { duration: 5000 }
          );
        } else if (err.status === 500) {
          this.snackBar.open(
            `The server failed to process your request to update a family. Is the server up? – Error Code: ${err.status}\nMessage: ${err.message}`,
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

  deleteForm() {
    if (!this.canDeleteFamily) {
      this.snackBar.open('You do not have permission to delete families.', 'OK', { duration: 3000 });
      return;
    }

    const familyId = this.route.snapshot.paramMap.get('id');
    const rawForm = this.editFamilyForm.value;

    const firstName = rawForm.guardianFirstName || '';
    const lastName = rawForm.guardianLastName || '';

    const guardianName = (firstName + ' ' + lastName).trim();

    const dialogRef = this.dialogService.openDialog({
      title: 'Confirm Delete',
      familyName: guardianName,
      message: `Are you sure you want to delete the family ${guardianName}?`,
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm',
    }, '400px', '200px');

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        //console.log("Submitting:", JSON.stringify(payload, null, 2)); // Only uncomment during debugging

        this.familyService.deleteFamily(familyId).subscribe({
          next: () => {
            this.snackBar.open(
              `Deleted family ${guardianName}`,
              null,
              { duration: 5000 }
            );
            this.router.navigate(['/family']);
          },
          error: err => {
            if (err.status === 400) {
              this.snackBar.open(
                `Tried to delete an illegal family – Error Code: ${err.status}\nMessage: ${err.message}`,
                'OK',
                { duration: 5000 }
              );
            } else if (err.status === 500) {
              this.snackBar.open(
                `The server failed to process your request to delete a family. Is the server up? – Error Code: ${err.status}\nMessage: ${err.message}`,
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
    });
  }
}
