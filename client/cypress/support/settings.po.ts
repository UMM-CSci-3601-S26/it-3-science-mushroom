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

  // Inventory tab
  getInventoryTab() {
    return cy.contains('Inventory Management');
  }
  // filters
  getInventoryFilterClear() {
    return cy.get('[data-cy="filter-clear"]');
  }

  getFilterItem() {
    return cy.get('[data-cy="filter-item"]');
  }
  getFilterBrand() {
    return cy.get('[data-cy="filter-brand"]');
  }
  getFilterColor() {
    return cy.get('[data-cy="filter-color"]');
  }
  getFilterSize() {
    return cy.get('[data-cy="filter-size"]');
  }
  getFilterType() {
    return cy.get('[data-cy="filter-type"]');
  }
  getFilterMaterial() {
    return cy.get('[data-cy="filter-material"]');
  }

  selectAutoCompleteOption(filterSelector: string, text: string) {
    cy.get(filterSelector)
      .should('be.enabled')
      .clear()
      .type(text);

    cy.wait(300);

    cy.get('body').then(($body) => {
      const overlay = $body.find('.cdk-overlay-pane');

      if (overlay.length === 0) {
        throw new Error('No autocomplete options found');
      }

      const options = overlay.find('span.mdc-list-item__primary-text');

      if (options.length === 0) {
        throw new Error('No autocomplete options found');
      }

      const normalize = (str: string) =>
        str.replace(/\s+/g, ' ').trim();

      const match = [...options].find(
        (el) => normalize(el.textContent || '') === normalize(text)
      );
      if (!match) {
        throw new Error(`Exact match for "${text}" not found`);
      }

      cy.wrap(match).click();
    });
  }

  // buttons
  getClearInventoryButton() {
    return cy.get('[data-cy="clear-inventory-button"]');
  }

  getDeleteMatchingInventoryButton() {
    return cy.get('[data-cy="delete-matching-inventory-button"]');
  }

  getResetAllQuantityButton() {
    return cy.get('[data-cy="reset-all-quantities-button"]');
  }

  getResetMatchingQuantityButton() {
    return cy.get('[data-cy="reset-matching-quantities-button"]');
  }
}
