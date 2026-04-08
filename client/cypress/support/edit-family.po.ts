import { Family } from 'src/app/family/family';

export class EditFamilyPage {

  private readonly url = '/family';
  private readonly title = '.edit-family-title';
  private readonly editButton = '[data-test=editFamilyButton]';
  private readonly button = '[data-test=confirmEditFamilyButton]';
  private readonly snackBar = '.mat-mdc-simple-snack-bar';
  private readonly guardianNameFieldName = 'guardianName';
  private readonly addressFieldName = 'address';
  private readonly timeSlotFieldName = 'timeSlot';
  private readonly emailFieldName = 'email';
  private readonly dropDownSelector = 'mat-option';

  navigateTo() {
    cy.visit(this.url);
    cy.get('.family-card').first().find(this.editButton).click();
  }

  getTitle() {
    return cy.get(this.title);
  }

  editFamilyButton() {
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


  updateFamily(updatedFamily: Family) {
    this.getFormField(this.addressFieldName).clear().type(updatedFamily.address.toString());

    updatedFamily.students.forEach((student, i) => {
      cy.get('[formarrayname="students"] [formcontrolname="name"]').should('have.length.at.least', i + 1);
      if (student.teacher) {
        this.getStudentField(i, 'teacher').clear().type(student.teacher);
      }
    });
    return this.editFamilyButton().click();
  }
}
