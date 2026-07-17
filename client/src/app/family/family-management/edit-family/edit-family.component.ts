// Angular Imports
import { ChangeDetectorRef, Component, effect, inject, Signal, signal, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
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
import { DialogService } from '../../../shared/dialog/dialog.service';

// Family Imports
import { Family } from '../../family';
import { FamilyService } from '../../family.service';
import { GuardianLinkDialogComponent } from '../link-family/guardian-link-dialog.component';

// Settings Imports
import { SettingsService } from '../../../settings/settings.service';
import { SchoolInfo, TimeAvailabilityLabels } from '../../../settings/settings';

// Auth Imports
import { AuthService } from '../../../auth/auth-service';
import { MatDialog, MatDialogActions } from "@angular/material/dialog";

/**
 * EditFamilyComponent is responsible for displaying a form to edit an existing family's information, including guardian details and student details.
 * It retrieves the family data based on the ID in the route parameters, populates the form, and allows the user to submit updates to the server.
 * The component also handles form validation and displays appropriate error messages for invalid input.
 * It uses FamilyService to retrieve and update family data, SettingsService to get school and time availability information for form options, and DialogService to display any necessary dialogs.
 * The component is protected by authentication and authorization, allowing only users with the appropriate permissions to access it.
 * Upon successful update, the user is navigated back to the family management page with a success message.
 * If there are errors during data retrieval or submission, appropriate error messages are displayed to the user via MatSnackBar.
 */
@Component({
  selector: 'app-edit-family',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    RouterLink,
    MatRadioButton,
    MatRadioGroup,
    CommonModule,
    MatCheckboxModule,
    MatDialogActions,
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
  private dialog = inject(MatDialog);

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

  /**
   * OnInit lifecycle hook to load family data and settings when the component initializes.
   * It loads school information and time availability labels from settings to populate form options and labels.
   */
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

  /**
   * family is a Signal that holds the current family's data, which is loaded based on the ID from the route parameters.
   * It uses the familyService to fetch the family data from the server and handles any errors that occur during loading.
   * The family data is then used to populate the form fields for editing.
   */
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

  /**
   * The constructor injects necessary services and initializes the component.
   * It also sets up an effect to make students visible in the form when the family data is loaded, by adding student form groups for each student in the family.
   * The ChangeDetectorRef is used to trigger change detection after adding student form groups to avoid Angular's NG0100 error when modifying the form array during an effect.
   * @param cd ChangeDetectorRef for triggering change detection after modifying the form array in the effect.
   */
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private cd: ChangeDetectorRef) {}

  makeStudentsVisible = effect(() => {
    const family = this.family();

    family.students.forEach(() => {
      this.addStudent();
      this.cd.detectChanges(); // Force change detection to avoid (NG0100 error) when adding students during the effect
    });
  });

  /**
   * editFamilyForm is a FormGroup that defines the structure and validation rules for the edit family form.
   * It includes form controls for guardian first name, last name, email, address, accommodations, time slot, time availability checkboxes, and a FormArray for students.
   * Each form control has appropriate validators to ensure the input is valid before submission.
   * The students FormArray allows dynamic addition and removal of student form groups, each containing controls for student name, grade, school, teacher, backpack, and headphones.
   * The form is used to capture the user's input when editing a family's information and is submitted to the server for updating the family data.
   */
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
    needSpanishHelp: new FormControl<boolean>(undefined),

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

  /**
   * getGuardianFirstAndLastName is an effect that listens for changes to the family signal and updates the guardian first name and last name form controls based on the guardianName property of the family.
   * It splits the guardianName into first and last name by splitting on whitespace, and then patches the form values for guardianFirstName and guardianLastName.
   * This allows the form to display the guardian's first and last name in separate input fields while still maintaining a single guardianName property in the family data model.
   * The effect ensures that any changes to the family signal will automatically update the form controls accordingly.
   */
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

  /**
   * students is a getter that returns the FormArray of students from the editFamilyForm.
   * It is used to dynamically add and remove student form groups within the form.
   * Each student form group contains controls for student name, grade, school, teacher, backpack, and headphones.
   * The students FormArray allows the user to manage multiple students associated with the family,
   * and the getter provides easy access to this array for adding or removing students as needed.
   * @returns FormArray of students in the edit family form.
   */
  get students(): FormArray {
    return this.editFamilyForm.get('students') as FormArray;
  }

  /**
   * addStudent is a method that adds a new FormGroup to the students FormArray in the editFamilyForm.
   * Each FormGroup represents a student and contains form controls for the student's name, grade, school, teacher, backpack, and headphones.
   * This allows the user to dynamically add multiple students to the family when editing the family's information.
   * The form controls for each student include validation rules such as required fields and specific patterns for grade input.
   * When the user clicks the "Add Student" button in the form, this method is called to add a new student form group to the form array,
   * allowing the user to input information for an additional student.
   */
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

  /**
   * removeStudent is a method that removes a FormGroup from the students FormArray in the editFamilyForm based on the provided index.
   * This allows the user to dynamically remove a student from the family when editing the family's information.
   * When the user clicks the "Remove" button next to a student in the form, this method is called with the index of that student form group,
   * and it removes the corresponding FormGroup from the FormArray, effectively removing that student from the form.
   * @param index The index of the student form group to remove from the students FormArray.
   */
  removeStudent(index: number) {
    this.students.removeAt(index);
  }

  /**
   * editFamilyValidationMessages is an object that defines the validation messages for each form control in the edit family form.
   * It includes messages for the guardian's first name, last name, email, address, and student details such as name, grade, and school.
   * Each form control has an array of validation rules with corresponding error messages that are displayed when the control is invalid.
   */
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

  openGuardianLinkDialog() {
    this.dialog.open(GuardianLinkDialogComponent, {
      width: '520px',
      autoFocus: false,
      data: { family: this.family() }
    })
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

  /**
   * submitForm is a method that is called when the user submits the edit family form.
   * It first checks if the form is valid, and if not, it marks all controls as touched to trigger validation messages and returns early.
   * If the form is valid, it constructs a payload object based on the form values,
   * including splitting the guardian's full name into first and last name, and mapping the students FormArray into an array of student objects.
   */
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

    const payload: Partial<import('../../family').Family> = {
      guardianName: guardianName ?? undefined,
      email: rawForm.email ?? undefined,
      address: rawForm.address ?? undefined,
      accommodations: rawForm.accommodations ?? undefined,
      needSpanishHelp: rawForm.needSpanishHelp ?? false,
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
}
