// Angular Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';

// Family Imports
import { FamilyDashComponent } from './family-dash.component';
import { FamilyService } from '../family/family.service';
import { MockFamilyService } from 'src/testing/family.service.mock';

describe('FamilyDashComponent', () => {
  let component: FamilyDashComponent;
  let fixture: ComponentFixture<FamilyDashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FamilyDashComponent],
      providers: [
        { provide: FamilyService, useClass: MockFamilyService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyDashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set dashboardStats to undefined when getDashboardStats fails', () => {
    spyOn(MockFamilyService.prototype, 'getDashboardStats')
      .and.returnValue(throwError(() => new Error('Dashboard request failed')));

    const errorFixture = TestBed.createComponent(FamilyDashComponent);
    const errorComponent = errorFixture.componentInstance;
    errorFixture.detectChanges();

    expect(errorComponent.dashboardStats()).toBeUndefined();
  });

});
