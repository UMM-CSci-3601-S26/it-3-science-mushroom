import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Family } from '../family/family';
import { FamilyService } from '../family/family.service';
import { PointOfSaleFamilyCardComponent } from './point-of-sale-family-card.component';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

@Component({
  selector: 'app-point-of-sale',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDialogModule, PointOfSaleFamilyCardComponent],
  templateUrl: './PointOfSale.html',
  styleUrls: ['./PointOfSale.scss']
})
export class PointOfSaleComponent implements OnInit {
  private familyService = inject(FamilyService);
  private dialog = inject(MatDialog);

  families: Family[] = [];

  ngOnInit(): void {
    this.familyService.getFamilies().subscribe({
      next: (families) => {
        this.families = families;
      },
      error: (err) => {
        console.error('Failed to load families', err);
      }
    });
  }

  openHelpFamilySession(family: Family): void {
    this.dialog.open(PointOfSaleSessionDialogComponent, {
      data: { family },
      width: '900px',
      maxWidth: '95vw'
    });
  }
}
