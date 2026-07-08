import { NgTemplateOutlet } from '@angular/common';
import { Component, ContentChildren, QueryList } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

import { AppTabComponent } from './app-tab.component';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [MatTabsModule, NgTemplateOutlet],
  templateUrl: './app-tabs.component.html',
  styleUrls: ['./app-tabs.component.scss']
})
export class AppTabsComponent {
  @ContentChildren(AppTabComponent) tabs: QueryList<AppTabComponent> | undefined;
}
