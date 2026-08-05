import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FamilyPortalHomeComponent } from './family-portal-home.component';
import { FamilyPortalService } from './family-portal.service';

describe('FamilyPortalHomeComponent', () => {
  let component: FamilyPortalHomeComponent;
  let fixture: ComponentFixture<FamilyPortalHomeComponent>;
  let familyPortalServiceMock: jasmine.SpyObj<Pick<FamilyPortalService, 'getSummary' | 'getChecklist'>>;

  beforeEach(waitForAsync(() => {
    familyPortalServiceMock = jasmine.createSpyObj('FamilyPortalService', ['getSummary', 'getChecklist']);
    familyPortalServiceMock.getSummary.and.returnValue(of({
      profileComplete: true,
      family: {
        guardianName: 'Alex Guardian',
        email: 'alex@example.com',
        address: '123 Portal Lane',
        accommodations: '',
        needSpanishHelp: false,
        timeSlot: '9:00-10:00 AM',
        students: [{
          name: 'Sam Student',
          grade: '3',
          school: 'Morris Elementary',
          schoolAbbreviation: 'MES',
          teacher: 'Ms. Green',
          backpack: true,
          headphones: false
        }],
        timeAvailability: {
          earlyMorning: true,
          lateMorning: false,
          earlyAfternoon: false,
          lateAfternoon: false
        }
      },
      driveDay: { date: '2026-08-15', message: 'See you soon.' },
      timeSlot: '9:00-10:00 AM',
      timeSlotStatus: 'assigned'
    }));
    familyPortalServiceMock.getChecklist.and.returnValue(of({
      templateId: 'template-1',
      printableTitle: 'Back to School Supplies',
      sections: [{
        id: 'section-1',
        title: 'Sam Student',
        printableTitle: 'Sam Student',
        items: [{
          id: 'item-1',
          label: 'Pencils',
          requestedQuantity: 2
        }]
      }]
    }));

    TestBed.configureTestingModule({
      imports: [FamilyPortalHomeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: FamilyPortalService, useValue: familyPortalServiceMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FamilyPortalHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load the checklist for completed profiles', () => {
    expect(component).toBeTruthy();
    expect(component.summary?.profileComplete).toBeTrue();
    expect(component.checklistSections.length).toBe(1);
    expect(component.isLoading).toBeFalse();
  });

  it('should welcome the guardian and show the child name only as the checklist section title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const checklistCardTitle = compiled.querySelector('.checklist-card mat-card-title')?.textContent;
    const checklistSectionTitle = compiled.querySelector('.checklist-section h3')?.textContent;

    expect(compiled.textContent).toContain('Welcome, Alex Guardian');
    expect(checklistCardTitle).toContain('Supply Checklist');
    expect(checklistSectionTitle).toContain('Sam Student');
    expect(checklistCardTitle).not.toContain('Sam Student');
    expect(compiled.textContent).not.toContain('Back to School Supplies');
  });

  it('should use a plural checklist title when the family has multiple children', () => {
    familyPortalServiceMock.getSummary.and.returnValue(of({
      profileComplete: true,
      family: {
        guardianName: 'Alex Guardian',
        email: 'alex@example.com',
        address: '123 Portal Lane',
        accommodations: '',
        needSpanishHelp: false,
        timeSlot: '9:00-10:00 AM',
        students: [{
          name: 'Sam Student',
          grade: '3',
          school: 'Morris Elementary',
          schoolAbbreviation: 'MES',
          teacher: 'Ms. Green',
          backpack: true,
          headphones: false
        }, {
          name: 'Jordan Student',
          grade: '5',
          school: 'Morris Elementary',
          schoolAbbreviation: 'MES',
          teacher: 'Mr. Blue',
          backpack: false,
          headphones: true
        }],
        timeAvailability: {
          earlyMorning: true,
          lateMorning: false,
          earlyAfternoon: false,
          lateAfternoon: false
        }
      },
      driveDay: { date: '2026-08-15', message: 'See you soon.' },
      timeSlot: '9:00-10:00 AM',
      timeSlotStatus: 'assigned'
    }));
    familyPortalServiceMock.getChecklist.and.returnValue(of({
      templateId: 'template-1',
      printableTitle: 'Back to School Supplies',
      sections: [{
        id: 'student-1',
        title: 'Sam Student',
        printableTitle: 'Sam Student',
        items: []
      }, {
        id: 'student-2',
        title: 'Jordan Student',
        printableTitle: 'Jordan Student',
        items: []
      }]
    }));

    fixture = TestBed.createComponent(FamilyPortalHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const checklistCardTitle = compiled.querySelector('.checklist-card mat-card-title')?.textContent;
    const sectionTitles = Array.from(compiled.querySelectorAll('.checklist-section h3'))
      .map(section => section.textContent);

    expect(checklistCardTitle).toContain('Supply Checklists');
    expect(checklistCardTitle).not.toContain('Sam Student');
    expect(checklistCardTitle).not.toContain('Jordan Student');
    expect(sectionTitles).toContain('Sam Student');
    expect(sectionTitles).toContain('Jordan Student');
  });

  it('should explain when a student has no matching checklist items', () => {
    familyPortalServiceMock.getChecklist.and.returnValue(of({
      templateId: 'template-1',
      printableTitle: 'Back to School Supplies',
      sections: [{
        id: 'student-1',
        title: 'Sam Student',
        printableTitle: 'Sam Student',
        items: []
      }]
    }));

    fixture = TestBed.createComponent(FamilyPortalHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyNote = compiled.querySelector('.empty-section-note')?.textContent;

    expect(emptyNote).toContain('No checklist items were found for the current school, grade, and teacher.');
  });

  it('should show the portal without loading a checklist when the profile is incomplete', () => {
    familyPortalServiceMock.getChecklist.calls.reset();
    familyPortalServiceMock.getSummary.and.returnValue(of({
      profileComplete: false,
      family: null
    }));

    fixture = TestBed.createComponent(FamilyPortalHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.summary?.profileComplete).toBeFalse();
    expect(component.isLoading).toBeFalse();
    expect(familyPortalServiceMock.getChecklist).not.toHaveBeenCalled();
  });

  it('should show an error when checklist loading fails', () => {
    familyPortalServiceMock.getChecklist.and.returnValue(throwError(() => new Error('checklist failed')));

    fixture = TestBed.createComponent(FamilyPortalHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.error).toBe('Unable to load your checklist right now.');
    expect(component.isLoading).toBeFalse();
  });

  it('should show an error when summary loading fails', () => {
    familyPortalServiceMock.getSummary.and.returnValue(throwError(() => new Error('summary failed')));

    fixture = TestBed.createComponent(FamilyPortalHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.error).toBe('Unable to load your family portal data right now.');
    expect(component.isLoading).toBeFalse();
  });
});
