import { Component } from '@angular/core';
import { AdvancedFilterComponent } from '../SharedComponents/advanced-filter/advanced-filter.component';
import { FilterField } from '../app.type';

@Component({
  selector: 'app-start',
  standalone: true,
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss'],
  imports: [AdvancedFilterComponent]
})
export class StartComponent {
  filters: FilterField[] = [
    { key: 'item', label: 'Item', type: 'text' },
    { key: 'brand', label: 'Brand', type: 'text'},
    { key: 'count', label: 'Count', type: 'number'}
  ];

}
