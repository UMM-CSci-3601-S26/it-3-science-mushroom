import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormControl, FormGroup, FormsModule, Validators, ReactiveFormsModule } from "@angular/forms";
import { RouterLink, Router, RouterModule } from "@angular/router";
import { AuthService } from "../auth-service";
import { FamilyPortalService } from "../../family/family-portal/family-portal.service";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
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

export class LoginComponent {
  loginForm = new FormGroup({
    'username': new FormControl('', [Validators.required]),
    'password': new FormControl('', [Validators.required])
  });

  isLoading = false;
  error: string | null = null;
  hidePassword = true;

  authService = inject(AuthService);
  familyPortalService = inject(FamilyPortalService);
  router = inject(Router);

  onSubmit() {
    if (!this.loginForm.valid) return;

    this.isLoading = true;
    this.error = null;

    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
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
