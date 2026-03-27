import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationOrderComponent } from './station-order.component';

describe('StationOrderComponent', () => {
  let component: StationOrderComponent;
  let fixture: ComponentFixture<StationOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationOrderComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(StationOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
