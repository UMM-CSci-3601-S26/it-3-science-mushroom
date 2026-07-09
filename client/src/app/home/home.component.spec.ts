import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

describe('Home', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let de: DebugElement;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])]
    });

    fixture = TestBed.createComponent(HomeComponent);

    component = fixture.componentInstance; // BannerComponent test instance

    fixture.detectChanges();

    // query for the main hero section by CSS element selector
    de = fixture.debugElement.query(By.css('.home-hero'));
    el = de.nativeElement;
  });

  it('It renders mission-focused mock content', () => {
    expect(el.textContent).toContain('Ready 4 Learning');
    expect(fixture.nativeElement.textContent).toContain('Mock Supply Donation');
    expect(fixture.nativeElement.textContent).toContain('Impact at a Glance');
    expect(component).toBeTruthy();
  });

});
