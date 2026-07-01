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
        title: 'Basics',
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

  it('should welcome the guardian and title the checklist with the child name', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Welcome, Alex Guardian');
    expect(compiled.textContent).toContain('Sam Student\'s Checklist');
    expect(compiled.textContent).not.toContain('Back to School Supplies');
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
