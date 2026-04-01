import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportGeneratorComponent } from './report-generator.component';

describe('PdfGeneratorComponent', () => {
  let component: ReportGeneratorComponent;
  let fixture: ComponentFixture<ReportGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportGeneratorComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ReportGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
