import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { Family } from '../../family';
import { FamilyService } from '../../family.service';
import { User, UserService } from 'src/app/users/user.service';
import { GuardianLinkDialogComponent } from './guardian-link-dialog.component';

describe('GuardianLinkDialogComponent', () => {
  let component: GuardianLinkDialogComponent;
  let fixture: ComponentFixture<GuardianLinkDialogComponent>;
  let familyService: jasmine.SpyObj<Pick<FamilyService, 'getFamilies' | 'linkGuardianAccount' | 'unlinkGuardianAccount'>>;
  let userService: jasmine.SpyObj<Pick<UserService, 'getGuardianUsers'>>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<GuardianLinkDialogComponent>>;

  const unlinkedFamily: Family = {
    _id: 'family-1',
    guardianName: 'Taylor Family',
    email: 'taylor@example.com',
    address: '123 Main St',
    accommodations: '',
    needSpanishHelp: false,
    timeSlot: '',
    students: []
  };

  const linkedFamily: Family = {
    ...unlinkedFamily,
    _id: 'family-2',
    ownerUserId: 'guardian-2',
    guardianName: 'Morgan Family'
  };

  const guardianUser: User = {
    _id: 'guardian-1',
    username: 'taylor.guardian',
    fullName: 'Taylor Guardian',
    email: 'guardian@example.com',
    systemRole: 'GUARDIAN'
  };

  const guardianWithoutEmail: User = {
    _id: 'guardian-2',
    username: 'morgan.guardian',
    fullName: 'Morgan Guardian',
    systemRole: 'GUARDIAN'
  };

  beforeEach(waitForAsync(() => {
    familyService = jasmine.createSpyObj('FamilyService', [
      'getFamilies',
      'linkGuardianAccount',
      'unlinkGuardianAccount'
    ]);
    userService = jasmine.createSpyObj('UserService', ['getGuardianUsers']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    familyService.getFamilies.and.returnValue(of([unlinkedFamily, linkedFamily]));
    familyService.linkGuardianAccount.and.returnValue(of(linkedFamily));
    familyService.unlinkGuardianAccount.and.returnValue(of(unlinkedFamily));
    userService.getGuardianUsers.and.returnValue(of([guardianUser, guardianWithoutEmail]));

    TestBed.configureTestingModule({
      imports: [GuardianLinkDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: FamilyService, useValue: familyService },
        { provide: UserService, useValue: userService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: null }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GuardianLinkDialogComponent);
    component = fixture.componentInstance;
    Object.defineProperty(component, 'snackBar', { value: snackBar });
    Object.defineProperty(component, 'dialogRef', { value: dialogRef });
    fixture.detectChanges();
  });

  it('loads families and guardian users when opened', () => {
    expect(component.families).toEqual([unlinkedFamily, linkedFamily]);
    expect(component.guardianUsers).toEqual([guardianUser, guardianWithoutEmail]);
  });

  it('prefills the family account when opened with family dialog data', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [GuardianLinkDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: FamilyService, useValue: familyService },
        { provide: UserService, useValue: userService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { family: linkedFamily } }
      ]
    });

    const dataFixture = TestBed.createComponent(GuardianLinkDialogComponent);
    const dataComponent = dataFixture.componentInstance;
    dataFixture.detectChanges();

    expect(dataComponent.familySearch).toBe(linkedFamily.guardianName);
    expect(dataComponent.selectedFamilyValue).toEqual(linkedFamily);
  });

  it('finds selected family and guardian from typed exact matches', () => {
    component.familySearch = 'taylor family';
    component.guardianSearch = 'taylor.guardian';

    expect(component.selectedFamily()).toEqual(unlinkedFamily);
    expect(component.selectedGuardian()).toEqual(guardianUser);
  });

  it('prefers explicitly selected family and guardian values', () => {
    component.familySearch = 'does not match';
    component.guardianSearch = 'does not match';
    component.selectedFamilyValue = linkedFamily;
    component.selectedGuardianValue = guardianWithoutEmail;

    expect(component.selectedFamily()).toEqual(linkedFamily);
    expect(component.selectedGuardian()).toEqual(guardianWithoutEmail);
  });

  it('clears selected values when the search text no longer matches them', () => {
    component.selectedFamilyValue = unlinkedFamily;
    component.selectedGuardianValue = guardianUser;

    component.onFamilySearchChange('New text');
    component.onGuardianSearchChange('new.username');

    expect(component.selectedFamilyValue).toBeUndefined();
    expect(component.selectedGuardianValue).toBeUndefined();
  });

  it('keeps selected values when the search text still matches them', () => {
    component.selectedFamilyValue = unlinkedFamily;
    component.selectedGuardianValue = guardianUser;

    component.onFamilySearchChange(unlinkedFamily.guardianName);
    component.onGuardianSearchChange(guardianUser.username);

    expect(component.selectedFamilyValue).toEqual(unlinkedFamily);
    expect(component.selectedGuardianValue).toEqual(guardianUser);
  });

  it('selects family and guardian from autocomplete option values', () => {
    component.selectFamily(linkedFamily.guardianName);
    component.selectGuardian(guardianWithoutEmail.username);

    expect(component.familySearch).toBe(linkedFamily.guardianName);
    expect(component.selectedFamilyValue).toEqual(linkedFamily);
    expect(component.guardianSearch).toBe(guardianWithoutEmail.username);
    expect(component.selectedGuardianValue).toEqual(guardianWithoutEmail);
  });

  it('enables link only when a family and guardian are selected and saving is false', () => {
    expect(component.canLinkGuardianAccount()).toBeFalse();

    component.selectedFamilyValue = unlinkedFamily;
    component.selectedGuardianValue = guardianUser;
    expect(component.canLinkGuardianAccount()).toBeTrue();

    component.selectedFamilyValue = linkedFamily;
    expect(component.canLinkGuardianAccount()).toBeFalse();

    component.isSaving = true;
    expect(component.canLinkGuardianAccount()).toBeFalse();
  });

  it('enables unlink only when a linked family is selected and saving is false', () => {
    component.selectedFamilyValue = unlinkedFamily;
    expect(component.canUnlinkGuardianAccount()).toBeFalse();

    component.selectedFamilyValue = linkedFamily;
    expect(component.canUnlinkGuardianAccount()).toBeTrue();

    component.isSaving = true;
    expect(component.canUnlinkGuardianAccount()).toBeFalse();
  });

  it('asks for both selections before linking', () => {
    component.linkGuardianAccount();

    expect(familyService.linkGuardianAccount).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Choose a family and guardian account first.',
      'Close',
      { duration: 3000 }
    );
  });

  it('links the selected guardian account and closes the dialog', () => {
    component.selectedFamilyValue = unlinkedFamily;
    component.selectedGuardianValue = guardianUser;

    component.linkGuardianAccount();

    expect(familyService.linkGuardianAccount).toHaveBeenCalledWith('family-1', 'guardian-1');
    expect(snackBar.open).toHaveBeenCalledWith('Guardian account linked.', 'Close', { duration: 2500 });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('explains when the selected family is already linked before linking', () => {
    component.selectedFamilyValue = linkedFamily;
    component.selectedGuardianValue = guardianUser;

    component.linkGuardianAccount();

    expect(familyService.linkGuardianAccount).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      "Can't link Taylor Guardian: family already has a linked guardian.",
      'Close',
      { duration: 4500 }
    );
  });

  it('resets saving state when linking fails', () => {
    familyService.linkGuardianAccount.and.returnValue(throwError(() => ({
      error: { error: 'Guardian account is already linked to a family' }
    })));
    component.selectedFamilyValue = unlinkedFamily;
    component.selectedGuardianValue = guardianUser;

    component.linkGuardianAccount();

    expect(component.isSaving).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith(
      "Can't link Taylor Guardian: already linked to a family",
      'Close',
      { duration: 5000 }
    );
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('shows server link failure reasons from HTTP error strings', () => {
    familyService.linkGuardianAccount.and.returnValue(throwError(() => new HttpErrorResponse({
      error: '{"error":"Guardian account is already linked to a family"}',
      status: 400
    })));
    component.selectedFamilyValue = unlinkedFamily;
    component.selectedGuardianValue = guardianUser;

    component.linkGuardianAccount();

    expect(snackBar.open).toHaveBeenCalledWith(
      "Can't link Taylor Guardian: already linked to a family",
      'Close',
      { duration: 5000 }
    );
  });

  it('asks for a family before unlinking', () => {
    component.unlinkGuardianAccount();

    expect(familyService.unlinkGuardianAccount).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Choose a family first.', 'Close', { duration: 3000 });
  });

  it('unlinks the selected family account and closes the dialog', () => {
    component.selectedFamilyValue = linkedFamily;

    component.unlinkGuardianAccount();

    expect(familyService.unlinkGuardianAccount).toHaveBeenCalledWith('family-2');
    expect(snackBar.open).toHaveBeenCalledWith('Guardian account unlinked.', 'Close', { duration: 2500 });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('explains when the selected family is not linked before unlinking', () => {
    component.selectedFamilyValue = unlinkedFamily;
    component.selectedGuardianValue = guardianUser;

    component.unlinkGuardianAccount();

    expect(familyService.unlinkGuardianAccount).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      "Can't unlink Taylor Guardian: family is not linked.",
      'Close',
      { duration: 4500 }
    );
  });

  it('resets saving state when unlinking fails', () => {
    familyService.unlinkGuardianAccount.and.returnValue(throwError(() => ({
      error: { error: 'The requested family was not found' }
    })));
    component.selectedFamilyValue = linkedFamily;

    component.unlinkGuardianAccount();

    expect(component.isSaving).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith(
      "Can't unlink Morgan Guardian: family was not found",
      'Close',
      { duration: 5000 }
    );
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('filters family and guardian autocomplete options by typed search text', () => {
    component.familySearch = 'morgan';
    component.guardianSearch = 'example.com';

    expect(component.filteredFamilies()).toEqual([linkedFamily]);
    expect(component.filteredGuardian()).toEqual([guardianUser]);

    component.guardianSearch = 'morgan';
    expect(component.filteredGuardian()).toEqual([guardianWithoutEmail]);
  });
});
