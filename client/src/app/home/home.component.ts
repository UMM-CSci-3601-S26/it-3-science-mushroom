import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home-component',
  templateUrl: 'home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [],
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ]
})
export class HomeComponent {
  readonly impactStats = [
    { label: 'Students Equipped', value: '3,480+', icon: 'school', tone: 'primary' },
    { label: 'Families Supported', value: '1,290+', icon: 'groups', tone: 'accent' },
    { label: 'Supply Kits Delivered', value: '5,760+', icon: 'inventory_2', tone: 'success' },
    { label: 'Partner Schools', value: '27', icon: 'apartment', tone: 'muted' }
  ];

  readonly milestones = [
    {
      title: 'Collect Donations',
      detail: 'Community drives, business sponsors, and family contributions are sorted into supply categories.',
      icon: 'volunteer_activism'
    },
    {
      title: 'Match School Requests',
      detail: 'Staff and volunteers map inventory to school lists so each grade gets what is most needed.',
      icon: 'rule_folder'
    },
    {
      title: 'Deliver With Care',
      detail: 'Supplies are packed by school and delivered to students and families with dignity and celebration.',
      icon: 'local_shipping'
    }
  ];

  readonly spotlightNeeds = [
    { label: 'Backpacks', progress: 72 },
    { label: 'Crayons & Markers', progress: 58 },
    { label: 'Notebooks', progress: 84 },
    { label: 'Headphones', progress: 41 }
  ];

  readonly donationIdeas = [
    'Elementary Supply Kit',
    'Middle School STEM Kit',
    'Art Room Bundle',
    'Hygiene Essentials Pack'
  ];

  readonly currentYear = new Date().getFullYear();

}
