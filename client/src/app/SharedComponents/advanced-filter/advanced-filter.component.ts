import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FilterField } from 'src/app/app.type';


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
export class AdvancedFilterComponent<T extends object = Record<string, unknown>> implements OnChanges {
  @Input() filters: FilterField[] = [];
  @Input() items: T[] = [];
  @Output() filteredItemsChange = new EventEmitter<T[]>();

  filterValues: Record<string, string> = {};

  ngOnChanges(): void {
    this.applyFilters();
  }

  setFilterValue(key: string, value: string): void {
    this.filterValues[key] = value;
    this.applyFilters();
  }

  private applyFilters(): void {
    const activeFilters: [string, string][] = [];

    for (const filter of this.filters) {
      const value = (this.filterValues[filter.key] ?? '').trim().toLowerCase();

      if (value) {
        activeFilters.push([filter.key, value]);
      }
    }

    if (activeFilters.length === 0) {
      this.filteredItemsChange.emit(this.items);
      return;
    }

    this.filteredItemsChange.emit(
      this.items.filter(item =>
        activeFilters.every(([key, value]) =>
          this.matchesFilterValue(this.itemValue(item, key), value)
        )
      )
    );
  }

  private itemValue(item: T, key: string): unknown {
    return (item as Record<string, unknown>)[key];
  }

  private matchesFilterValue(value: unknown, filterValue: string): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    return String(value).toLowerCase().includes(filterValue);
  }
}
