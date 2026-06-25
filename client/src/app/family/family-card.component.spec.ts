// Angular Imports
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
// Family Imports
import { FamilyCardComponent } from './family-card.component';
import { Family } from './family';
import { FamilyService } from './family.service';
import { MockFamilyService } from 'src/testing/family.service.mock';

import { ActivatedRouteStub } from 'src/testing/activated-route-stub';

describe('FamilyCardComponent', () => {
  let component: FamilyCardComponent;
  let fixture: ComponentFixture<FamilyCardComponent>;
  let expectedFamily: Family;
  const activatedRoute: ActivatedRouteStub = new ActivatedRouteStub({
    id: 'chris_id',
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FamilyCardComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamilyService, useClass: MockFamilyService },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FamilyCardComponent);
    component = fixture.componentInstance;
    expectedFamily = {

      // Family with two kids
      _id: 'chris_id',
      ownerUserId: 'guardian-user-id',
      guardianName: 'Chris',
      address: '123 Street',
      accommodations: 'None',
      email: 'chris@email.com',
      timeSlot: '9:00-10:00',
      timeAvailability: {
        earlyMorning: false,
        lateMorning: true,
        earlyAfternoon: false,
        lateAfternoon: false
      },
      students: [
        {
          name: 'Chris Jr.',
          grade: '2',
          school: "Morris Elementary",
          schoolAbbreviation: "ME",
          teacher: "N/A",
          headphones: true,
          backpack: false
        },
        {
          name: 'Christy',
          grade: '2',
          school: "Morris Elementary",
          schoolAbbreviation: "ME",
          teacher: "N/A",
          headphones: true,
          backpack: false
        }
      ]
    };
    fixture.componentRef.setInput('family', expectedFamily);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be associated with the correct family', () => {
    expect(component.family()).toEqual(expectedFamily);
  });

  it('should be the family named Chris', () => {
    expect(component.family().guardianName).toEqual('Chris');
  });

  it('should return early morning only', () => {
    spyOn(component, 'family').and.returnValue({
      timeAvailability: {
        earlyMorning: true,
        lateMorning: false,
        earlyAfternoon: false,
        lateAfternoon: false
      }
    } as Partial<Family> as Family);

    expect(component.getAvailableTimes()).toBe('Early Morning');
  });

  it('should return late morning only', () => {
    spyOn(component, 'family').and.returnValue({
      timeAvailability: {
        earlyMorning: false,
        lateMorning: true,
        earlyAfternoon: false,
        lateAfternoon: false
      }
    } as Partial<Family> as Family);

    expect(component.getAvailableTimes()).toBe('Late Morning');
  });

  it('should return early afternoon only', () => {
    spyOn(component, 'family').and.returnValue({
      timeAvailability: {
        earlyMorning: false,
        lateMorning: false,
        earlyAfternoon: true,
        lateAfternoon: false
      }
    } as Partial<Family> as Family);

    expect(component.getAvailableTimes()).toBe('Early Afternoon');
  });

  it('should return late afternoon only', () => {
    spyOn(component, 'family').and.returnValue({
      timeAvailability: {
        earlyMorning: false,
        lateMorning: false,
        earlyAfternoon: false,
        lateAfternoon: true
      }
    } as Partial<Family> as Family);

    expect(component.getAvailableTimes()).toBe('Late Afternoon');
  });

  it('should return none only', () => {
    spyOn(component, 'family').and.returnValue({
      timeAvailability: {
        earlyMorning: false,
        lateMorning: false,
        earlyAfternoon: false,
        lateAfternoon: false
      }
    } as Partial<Family> as Family);

    expect(component.getAvailableTimes()).toBe('None');
  });

  it('should return multiple', () => {
    spyOn(component, 'family').and.returnValue({
      timeAvailability: {
        earlyMorning: true,
        lateMorning: true,
        earlyAfternoon: false,
        lateAfternoon: true
      }
    } as Partial<Family> as Family);

    expect(component.getAvailableTimes()).toBe('Early Morning, Late Morning, Late Afternoon');
  });

  it('should report linked guardian account status', () => {
    expect(component.hasLinkedGuardianAccount).toBeTrue();
    expect(component.guardianLinkStatusLabel).toBe('Linked Guardian Account');
  });

  it('should report manual family status when owner user id is missing', () => {
    spyOn(component, 'family').and.returnValue({
      ...expectedFamily,
      ownerUserId: ' '
    });

    expect(component.hasLinkedGuardianAccount).toBeFalse();
    expect(component.guardianLinkStatusLabel).toBe('Manually Added (No Guardian Login)');
  });

  it('should summarize student names', () => {
    expect(component.studentNames).toBe('Chris Jr., Christy');
  });

  it('should emit when requesting delete', () => {
    spyOn(component.requestDelete, 'emit');

    component.onRequestDelete();

    expect(component.requestDelete.emit).toHaveBeenCalled();
  });

  it('should copy the address and show confirmation', () => {
    const services = component as unknown as {
      clipboard: { copy: (value: string) => boolean };
      snackBar: { open: (message: string, action: string, config: { duration: number }) => unknown };
    };
    const clipboard = services.clipboard;
    const snackBar = services.snackBar;
    spyOn(clipboard, 'copy').and.returnValue(true);
    spyOn(snackBar, 'open');

    component.copyContactValue(expectedFamily.address, 'Address');

    expect(clipboard.copy).toHaveBeenCalledWith('123 Street');
    expect(snackBar.open).toHaveBeenCalledWith('Address copied.', 'Close', { duration: 2000 });
  });

  it('should report when copying fails', () => {
    const services = component as unknown as {
      clipboard: { copy: (value: string) => boolean };
      snackBar: { open: (message: string, action: string, config: { duration: number }) => unknown };
    };
    const clipboard = services.clipboard;
    const snackBar = services.snackBar;
    spyOn(clipboard, 'copy').and.returnValue(false);
    spyOn(snackBar, 'open');

    component.copyContactValue(expectedFamily.email, 'Email');

    expect(snackBar.open).toHaveBeenCalledWith('Unable to copy email.', 'Close', { duration: 3000 });
  });
});
