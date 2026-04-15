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
      guardianName: 'Chris',
      address: '123 Street',
      email: 'chris@email.com',
      timeSlot: '9:00-10:00',
      students: [
        {
          name: 'Chris Jr.',
          grade: '2',
          school: "Morris Elementary",
          teacher: "N/A",
          headphones: true,
          backpack: false
        },
        {
          name: 'Christy',
          grade: '2',
          school: "Morris Elementary",
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
});
