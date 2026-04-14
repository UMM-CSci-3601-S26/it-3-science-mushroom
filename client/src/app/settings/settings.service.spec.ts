import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { AppSettings, SupplyItemOrder } from './settings';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpTestingController: HttpTestingController;

  const settingsUrl = `${environment.apiUrl}settings`;

  const mockSettings: AppSettings = {
    _id: 'app-settings',
    schools: [{ name: 'Morris Area High School', abbreviation: 'MAHS' }],
    timeAvailability: {
      earlyMorning: '8:00 AM',
      lateMorning: '10:00 AM',
      earlyAfternoon: '12:00 PM',
      lateAfternoon: '2:00 PM',
    },
    supplyOrder: [
      { itemTerm: 'notebook', status: 'staged' },
      { itemTerm: 'folder', status: 'unstaged' },
      { itemTerm: 'pencil', status: 'notGiven' },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SettingsService],
    });
    service = TestBed.inject(SettingsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSettings()', () => {
    it('sends GET to /api/settings', () => {
      service.getSettings().subscribe(settings => {
        expect(settings).toEqual(mockSettings);
      });

      const req = httpTestingController.expectOne(settingsUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockSettings);
    });
  });

  describe('updateSupplyOrder()', () => {
    it('sends PATCH to /api/settings/supplyOrder with the order in the body', () => {
      const order: SupplyItemOrder[] = [
        { itemTerm: 'notebook', status: 'staged' },
        { itemTerm: 'folder', status: 'unstaged' },
      ];

      service.updateSupplyOrder(order).subscribe();

      const req = httpTestingController.expectOne(`${settingsUrl}/supplyOrder`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ supplyOrder: order });
      req.flush(null);
    });

    it('sends PATCH with an empty array when no order is given', () => {
      service.updateSupplyOrder([]).subscribe();

      const req = httpTestingController.expectOne(`${settingsUrl}/supplyOrder`);
      expect(req.request.body).toEqual({ supplyOrder: [] });
      req.flush(null);
    });

    it('sends all three statuses (staged, unstaged, notGiven) in a single request', () => {
      const order: SupplyItemOrder[] = [
        { itemTerm: 'notebook', status: 'staged' },
        { itemTerm: 'folder', status: 'unstaged' },
        { itemTerm: 'pencil', status: 'notGiven' },
      ];

      service.updateSupplyOrder(order).subscribe();

      const req = httpTestingController.expectOne(`${settingsUrl}/supplyOrder`);
      expect(req.request.body.supplyOrder).toEqual(order);
      req.flush(null);
    });
  });

  describe('updateSchools()', () => {
    it('sends PATCH to /api/settings/schools with schools body', () => {
      const schools = [{ name: 'Morris Area High School' }];

      service.updateSchools(schools).subscribe();

      const req = httpTestingController.expectOne(`${settingsUrl}/schools`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ schools });
      req.flush(null);
    });

    it('sends an empty array when clearing all schools', () => {
      service.updateSchools([]).subscribe();

      const req = httpTestingController.expectOne(`${settingsUrl}/schools`);
      expect(req.request.body).toEqual({ schools: [] });
      req.flush(null);
    });
  });

  describe('updateTimeAvailability()', () => {
    it('sends PATCH to /api/settings/timeAvailability with labels body', () => {
      const labels = {
        earlyMorning: '8:00 AM',
        lateMorning: '10:00 AM',
        earlyAfternoon: '12:00 PM',
        lateAfternoon: '2:00 PM',
      };

      service.updateTimeAvailability(labels).subscribe();

      const req = httpTestingController.expectOne(`${settingsUrl}/timeAvailability`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(labels);
      req.flush(null);
    });
  });
});
