// Angular Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';

// Stock Report Tree Imports
import { StockReportTreeComponent, StockNode } from './stock-report-tree.component';

describe('StockReportTreeComponent', () => {
  let component: StockReportTreeComponent;
  let fixture: ComponentFixture<StockReportTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockReportTreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StockReportTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getChildDisplay', () => {
    it('should return label with quantity when quantity is defined', () => {
      const node: StockNode = {
        label: 'Apples',
        quantity: 5,
      };

      component.stockNodes = [node];
      fixture.detectChanges();

      const result = component.getChildDisplay(node);

      expect(result).toBe('Apples: 5');
    });

    it('should return label with notes when quantity, maxQuantity, and minQuantity are undefined', () => {
      const node: StockNode = {
        label: 'Grapes',
        notes: 'Keep refrigerated',
      };

      component.stockNodes = [node];
      fixture.detectChanges();

      const result = component.getChildDisplay(node);

      expect(result).toBe('Grapes: Keep refrigerated');
    });

    it('should return description when no value fields are defined', () => {
      const node: StockNode = {
        description: 'Fresh tropical fruit',
      };

      component.stockNodes = [node];
      fixture.detectChanges();

      const result = component.getChildDisplay(node);

      expect(result).toBe('Fresh tropical fruit');
    });

    it('should return empty string when no value or description fields are defined', () => {
      const node: StockNode = {
        label: 'Unknown',
      };

      component.stockNodes = [node];
      fixture.detectChanges();

      const result = component.getChildDisplay(node);

      expect(result).toBe('');
    });
  });
});
