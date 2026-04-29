export class SettingsPage {

  private readonly url = '/settings';
  private readonly title = '.settings-title';
  private readonly button = '[data-test=saveButton]';
  private readonly snackBar = ''

  navigateTo() {
    return cy.visit(this.url);
  }

  getTitle() {
    return cy.get(this.title);
  }

  getFormField(fieldName: string) {
    return cy.get(`[formcontrolname="${fieldName}"]`); //removed ${this.formFieldSelector}
  }

  getSaveButton() {
    return cy.get(this.button);
  }

  getTab() {
    return cy.contains('.mat-mdc-tab', 'Available Spots');
  }

  getSnackBar() {
    // Since snackBars are often shown in response to errors,
    // we'll add a timeout of 10 seconds to help increase the likelihood that
    // the snackbar becomes visible before we might fail because it
    // hasn't (yet) appeared.
    return cy.get(this.snackBar, { timeout: 10000 });
  }
}
