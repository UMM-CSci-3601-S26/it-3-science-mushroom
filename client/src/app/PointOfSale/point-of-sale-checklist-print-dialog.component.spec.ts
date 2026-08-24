import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { Family } from '../family/family';
import { PointOfSaleChecklistPrintDialogComponent } from './point-of-sale-checklist-print-dialog.component';

describe('PointOfSaleChecklistPrintDialogComponent', () => {
  let fixture: ComponentFixture<PointOfSaleChecklistPrintDialogComponent>;
  let component: PointOfSaleChecklistPrintDialogComponent;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<PointOfSaleChecklistPrintDialogComponent>>;

  const family: Family = {
    _id: 'family-1',
    guardianName: 'Jane Doe',
    email: 'jane@example.com',
    address: '123 Main St',
    accommodations: 'None',
    needSpanishHelp: false,
    timeSlot: '9:00-10:00',
    students: [
      {
        name: 'Sam',
        grade: '3',
        school: 'Morris Area Elementary School',
        schoolAbbreviation: 'MAES',
        teacher: 'Ms. Test',
        headphones: false,
        backpack: true
      },
      {
        name: 'Ari',
        grade: '',
        school: 'N/A',
        schoolAbbreviation: '',
        teacher: '',
        headphones: false,
        backpack: false
      }
    ]
  };

  const secondFamily: Family = {
    ...family,
    _id: 'family-2',
    guardianName: 'Pat Smith',
    students: [
      {
        name: 'Lee',
        grade: '5',
        school: 'Morris Area Elementary School',
        schoolAbbreviation: 'MAES',
        teacher: 'Mr. Example',
        headphones: true,
        backpack: false
      }
    ]
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj<MatDialogRef<PointOfSaleChecklistPrintDialogComponent>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [PointOfSaleChecklistPrintDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { families: [family, secondFamily] } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PointOfSaleChecklistPrintDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a selectable row for each student', () => {
    expect(fixture.nativeElement.querySelectorAll('.student-row').length).toBe(3);
  });

  it('selects all students and returns grouped family selections for printing', () => {
    component.selectAllStudents();
    component.printSelectedStudents();

    expect(dialogRefSpy.close).toHaveBeenCalledOnceWith({
      familySelections: [
        {
          family,
          selectedStudentIndexes: [0, 1]
        },
        {
          family: secondFamily,
          selectedStudentIndexes: [0]
        }
      ]
    });
  });

  it('returns only selected students and ignores empty selections', () => {
    component.printSelectedStudents();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();

    component.toggleStudent(1, 0, true);
    component.printSelectedStudents();

    expect(dialogRefSpy.close).toHaveBeenCalledOnceWith({
      familySelections: [{
        family: secondFamily,
        selectedStudentIndexes: [0]
      }]
    });
  });

  it('uses not listed text for blank or N/A values in the selector', () => {
    expect(component.displayValue('N/A')).toBe('Not listed');
    expect(component.displayValue('   ')).toBe('Not listed');
    expect(component.displayValue('Ms. Test')).toBe('Ms. Test');
  });
});
