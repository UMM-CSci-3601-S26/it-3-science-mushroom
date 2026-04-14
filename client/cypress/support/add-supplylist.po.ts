import { SupplyListPage } from './supplylist.po';

export class AddSupplyListPage extends SupplyListPage {
  private readonly addSupplyUrl = '/supplylist/new';
  private readonly title = '[data-cy="add-supply-title"]';
  private readonly submitButton = '[data-cy="submit-add-supply"]';
  private readonly clearButton = '[data-cy="clear-add-supply"]';
  private readonly cancelButton = '[data-cy="cancel-add-supply"]';
  private readonly snackBar = '.mat-mdc-simple-snack-bar';

  navigateToAddSupply() {
    return cy.visit(this.addSupplyUrl);
  }

  navigateToFormWithParams(school: string, grade: string) {
    return cy.visit(`${this.addSupplyUrl}?school=${encodeURIComponent(school)}&grade=${encodeURIComponent(grade)}`);
  }

  getTitle() {
    return cy.get(this.title);
  }

  getSubmitButton() {
    return cy.get(this.submitButton);
  }

  getClearButton() {
    return cy.get(this.clearButton);
  }

  getCancelButton() {
    return cy.get(this.cancelButton);
  }

  getField(fieldName: string) {
    return cy.get(`[data-cy="${fieldName}"]`);
  }

  getPreviewCard() {
    return cy.get('[data-cy="add-supply-preview"]');
  }

  getSnackBar() {
    return cy.get(this.snackBar, { timeout: 10000 });
  }
}
