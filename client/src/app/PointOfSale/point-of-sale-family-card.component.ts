import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { Family } from '../family/family';

@Component({
  selector: 'app-point-of-sale-family-card',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  templateUrl: './point-of-sale-family-card.component.html',
  styleUrls: ['./point-of-sale-family-card.component.scss']
})
export class PointOfSaleFamilyCardComponent {
  family = input.required<Family>();
  helpFamily = output<Family>();
}
