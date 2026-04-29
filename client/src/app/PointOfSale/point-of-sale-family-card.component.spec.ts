import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Family } from '../family/family';
import { PointOfSaleFamilyCardComponent } from './point-of-sale-family-card.component';

describe('PointOfSaleFamilyCardComponent', () => {
  let fixture: ComponentFixture<PointOfSaleFamilyCardComponent>;
  let component: PointOfSaleFamilyCardComponent;

  const family: Family = {
    _id: 'family-1',
    guardianName: 'Jane Doe',
    email: 'jane@example.com',
    address: '123 Main St',
    accommodations: 'None',
    timeSlot: '9:00-10:00',
    students: [
      {
        name: 'Sam',
        grade: '3',
        school: 'Morris Area Elementary School',
        schoolAbbreviation: 'MAES',
        teacher: 'Ms. Test',
        headphones: false,
        backpack: true
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointOfSaleFamilyCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PointOfSaleFamilyCardComponent);
    component = fixture.componentInstance;
  });

  function setFamily(updatedFamily: Family): void {
    fixture.componentRef.setInput('family', updatedFamily);
    fixture.detectChanges();
  }

  it('describes a not helped family', () => {
    setFamily(family);

    expect(component.isCompleted()).toBeFalse();
    expect(component.statusLabel()).toBe('Not helped');
    expect(component.statusClass()).toBe('status-not-helped');
  });

  it('describes an in-progress family', () => {
    setFamily({ ...family, status: 'being_helped' });

    expect(component.isCompleted()).toBeFalse();
    expect(component.statusLabel()).toBe('In progress');
    expect(component.statusClass()).toBe('status-in-progress');
  });

  it('describes completed families from status or legacy helped flag', () => {
    setFamily({ ...family, status: 'helped' });

    expect(component.isCompleted()).toBeTrue();
    expect(component.statusLabel()).toBe('Helped');
    expect(component.statusClass()).toBe('status-helped');

    setFamily({ ...family, helped: true });
    expect(component.isCompleted()).toBeTrue();
  });

  it('emits the family for help and revert actions', () => {
    const helpSpy = jasmine.createSpy('helpFamily');
    const revertSpy = jasmine.createSpy('revertFamily');
    component.helpFamily.subscribe(helpSpy);
    component.revertFamily.subscribe(revertSpy);
    setFamily({ ...family, status: 'helped' });

    component.helpFamily.emit(component.family());
    component.revertFamily.emit(component.family());

    expect(helpSpy).toHaveBeenCalledOnceWith(component.family());
    expect(revertSpy).toHaveBeenCalledOnceWith(component.family());
  });
});
