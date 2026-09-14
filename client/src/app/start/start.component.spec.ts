import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartComponent } from './start.component';

describe('StartComponent', () => {
  let fixture: ComponentFixture<StartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StartComponent);
    fixture.detectChanges();
  });

  it('renders the start page scaffold', () => {
    expect(fixture.nativeElement.textContent).toContain('Start');
  });
});
