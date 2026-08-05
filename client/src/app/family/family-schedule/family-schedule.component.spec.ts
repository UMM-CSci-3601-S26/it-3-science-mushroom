import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../auth/auth-service';
import { AppSettings, TimeAvailabilityLabels } from '../../settings/settings';
import { SettingsService } from '../../settings/settings.service';
import { Family } from '../family';
import { FamilyService } from '../family.service';
import { FamilyScheduleComponent } from './family-schedule.component';

type ScheduleFailureMessageHost = {
  scheduleFailureMessage(err: unknown): string;
};

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
        englishFamilies: 2,
        spanishFamilies: 1
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

    createComponent();
  });

  it('loads schedule columns and splits them by language type', () => {
    expect(component.scheduledColumns().map(column => column.label)).toEqual(['Slot 1', 'Slot 2', 'Slot 3']);
    expect(component.englishScheduleColumns().length).toBe(2);
    expect(component.spanishScheduleColumns().length).toBe(1);
    expect(component.checkColumnType(component.spanishScheduleColumns()[0])).toBe('Spanish');
    expect(component.scheduleBoardColumns()).toContain('repeat(3,');
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

  it('uses fallback labels and one board row when settings are missing', () => {
    settingsServiceSpy.getSettings.and.returnValue(of({} as AppSettings));

    createComponent();
    component.timeAvailabilityLabels.set({
      earlyMorning: '',
      lateMorning: '',
      earlyAfternoon: '',
      lateAfternoon: ''
    });

    expect(component.scheduleColumns().map(column => column.label)).toEqual(['Slot 1']);
    expect(component.scheduleTimeRows()).toEqual([]);
    expect(component.scheduleBoardRows()).toBe('repeat(1, var(--schedule-row-height))');
  });

  it('partitions families by Spanish help and detects scheduled values', () => {
    component.families.set([
      scheduledFamily('TBD', { guardianName: 'Pending Family' }),
      scheduledFamily('to be assigned', { guardianName: 'Assigned Text Family' }),
      scheduledFamily('9:00 AM-9:15 AM', { guardianName: 'English Family' }),
      scheduledFamily('9:15 AM-9:30 AM', {
        guardianName: 'Spanish Family',
        needSpanishHelp: true
      })
    ]);

    expect(component.needSpanishHelpFamilies().map(family => family.guardianName)).toEqual(['Spanish Family']);
    expect(component.noSpanishHelpFamilies().map(family => family.guardianName)).toEqual([
      'Pending Family',
      'Assigned Text Family',
      'English Family'
    ]);
    expect(component.hasScheduledTimes()).toBeTrue();
    expect(component.scheduleWindow(scheduledFamily('   '))).toBe('To be assigned');
  });

  it('sorts scheduled families by parsed time and guardian name', () => {
    component.families.set([
      scheduledFamily('TBD', { guardianName: 'Zed Last' }),
      scheduledFamily('banana', { guardianName: 'Bad Slot' }),
      scheduledFamily('1 PM', { guardianName: 'Noon Later' }),
      scheduledFamily('12 AM', { guardianName: 'Midnight First' }),
      scheduledFamily('9:00 AM-9:15 AM', { guardianName: 'Chris Baker' }),
      scheduledFamily('9:00 AM-9:15 AM', { guardianName: 'Chris Able' })
    ]);

    expect(component.scheduledFamilies().map(family => family.guardianName)).toEqual([
      'Midnight First',
      'Chris Able',
      'Chris Baker',
      'Noon Later',
      'Bad Slot',
      'Zed Last'
    ]);
  });

  it('renders non-rectangular saved assignments as line segment blocks', () => {
    component.families.set([
      scheduledFamily('8:00 AM-8:30 AM', {
        _id: 'large-family',
        scheduleAssignments: [
          { timeSlot: '8:00 AM-8:15 AM', columnType: 'English', columnIndex: 1 },
          { timeSlot: '8:00 AM-8:15 AM', columnType: 'English', columnIndex: 2 },
          { timeSlot: '8:15 AM-8:30 AM', columnType: 'English', columnIndex: 1 }
        ]
      })
    ]);

    const blocks = component.scheduleDisplayBlocks();

    expect(blocks.length).toBe(2);
    expect(blocks[0].columnSpan).toBe(2);
    expect(blocks[0].showFamilyDetails).toBeTrue();
    expect(blocks[1].isContinuation).toBeTrue();
  });

  it('ignores duplicate assignment cells and assignments outside the grid', () => {
    component.families.set([
      scheduledFamily('8:00 AM-8:15 AM', {
        scheduleAssignments: [
          { timeSlot: '8:00 AM-8:15 AM', columnType: 'English', columnIndex: 1 },
          { timeSlot: '8:00 AM-8:15 AM', columnType: 'English', columnIndex: 1 },
          { timeSlot: '8:00 AM-8:15 AM', columnType: 'English', columnIndex: 99 },
          { timeSlot: '7:00 AM-7:15 AM', columnType: 'English', columnIndex: 1 },
          { timeSlot: 'banana', columnType: 'English', columnIndex: 1 }
        ]
      })
    ]);

    const blocks = component.scheduleDisplayBlocks();

    expect(blocks.length).toBe(1);
    expect(blocks[0].rowSpan).toBe(1);
    expect(blocks[0].columnSpan).toBe(1);
  });

  it('clears scheduled times and reports success', () => {
    const clearedFamilies = [scheduledFamily('')];
    component.families.set([scheduledFamily('8:00 AM-8:15 AM')]);
    familyServiceSpy.clearScheduledTimes.and.returnValue(of(clearedFamilies));

    component.clearScheduledTimes();

    expect(familyServiceSpy.clearScheduledTimes).toHaveBeenCalled();
    expect(component.families()).toBe(clearedFamilies);
    expect(component.isClearingScheduledTimes()).toBeFalse();
  });

  it('does not clear when there are no scheduled times or clearing is already active', () => {
    component.families.set([scheduledFamily('TBD')]);

    component.clearScheduledTimes();

    component.families.set([scheduledFamily('8:00 AM-8:15 AM')]);
    component.isClearingScheduledTimes.set(true);
    component.clearScheduledTimes();

    expect(familyServiceSpy.clearScheduledTimes).not.toHaveBeenCalled();
  });

  it('shows an error when clearing scheduled times fails', () => {
    component.families.set([scheduledFamily('8:00 AM-8:15 AM')]);
    familyServiceSpy.clearScheduledTimes.and.returnValue(throwError(() => new Error('clear failed')));

    component.clearScheduledTimes();

    expect(component.isClearingScheduledTimes()).toBeFalse();
  });

  it('schedules families and reports success', () => {
    const scheduledFamilies = [scheduledFamily('8:00 AM-8:15 AM')];
    familyServiceSpy.scheduleFamilies.and.returnValue(of(scheduledFamilies));

    component.scheduleFamilies();

    expect(familyServiceSpy.scheduleFamilies).toHaveBeenCalled();
    expect(component.families()).toBe(scheduledFamilies);
  });

  it('does not schedule families without admin schedule permission', () => {
    authServiceSpy.isAdmin.and.returnValue(false);

    expect(component.canScheduleFamilies).toBeFalse();
    component.scheduleFamilies();

    authServiceSpy.isAdmin.and.returnValue(true);
    authServiceSpy.hasPermission.and.returnValue(false);

    expect(component.canScheduleFamilies).toBeFalse();
    component.scheduleFamilies();
    expect(familyServiceSpy.scheduleFamilies).not.toHaveBeenCalled();
  });

  it('shows a capacity message when scheduling cannot place every family', () => {
    const error = {
      status: 404,
      error: { message: 'capacity' }
    };
    familyServiceSpy.scheduleFamilies.and.returnValue(throwError(() => error));

    component.scheduleFamilies();

    expect(familyServiceSpy.scheduleFamilies).toHaveBeenCalled();
    expect(scheduleFailureMessage(error))
      .toBe('Not enough schedule capacity. Add more 15-minute blocks in Settings > Time Availability, then try scheduling again.');
  });

  it('shows an invalid time message when scheduling rejects saved time windows', () => {
    const error = {
      status: 400,
      error: 'Time slot contains an invalid time'
    };
    familyServiceSpy.scheduleFamilies.and.returnValue(throwError(() => error));

    component.scheduleFamilies();

    expect(familyServiceSpy.scheduleFamilies).toHaveBeenCalled();
    expect(scheduleFailureMessage(error))
      .toBe('The saved Time Availability ranges are invalid. Use ranges like 8:00-9:00 AM, save them, then schedule again.');
  });

  it('shows a generic message for unknown scheduling failures', () => {
    const error = {
      status: 500,
      error: { message: 'server failed' },
      message: 'Server failed'
    };
    familyServiceSpy.scheduleFamilies.and.returnValue(throwError(() => error));

    component.scheduleFamilies();

    expect(familyServiceSpy.scheduleFamilies).toHaveBeenCalled();
    expect(scheduleFailureMessage(error))
      .toBe('Unable to schedule families right now. Check the saved Time Availability ranges and try again.');
  });

  it('shows load errors for families and settings', () => {
    familyServiceSpy.getFamilies.and.returnValue(throwError(() => new Error('families failed')));
    settingsServiceSpy.getSettings.and.returnValue(throwError(() => new Error('settings failed')));

    createComponent();

    expect(component.families()).toEqual([]);
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(FamilyScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function scheduleFailureMessage(err: unknown): string {
    return (component as unknown as ScheduleFailureMessageHost).scheduleFailureMessage(err);
  }

  function scheduledFamily(timeSlot: string, overrides: Partial<Family> = {}): Family {
    const family: Family = {
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

    return {
      ...family,
      ...overrides,
      timeSlot: overrides.timeSlot ?? timeSlot,
      scheduleAssignment: overrides.scheduleAssignment ?? family.scheduleAssignment,
      scheduleAssignments: overrides.scheduleAssignments,
      timeAvailability: overrides.timeAvailability ?? family.timeAvailability,
      students: overrides.students ?? family.students
    };
  }
});
