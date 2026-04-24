export class SettingsPage {

  private readonly url = '/settings';
  private readonly title = '.settings-title';
  private readonly button = '[data-test=saveButton]';
  private readonly snackBar = ''
  private readonly tab = '#mat-tab-group-0-label-2';
  //tabs are weird and I actually can't find a place to insert [data-test="availableSpotsTab"]
  //this makes tests pass though

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
    return cy.get(this.tab);
  }

  getSnackBar() {
    // Since snackBars are often shown in response to errors,
    // we'll add a timeout of 10 seconds to help increase the likelihood that
    // the snackbar becomes visible before we might fail because it
    // hasn't (yet) appeared.
    return cy.get(this.snackBar, { timeout: 10000 });
  }
}
