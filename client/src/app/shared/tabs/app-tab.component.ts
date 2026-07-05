import { Component, Input, TemplateRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-tab',
  standalone: true,
  template: `
    <ng-template #content>
      <ng-content></ng-content>
    </ng-template>
  `
})
export class AppTabComponent {
  @Input({ required: true }) label = '';

  @ViewChild('content', { static: true }) content!: TemplateRef<unknown>;
}
