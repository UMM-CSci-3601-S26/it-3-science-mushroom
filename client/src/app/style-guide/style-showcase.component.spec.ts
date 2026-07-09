import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { DialogService } from '../shared/dialog/dialog.service';
import { StyleShowcaseComponent } from './style-showcase.component';

describe('StyleShowcaseComponent', () => {
  let fixture: ComponentFixture<StyleShowcaseComponent>;
  let component: StyleShowcaseComponent;
  let dialogService: jasmine.SpyObj<DialogService>;

  beforeEach(async () => {
    dialogService = jasmine.createSpyObj<DialogService>('DialogService', ['openDialog']);
    dialogService.openDialog.and.returnValue({
      afterClosed: () => of(false)
    } as never);

    await TestBed.configureTestingModule({
      imports: [StyleShowcaseComponent, NoopAnimationsModule],
      providers: [{ provide: DialogService, useValue: dialogService }]
    }).compileComponents();

    fixture = TestBed.createComponent(StyleShowcaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the live token and page template sections', () => {
    const text = fixture.nativeElement.textContent;

    expect(component.colorTokens.length).toBeGreaterThan(0);
    expect(text).toContain('Semantic Color Tokens');
    expect(text).toContain('Recommended Page Template');
  });

  it('opens the shared confirmation dialog example', () => {
    component.showConfirmation();

    expect(dialogService.openDialog).toHaveBeenCalledWith({
      title: 'Example Confirmation',
      message: 'Use the shared dialog service for actions that need confirmation.',
      buttonOne: 'Cancel',
      buttonTwo: 'Confirm'
    }, '480px', '220px');
  });
});
