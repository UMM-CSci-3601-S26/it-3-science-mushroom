import { Family } from 'src/app/family/family';

export class AddFamilyPage {

  private readonly url = '/family/new';
  private readonly title = '.add-family-title';
  private readonly button = '[data-test=confirmAddFamilyButton]';
  private readonly snackBar = '.mat-mdc-simple-snack-bar';
  private readonly guardianNameFieldName = 'guardianName';
  private readonly addressFieldName = 'address';
  private readonly timeSlotFieldName = 'timeSlot';
  private readonly emailFieldName = 'email';
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

  addStudentButton() {
    return cy.contains('button', 'Add Student');
  }

  getFilterFamily() {
    return cy.get(this.familyFilterSelector)
  }

  addFamily(newFamily: Family) {
    this.getFormField(this.guardianNameFieldName).type(newFamily.guardianName);
    this.getFormField(this.addressFieldName).type(newFamily.address.toString());
    this.getFormField(this.timeSlotFieldName).type(newFamily.timeSlot);
    this.getFormField(this.emailFieldName).type(newFamily.email);

    newFamily.students.forEach((student, i) => {
      this.addStudentButton().click();
      cy.get('[formarrayname="students"] [formcontrolname="name"]').should('have.length.at.least', i + 1);

      this.getStudentField(i, 'name').type(student.name);
      this.getStudentField(i, 'grade').type(student.grade);
      this.getStudentField(i, 'school').type(student.school);
    });
    return this.addFamilyButton().click();
  }
}
