import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { Family } from '../family/family';

@Component({
  selector: 'app-point-of-sale-session-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatDialogModule],
  templateUrl: './point-of-sale-session-dialog.component.html',
  styleUrls: ['./point-of-sale-session-dialog.component.scss']
})
export class PointOfSaleSessionDialogComponent {
  protected readonly dialogRef = inject(MatDialogRef<PointOfSaleSessionDialogComponent>);
  protected readonly data = inject<{ family: Family }>(MAT_DIALOG_DATA);
}
