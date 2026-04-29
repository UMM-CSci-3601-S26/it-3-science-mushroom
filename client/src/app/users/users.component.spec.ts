import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { FamilyService } from '../family/family.service';
import { UsersComponent } from './users.component';
import { Family } from '../family/family';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let familyServiceSpy: jasmine.SpyObj<FamilyService>;
  let queryParamMap: BehaviorSubject<ParamMap>;

  beforeEach(waitForAsync(() => {
    familyServiceSpy = jasmine.createSpyObj<FamilyService>('FamilyService', [
      'getDeleteRequests',
      'deleteFamily',
      'restoreDeleteRequest'
    ]);

    familyServiceSpy.getDeleteRequests.and.returnValue(of([]));
    familyServiceSpy.deleteFamily.and.returnValue(of(void 0));
    familyServiceSpy.restoreDeleteRequest.and.returnValue(of({}));
    queryParamMap = new BehaviorSubject(convertToParamMap({}));

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap
          }
        },
        { provide: FamilyService, useValue: familyServiceSpy }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads delete requests on init', () => {
    expect(familyServiceSpy.getDeleteRequests).toHaveBeenCalled();
  });

  it('selects the requested management tab from the query param', () => {
    queryParamMap.next(convertToParamMap({ tab: 'permissions' }));
    expect(component.selectedTabIndex).toBe(2);

    queryParamMap.next(convertToParamMap({ tab: 'users' }));
    expect(component.selectedTabIndex).toBe(1);

    queryParamMap.next(convertToParamMap({ tab: 'requests' }));
    expect(component.selectedTabIndex).toBe(0);
  });

  it('formats the requester label with requester role and display name', () => {
    const family = {
      deleteRequest: {
        requested: true,
        requestedByUserName: 'Alex Volunteer',
        requestedBySystemRole: 'VOLUNTEER'
      }
    } as Family;

    expect(component.getRequesterLabel(family)).toBe('Requested by Volunteer: Alex Volunteer');
  });

  it('formats the requester label without assuming volunteer role', () => {
    const family = {
      deleteRequest: {
        requested: true,
        requestedByUserName: 'Admin User',
        requestedBySystemRole: 'ADMIN'
      }
    } as Family;

    expect(component.getRequesterLabel(family)).toBe('Requested by Admin: Admin User');
  });

  it('sets requests and loading false on load success', () => {
    const requests: Family[] = [
      {
        _id: 'f1',
        guardianName: 'Guardian',
        email: 'g@example.com',
        address: '123 St',
        accommodations: 'None',
        timeSlot: '9:00-10:00',
        students: [],
        timeAvailability: { earlyMorning: true, lateMorning: false, earlyAfternoon: false, lateAfternoon: false },
        deleteRequest: { requested: true, message: 'duplicate entry' }
      }
    ];
    familyServiceSpy.getDeleteRequests.and.returnValue(of(requests));

    component.loadRequests();

    expect(component.pendingDeleteRequests.length).toBe(1);
    expect(component.isLoading).toBeFalse();
  });

  it('handles load requests error', () => {
    familyServiceSpy.getDeleteRequests.and.returnValue(throwError(() => new Error('load failed')));

    component.loadRequests();

    expect(component.isLoading).toBeFalse();
  });

  it('approveDelete does nothing when family id missing', () => {
    const family = {
      guardianName: 'No Id',
      email: 'n@example.com',
      address: 'abc',
      timeSlot: 'to be assigned',
      students: [],
      timeAvailability: { earlyMorning: false, lateMorning: false, earlyAfternoon: false, lateAfternoon: false }
    } as Family;

    component.approveDelete(family);

    expect(familyServiceSpy.deleteFamily).not.toHaveBeenCalled();
  });

  it('approveDelete does nothing when confirmation canceled', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const family = {
      _id: 'f1',
      guardianName: 'Cancel',
      email: 'c@example.com',
      address: 'abc',
      timeSlot: 'to be assigned',
      students: [],
      timeAvailability: { earlyMorning: false, lateMorning: false, earlyAfternoon: false, lateAfternoon: false }
    } as Family;

    component.approveDelete(family);

    expect(familyServiceSpy.deleteFamily).not.toHaveBeenCalled();
  });

  it('approveDelete deletes and removes request when confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const family = {
      _id: 'f1',
      ownerUserId: 'owner-1',
      guardianName: 'Delete Me',
      email: 'd@example.com',
      address: 'abc',
      timeSlot: 'to be assigned',
      students: [],
      timeAvailability: { earlyMorning: false, lateMorning: false, earlyAfternoon: false, lateAfternoon: false }
    } as Family;
    component.pendingDeleteRequests = [family];

    component.approveDelete(family);

    expect(familyServiceSpy.deleteFamily).toHaveBeenCalledWith('f1');
    expect(component.pendingDeleteRequests.length).toBe(0);
  });

  it('approveDelete keeps request when delete API errors', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    familyServiceSpy.deleteFamily.and.returnValue(throwError(() => new Error('delete failed')));
    const family = {
      _id: 'f1',
      guardianName: 'Delete Fail',
      email: 'df@example.com',
      address: 'abc',
      timeSlot: 'to be assigned',
      students: [],
      timeAvailability: { earlyMorning: false, lateMorning: false, earlyAfternoon: false, lateAfternoon: false }
    } as Family;
    component.pendingDeleteRequests = [family];

    component.approveDelete(family);

    expect(component.pendingDeleteRequests.length).toBe(1);
  });

  it('restoreFamily does nothing when id missing', () => {
    component.restoreFamily({} as Family);
    expect(familyServiceSpy.restoreDeleteRequest).not.toHaveBeenCalled();
  });

  it('restoreFamily removes request on success', () => {
    const family = {
      _id: 'f1',
      guardianName: 'Restore Me',
      email: 'r@example.com',
      address: 'abc',
      timeSlot: 'to be assigned',
      students: [],
      timeAvailability: { earlyMorning: false, lateMorning: false, earlyAfternoon: false, lateAfternoon: false }
    } as Family;
    component.pendingDeleteRequests = [family];

    component.restoreFamily(family);

    expect(familyServiceSpy.restoreDeleteRequest).toHaveBeenCalledWith('f1');
    expect(component.pendingDeleteRequests.length).toBe(0);
  });

  it('restoreFamily keeps request on error', () => {
    familyServiceSpy.restoreDeleteRequest.and.returnValue(throwError(() => new Error('restore failed')));
    const family = {
      _id: 'f1',
      guardianName: 'Restore Fail',
      email: 'rf@example.com',
      address: 'abc',
      timeSlot: 'to be assigned',
      students: [],
      timeAvailability: { earlyMorning: false, lateMorning: false, earlyAfternoon: false, lateAfternoon: false }
    } as Family;
    component.pendingDeleteRequests = [family];

    component.restoreFamily(family);

    expect(component.pendingDeleteRequests.length).toBe(1);
  });
});
