// Angular Imports
import { TestBed } from '@angular/core/testing';

// Service Import
import { FormatDateTimeService } from './format-date-time.service';

describe('FormatDateTimeService', () => {
  let service: FormatDateTimeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormatDateTimeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Date and Time Formatting', () => {
    describe(`File Name Formatting`, () => {
      it('should format AM times correctly', () => {
        const testDate = new Date(2026, 3, 5, 9, 30); // April 5, 2026 at 9:30 AM
        const result = service.formatDateTime(testDate)[1];
        expect(result).toBe('4-5-2026_9-30_AM');
      });

      it('should format PM times correctly (not noon or midnight)', () => {
        const testDate = new Date(2026, 3, 5, 14, 45); // April 5, 2026 at 2:45 PM
        const result = service.formatDateTime(testDate)[1];
        expect(result).toBe('4-5-2026_2-45_PM');
      });

      it('should format noon correctly', () => {
        const testDate = new Date(2026, 3, 5, 12, 0); // April 5, 2026 at 12:00 PM (noon)
        const result = service.formatDateTime(testDate)[1];
        expect(result).toBe('4-5-2026_12-00_PM');
      });

      it('should format midnight correctly', () => {
        const testDate = new Date(2026, 3, 5, 0, 15); // April 5, 2026 at 12:15 AM (midnight)
        const result = service.formatDateTime(testDate)[1];
        expect(result).toBe('4-5-2026_12-15_AM');
      });

      it('should add leading zero to minutes less than 10', () => {
        const testDate = new Date(2026, 3, 5, 3, 5); // April 5, 2026 at 3:05 AM
        const result = service.formatDateTime(testDate)[1];
        expect(result).toBe('4-5-2026_3-05_AM');
      });

      it('should handle month correctly (accounting for zero-indexing)', () => {
        const testDate = new Date(2026, 0, 15, 10, 30); // January 15, 2026
        const result = service.formatDateTime(testDate)[1];
        expect(result).toBe('1-15-2026_10-30_AM');
      });
    });

    describe(`File Description Formatting`, () => {
      it('should format AM times correctly', () => {
        const testDate = new Date(2026, 3, 5, 9, 30); // April 5, 2026 at 9:30 AM
        const result = service.formatDateTime(testDate)[0];
        expect(result).toBe('4-5-2026 9:30 AM');
      });

      it('should format PM times correctly (not noon or midnight)', () => {
        const testDate = new Date(2026, 3, 5, 14, 45); // April 5, 2026 at 2:45 PM
        const result = service.formatDateTime(testDate)[0];
        expect(result).toBe('4-5-2026 2:45 PM');
      });

      it('should format noon correctly', () => {
        const testDate = new Date(2026, 3, 5, 12, 0); // April 5, 2026 at 12:00 PM (noon)
        const result = service.formatDateTime(testDate)[0];
        expect(result).toBe('4-5-2026 12:00 PM');
      });

      it('should format midnight correctly', () => {
        const testDate = new Date(2026, 3, 5, 0, 15); // April 5, 2026 at 12:15 AM (midnight)
        const result = service.formatDateTime(testDate)[0];
        expect(result).toBe('4-5-2026 12:15 AM');
      });

      it('should add leading zero to minutes less than 10', () => {
        const testDate = new Date(2026, 3, 5, 3, 5); // April 5, 2026 at 3:05 AM
        const result = service.formatDateTime(testDate)[0];
        expect(result).toBe('4-5-2026 3:05 AM');
      });

      it('should handle month correctly (accounting for zero-indexing)', () => {
        const testDate = new Date(2026, 0, 15, 10, 30); // January 15, 2026
        const result = service.formatDateTime(testDate)[0];
        expect(result).toBe('1-15-2026 10:30 AM');
      });
    });
  });
});
