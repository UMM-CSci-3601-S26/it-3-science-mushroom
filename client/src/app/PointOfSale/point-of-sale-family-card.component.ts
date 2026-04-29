import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { Family } from '../family/family';

@Component({
  selector: 'app-point-of-sale-family-card',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './point-of-sale-family-card.component.html',
  styleUrls: ['./point-of-sale-family-card.component.scss']
})
export class PointOfSaleFamilyCardComponent {
  family = input.required<Family>();
  helpFamily = output<Family>();
  revertFamily = output<Family>();

  isCompleted(): boolean {
    return this.family().status === 'helped' || !!this.family().helped;
  }

  statusLabel(): string {
    switch (this.family().status) {
    case 'helped':
      return 'Helped';
    case 'being_helped':
      return 'In progress';
    default:
      return 'Not helped';
    }
  }

  statusClass(): string {
    switch (this.family().status) {
    case 'helped':
      return 'status-helped';
    case 'being_helped':
      return 'status-in-progress';
    default:
      return 'status-not-helped';
    }
  }
}
