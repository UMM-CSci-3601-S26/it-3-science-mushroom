// Angular Imports
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

// Family Imports
import { FamilyCardComponent } from './family-card.component';
import { Family } from './family';

describe('FamilyCardComponent', () => {
  let component: FamilyCardComponent;
  let fixture: ComponentFixture<FamilyCardComponent>;
  let expectedFamily: Family;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FamilyCardComponent
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
          requestedSupplies: ['backpack', 'markers']
        },
        {
          name: 'Christy',
          grade: '2',
          school: "Morris Elementary",
          teacher: "N/A",
          requestedSupplies: ['backpack', 'pencils']
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
