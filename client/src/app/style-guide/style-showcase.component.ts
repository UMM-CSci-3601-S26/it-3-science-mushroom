import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DialogService } from '../shared/dialog/dialog.service';

type TokenSample = {
  label: string;
  token: string;
  use: string;
};

@Component({
  selector: 'app-style-showcase',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './style-showcase.component.html',
  styleUrls: ['./style-showcase.component.scss']
})
export class StyleShowcaseComponent {
  private snackBar = inject(MatSnackBar);
  private dialogService = inject(DialogService);

  selectedView = 'simple';
  school = 'Morris Area Elementary School';
  notifications = true;
  includeInactive = false;

  readonly colorTokens: TokenSample[] = [
    { label: 'Page Background', token: '--app-bg', use: 'Application canvas' },
    { label: 'Surface', token: '--app-surface', use: 'Cards and panels' },
    { label: 'Muted Surface', token: '--app-surface-muted', use: 'Secondary areas and hover' },
    { label: 'Primary', token: '--app-primary', use: 'Main actions and selection' },
    { label: 'Accent', token: '--app-accent', use: 'Secondary emphasis' },
    { label: 'Success', token: '--app-success', use: 'Completed and positive states' },
    { label: 'Warn', token: '--app-warn', use: 'Errors and destructive actions' },
    { label: 'Tertiary', token: '--app-tertiary', use: 'Optional third category' },
    { label: 'Text', token: '--app-text', use: 'Primary readable text' },
    { label: 'Muted Text', token: '--app-text-muted', use: 'Supporting information' },
    { label: 'Border', token: '--app-border', use: 'Dividers and outlines' },
    { label: 'Contrast', token: '--app-contrast', use: 'Rare high-contrast details' }
  ];

  readonly spacingTokens = [
    { token: '--app-space-xs', size: '4px' },
    { token: '--app-space-sm', size: '8px' },
    { token: '--app-space-md', size: '16px' },
    { token: '--app-space-lg', size: '24px' },
    { token: '--app-space-xl', size: '32px' }
  ];

  readonly pageTemplate = `<section class="app-page-shell app-page-stack">
  <header class="app-page-header">
    <div>
      <h1 class="app-page-title">Page Name</h1>
      <p class="app-page-subtitle">What users do here.</p>
    </div>
    <div class="app-action-row">
      <button mat-raised-button color="primary">Primary Action</button>
    </div>
  </header>

  <section class="app-panel app-stack-md">
    <div class="app-field-action-row">
      <mat-form-field appearance="outline">
        <mat-label>Search</mat-label>
        <input matInput data-cy="feature-search">
      </mat-form-field>
      <button mat-stroked-button>Clear</button>
    </div>
  </section>
</section>`;

  showFeedback(): void {
    this.snackBar.open('This is standard short feedback.', 'Close', { duration: 3000 });
  }

  showConfirmation(): void {
    this.dialogService.openDialog({
      title: 'Example Confirmation',
      message: 'Use the shared dialog service for actions that need confirmation.',
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm'
    }, '480px', '220px');
  }
}
