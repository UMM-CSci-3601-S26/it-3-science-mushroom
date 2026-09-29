import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FilterContent, FilterField } from 'src/app/filter.types';


@Component({
  selector: 'app-advanced-filter',
  standalone: true,
  templateUrl: './advanced-filter.component.html',
  imports: [
    MatFormField,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class AdvancedFilterComponent {
  @Input() filters: FilterField[] = [];
  @Output() filteredItemsChange = new EventEmitter<FilterContent>();

  filterValues: FilterContent = {};

  setFilterValue(filter: FilterField, rawValue: string): void {
    const trimmed = rawValue.trim();
    const value = trimmed === '' ? undefined : filter.type === 'number' ? Number(trimmed) : trimmed;

    this.filterValues = {...this.filterValues, [filter.key]: value};

    this.filteredItemsChange.emit(this.activeFilters(this.filterValues));
  }

  private activeFilters(filters: FilterContent): FilterContent {
    return Object.fromEntries(Object.entries(filters).filter(([,value]) =>
      value !== undefined && value !== ''
    ));
  }
}
