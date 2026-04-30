/**
 * SignUpComponent — handles self-registration for both volunteers and guardians.
 *
 * Single component, two routes
 * ----------------------------
 * Rather than duplicating the form, this component is mounted on two routes:
 *   /sign-up          → volunteer registration
 *   /guardian-sign-up → guardian registration
 *
 * isGuardianRoute reads router.url at render time to decide which route is
 * active.  pageTitle and pageSubtitle expose the correct strings to the
 * template, and onSubmit() derives the role ('guardian' | 'volunteer') from
 * the same flag before posting to the server.
 *
 * Role assignment
 * ---------------
 * The role is sent to POST /api/auth/signup in the request body.  The server
 * accepts only 'volunteer' and 'guardian' for self-registration — any attempt
 * to pass 'admin' is silently overridden to 'volunteer' server-side, so the
 * client cannot promote itself.
 *
 * Future email-link flow
 * ----------------------
 * When the admin is ready to invite volunteers by email, the link in the email
 * can point directly to /sign-up so volunteers land on the right form
 * without needing a separate component.
 */
import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormControl, FormGroup, FormsModule, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router, RouterLink, RouterModule } from "@angular/router";
import { AuthService } from "../auth-service";
import { FamilyPortalService } from "../../family/family-portal/family-portal.service";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

@Component({
  selector: 'app-signup',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class SignUpComponent {

  signupForm = new FormGroup({
    'fullName': new FormControl('', [Validators.required]),
    'username': new FormControl('', [Validators.required]),
    'email': new FormControl(''),
    'password': new FormControl('', [Validators.required, Validators.minLength(8)])
  });
  isLoading = false;
  error: string | null = null;
  hidePassword = true;

  authService = inject(AuthService);
  familyPortalService = inject(FamilyPortalService);
  router = inject(Router);

  // isGuardianRoute — true when the user arrived via /guardian-sign-up.
  // All role-dependent behavior in this component branches off this getter.
  get isGuardianRoute(): boolean {
    return this.router.url.startsWith('/guardian-sign-up');
  }

  // pageTitle / pageSubtitle — displayed in the card header by the template.
  // Keeps the template free of conditional logic.
  get pageTitle(): string {
    return this.isGuardianRoute ? 'Guardian Sign Up' : 'Volunteer Sign Up';
  }

  get pageSubtitle(): string {
    return this.isGuardianRoute
      ? 'Create an account to view your family\'s supply list'
      : 'Create a volunteer account to get started';
  }

  get requiresEmail(): boolean {
    return !this.isGuardianRoute;
  }

  onSubmit() {
    const emailControl = this.signupForm.get('email');
    if (this.requiresEmail) {
      emailControl?.setValidators([Validators.required, Validators.email]);
    } else {
      emailControl?.clearValidators();
    }
    emailControl?.updateValueAndValidity({ emitEvent: false });

    if (!this.signupForm.valid) return;

    this.isLoading = true;
    this.error = null;

    // Non-null assertions are safe here because onSubmit() only runs when
    // signupForm.valid is true, which requires all fields to be non-empty.
    const { fullName, username, password, email } = this.signupForm.value;
    // Derive the role from the URL so the server stores the correct value.
    // 'ADMIN' is intentionally excluded — admins are promoted after the fact.
    // Must use uppercase to match backend enum: 'GUARDIAN' or 'VOLUNTEER'.
    const systemRole: 'GUARDIAN' | 'VOLUNTEER' = this.isGuardianRoute ? 'GUARDIAN' : 'VOLUNTEER';
    this.authService.signup(username!, password!, fullName!, systemRole, email || undefined).subscribe({
      next: () => {
        if (this.authService.isGuardian()) {
          this.familyPortalService.getSummary().subscribe({
            next: summary => {
              this.router.navigate([summary.profileComplete ? '/family-portal' : '/family-portal/form']);
            },
            error: () => this.router.navigate(['/family-portal/form'])
          });
          return;
        }
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      }
    });
  }
}
