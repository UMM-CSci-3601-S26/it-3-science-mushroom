// Angular Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';

// Supply List Tree Imports
import { SupplyListTreeComponent, SupplyListNode } from './supply-list-tree.component';

// Supply List Imports
import { SupplyList } from './supplylist';

describe('SupplyListTreeComponent', () => {
  let component: SupplyListTreeComponent;
  let fixture: ComponentFixture<SupplyListTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplyListTreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplyListTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const testSupplyList: SupplyList[] = [
    {
      school: "MHS",
      grade: "PreK",
      item: "Markers",
      description: "8 Pack of Washable Wide Markers",
      brand: "Crayola",
      color: "Black",
      count: 8,
      size: "Wide",
      type: "Washable",
      material: "N/A",
      quantity: 0,
      notes: "N/A"
    },
    {
      school: "Herman",
      grade: "6th grade",
      item: "Folder",
      description: "Red 2 Prong Plastic Pocket Folder",
      brand: "N/A",
      color: "Red",
      count: 1,
      size: "N/A",
      type: "2 Prong",
      material: "Plastic",
      quantity: 0,
      notes: "N/A"
    },
    {
      school: "MHS",
      grade: "4th grade",
      item: "Notebook",
      description: "Yellow Wide Ruled Spiral Notebook",
      brand: "Five Star",
      color: "Yellow",
      count: 1,
      size: "Wide Ruled",
      type: "Spiral",
      material: "N/A",
      quantity: 0,
      notes: "N/A"
    }
  ];



  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getNodeDisplay', () => {
    it('should return school when it is defined', () => {
      const node: SupplyListNode = {
        school: 'MAHS'
      };

      component.supplyListNodes = [node];
      fixture.detectChanges();

      const result = component.getNodeDisplay(node);

      expect(result).toBe('MAHS');
    });

    it('should return empty string when no fields are defined', () => {
      const node: SupplyListNode = {};

      component.supplyListNodes = [node];
      fixture.detectChanges();

      const result = component.getNodeDisplay(node);

      expect(result).toBe('');
    });
  });

  describe('formatItemDetails', () => {
    it('should format item details correctly', () => {
      const result = component.formatItemDetails(testSupplyList[0]);

      expect(result).toContain('Description: 8 Pack of Washable Wide Markers');
      expect(result).toContain('Brand: Crayola');
      expect(result).toContain('Color: Black');
      expect(result).toContain('Size: Wide');
      expect(result).toContain('Type: Washable');
      expect(result).toContain('Material: N/A');
      expect(result).toContain('Quantity: 0');
      expect(result).toContain('Notes: N/A');
    });
  });

  describe('openItemDialog', () => {
    it('should not open dialog if supply is undefined', () => {
      spyOn(component['dialogService'], 'openDialog');

      component.openItemDialog(undefined as unknown as SupplyList);

      expect(component['dialogService'].openDialog).not.toHaveBeenCalled();
    });

    it('should open dialog with correct data', () => {
      spyOn(component['dialogService'], 'openDialog');

      component.openItemDialog(testSupplyList[0]);

      expect(component['dialogService'].openDialog).toHaveBeenCalledWith({
        title: `Item View - ${testSupplyList[0].item}`,
        message: component.formatItemDetails(testSupplyList[0]),
        buttonOne: 'Exit',
      }, '600px', '400px');
    });
  });
});
