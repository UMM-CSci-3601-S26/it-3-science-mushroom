import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AdvancedFilterComponent } from './advanced-filter.component';

describe('AdvancedFilterComponent', () => {
  let fixture: ComponentFixture<AdvancedFilterComponent>;
  let component: AdvancedFilterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvancedFilterComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AdvancedFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits trimmed text filters', () => {
    const emitSpy = spyOn(component.filteredItemsChange, 'emit');

    component.setFilterValue({ key: 'item', label: 'Item', type: 'text' }, ' Markers ');

    expect(component.filterValues).toEqual({ item: 'Markers' });
    expect(emitSpy).toHaveBeenCalledWith({ item: 'Markers' });
  });

  it('emits number filters as numbers', () => {
    const emitSpy = spyOn(component.filteredItemsChange, 'emit');

    component.setFilterValue({ key: 'quantity', label: 'Quantity', type: 'number' }, '12');

    expect(component.filterValues).toEqual({ quantity: 12 });
    expect(emitSpy).toHaveBeenCalledWith({ quantity: 12 });
  });

  it('removes blank filters from emitted content', () => {
    const emitSpy = spyOn(component.filteredItemsChange, 'emit');

    component.setFilterValue({ key: 'item', label: 'Item', type: 'text' }, 'Markers');
    component.setFilterValue({ key: 'item', label: 'Item', type: 'text' }, ' ');

    expect(component.filterValues).toEqual({ item: undefined });
    expect(emitSpy).toHaveBeenCalledWith({});
  });
});
