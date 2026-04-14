// File for testing the TermsService. This is a simple test to check if the service is created successfully.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TermsService } from './terms.service';
import { Terms } from './terms';
import { environment } from 'src/environments/environment';

describe('TermsService', () => {
  let service: TermsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TermsService]
    });
    service = TestBed.inject(TermsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch terms', () => {
    const mockTerms: Terms = {
      item: ['Pencil', 'Notebook'],
      brand: ['BrandA', 'BrandB'],
      color: ['Red', 'Blue'],
      size: ['Small', 'Large'],
      type: ['Type1', 'Type2'],
      material: ['Wood', 'Plastic'],
      style: ['Style1', 'Style2']
    };

    service.getTerms().subscribe(terms => {
      expect(terms).toEqual(mockTerms);
    });

    const req = httpTestingController.expectOne(`${environment.apiUrl}terms`);
    expect(req.request.method).toEqual('GET');
    req.flush(mockTerms);
  });

});
