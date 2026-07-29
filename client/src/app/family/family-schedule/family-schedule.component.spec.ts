import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../auth/auth-service';
import { AppSettings, TimeAvailabilityLabels } from '../../settings/settings';
import { SettingsService } from '../../settings/settings.service';
import { Family } from '../family';
import { FamilyService } from '../family.service';
import { FamilyScheduleComponent } from './family-schedule.component';

describe('FamilyScheduleComponent', () => {
  let component: FamilyScheduleComponent;
  let fixture: ComponentFixture<FamilyScheduleComponent>;
  let familyServiceSpy: jasmine.SpyObj<FamilyService>;
  let settingsServiceSpy: jasmine.SpyObj<SettingsService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const noonCrossoverLabels: TimeAvailabilityLabels = {
    earlyMorning: '8:00-9:00 AM',
    lateMorning: '9:00-10:00 AM',
    earlyAfternoon: '11:30 - 12:30 PM',
    lateAfternoon: '1:00-2:00 PM'
  };

  beforeEach(async () => {
    familyServiceSpy = jasmine.createSpyObj<FamilyService>('FamilyService', [
      'getFamilies',
      'scheduleFamilies',
      'clearScheduledTimes'
    ]);
    familyServiceSpy.getFamilies.and.returnValue(of([]));

    settingsServiceSpy = jasmine.createSpyObj<SettingsService>('SettingsService', ['getSettings']);
    settingsServiceSpy.getSettings.and.returnValue(of({
      timeAvailability: noonCrossoverLabels,
      defaultScheduleColumns: {
        englishFamilies: 1,
        spanishFamilies: 0
      }
    } as AppSettings));

    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin', 'hasPermission']);
    authServiceSpy.isAdmin.and.returnValue(true);
    authServiceSpy.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [FamilyScheduleComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: FamilyService, useValue: familyServiceSpy },
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates schedule rows for a noon crossover saved without a start meridiem', () => {
    const rows = component.scheduleTimeRows();
    const firstNoonRowIndex = rows.indexOf('11:30 AM-11:45 AM');

    expect(rows.slice(firstNoonRowIndex, firstNoonRowIndex + 4)).toEqual([
      '11:30 AM-11:45 AM',
      '11:45 AM-12:00 PM',
      '12:00 PM-12:15 PM',
      '12:15 PM-12:30 PM'
    ]);
  });

  it('places a family block for a saved noon crossover window', () => {
    component.families.set([scheduledFamily('11:30 - 12:30 PM')]);

    const block = component.scheduleDisplayBlocks()[0];

    expect(block).toBeDefined();
    expect(block.family.guardianName).toBe('Noon Family');
    expect(block.rowStart).toBe(component.scheduleTimeRows().indexOf('11:30 AM-11:45 AM') + 1);
    expect(block.rowSpan).toBe(4);
    expect(block.columnStart).toBe(1);
  });

  function scheduledFamily(timeSlot: string): Family {
    return {
      guardianName: 'Noon Family',
      email: 'noon@example.com',
      address: '123 Main St',
      accommodations: '',
      needSpanishHelp: false,
      timeSlot,
      scheduleAssignment: {
        timeSlot,
        columnType: 'English',
        columnIndex: 1
      },
      timeAvailability: {
        earlyMorning: false,
        lateMorning: false,
        earlyAfternoon: true,
        lateAfternoon: false
      },
      students: [
        {
          name: 'Student One',
          grade: '1',
          school: 'Test School',
          schoolAbbreviation: 'TS',
          teacher: 'Teacher',
          headphones: false,
          backpack: false
        }
      ]
    };
  }
});
