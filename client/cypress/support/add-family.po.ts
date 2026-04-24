import { Family } from 'src/app/family/family';

export class AddFamilyPage {

  private readonly url = '/family/new';
  private readonly title = '.add-family-title';
  private readonly button = '[data-test=confirmAddFamilyButton]';
  private readonly snackBar = '.mat-mdc-simple-snack-bar';
  private readonly guardianFirstNameFieldName = 'guardianFirstName';
  private readonly guardianLastNameFieldName = 'guardianLastName';
  private readonly addressFieldName = 'address';
  private readonly timeSlotFieldName = 'timeSlot';
  private readonly emailFieldName = 'email';
  private readonly accommodationsFieldName = 'accommodations';
  private readonly formFieldSelector = 'mat-form-field';
  private readonly dropDownSelector = 'mat-option';
  private readonly familyFilterSelector = '[data-cy="filter-family"]'

  navigateTo() {
    return cy.visit(this.url);
  }

  getTitle() {
    return cy.get(this.title);
  }

  addFamilyButton() {
    return cy.get(this.button);
  }

  selectMatSelectValue(select: Cypress.Chainable, value: string) {
    // Find and click the drop down
    return select.click()
      // Select and click the desired value from the resulting menu
      .get(`${this.dropDownSelector}[value="${value}"]`).click();
  }

  getFormField(fieldName: string) {
    return cy.get(`[formcontrolname="${fieldName}"]`); //removed ${this.formFieldSelector}
  }

  getSnackBar() {
    // Since snackBars are often shown in response to errors,
    // we'll add a timeout of 10 seconds to help increase the likelihood that
    // the snackbar becomes visible before we might fail because it
    // hasn't (yet) appeared.
    return cy.get(this.snackBar, { timeout: 10000 });
  }

  getStudentField(index: number, field: string) {
    return cy.get(`[formarrayname="students"]`).find(`[formcontrolname="${field}"]`).eq(index);
  }

  getStudentGradeField(index: number) {
    cy.get('[formcontrolname="grade"]').eq(index).click();
  }

  getStudentSchoolField(index: number) {
    cy.get('[formcontrolname="school"]').eq(index).click();
  }

  addStudentButton() {
    return cy.contains('button', 'Add Student');
  }

  getFilterFamily() {
    return cy.get(this.familyFilterSelector)
  }

  addFamily(newFamily: Family) {
    const firstAndLastName = newFamily.guardianName.trim().split(/\s+/);
    const firstName = firstAndLastName[0];
    const lastName = firstAndLastName.slice(1).join(' ');
    const availability = newFamily.timeAvailability;


    this.getFormField(this.guardianFirstNameFieldName).type(firstName);
    this.getFormField(this.guardianLastNameFieldName).type(lastName);
    this.getFormField(this.addressFieldName).type(newFamily.address.toString());
    this.getFormField(this.emailFieldName).type(newFamily.email);
    this.getFormField(this.accommodationsFieldName).type(newFamily.accommodations);

    if (availability.earlyMorning) {
      cy.get('[formcontrolname="earlyMorning"]').click();
    }
    if (availability.lateMorning) {
      cy.get('[formcontrolname="lateMorning"]').click();
    }
    if (availability.earlyAfternoon) {
      cy.get('[formcontrolname="earlyAfternoon"]').click();
    }
    if (availability.lateAfternoon) {
      cy.get('[formcontrolname="lateAfternoon"]').click();
    }

    newFamily.students.forEach((student, i) => {
      this.addStudentButton().click();
      cy.get('[formarrayname="students"] [formcontrolname="name"]').should('have.length.at.least', i + 1);

      this.getStudentField(i, 'name').type(student.name);

      this.getStudentGradeField(i);
      cy.get('mat-option').contains(student.grade).click();

      this.getStudentSchoolField(i);
      const schoolAndAbbrevation = `${student.school} (${student.schoolAbbreviation})`;
      cy.get('mat-option').contains(schoolAndAbbrevation).click();

      this.getStudentField(i, 'teacher').type(student.teacher, {force:true});

      if (student.backpack) {
        this.getStudentField(i, 'backpack').contains('Yes').click();
      } else {
        this.getStudentField(i, 'backpack').contains('No').click();
      }

      if (student.headphones) {
        this.getStudentField(i, 'headphones').contains('Yes').click();
      } else {
        this.getStudentField(i, 'headphones').contains('No').click();
      }
    });
    return this.addFamilyButton().click();
  }
}
