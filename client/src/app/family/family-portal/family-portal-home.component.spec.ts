import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { FamilyPortalHomeComponent } from './family-portal-home.component';
import { FamilyPortalService } from './family-portal.service';

describe('FamilyPortalHomeComponent', () => {
  let component: FamilyPortalHomeComponent;
  let fixture: ComponentFixture<FamilyPortalHomeComponent>;
  let familyPortalServiceMock: jasmine.SpyObj<Pick<FamilyPortalService, 'getSummary' | 'getChecklist'>>;
  let router: Router;

  beforeEach(waitForAsync(() => {
    familyPortalServiceMock = jasmine.createSpyObj('FamilyPortalService', ['getSummary', 'getChecklist']);
    familyPortalServiceMock.getSummary.and.returnValue(of({
      profileComplete: true,
      family: null,
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
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create and load the checklist for completed profiles', () => {
    expect(component).toBeTruthy();
    expect(component.summary?.profileComplete).toBeTrue();
    expect(component.checklistSections.length).toBe(1);
    expect(component.isLoading).toBeFalse();
  });

  it('should redirect to the family form when the profile is incomplete', () => {
    const navigateSpy = spyOn(router, 'navigate');
    familyPortalServiceMock.getChecklist.calls.reset();
    familyPortalServiceMock.getSummary.and.returnValue(of({
      profileComplete: false,
      family: null
    }));

    fixture = TestBed.createComponent(FamilyPortalHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/family-portal/form']);
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
