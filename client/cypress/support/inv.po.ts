export class InventoryPage {
  private readonly baseUrl = '/inventory';
  private readonly titleSelector = '.inventory-title';
  private readonly sideNavButton = '.sidenav-button';
  private readonly sideNav = '.sidenav';
  private readonly sideNavOption = '[routerlink] > .mdc-list-item__content';

  navigateTo() {
    return cy.visit(this.baseUrl);
  }

  getAppTitle() {
    return cy.get(this.titleSelector);
  }

  getSidenavButton() {
    return cy.get(this.sideNavButton);
  }

  getSidenav() {
    return cy.get(this.sideNav);
  }

  getNavLink(navOption: 'Home' | 'Inventory') {
    return cy.contains(this.sideNavOption, `${navOption}`);
  }
  getInventoryItem() {
    return cy.get('[data-cy="inventory-item"]');
  }
  getInventoryBrand() {
    return cy.get('[data-cy="inventory-brand"]');
  }
  getInventoryColor() {
    return cy.get('[data-cy="inventory-color"]');
  }
  getInventorySize() {
    return cy.get('[data-cy="inventory-size"]');
  }
  getInventoryType() {
    return cy.get('[data-cy="inventory-type"]');
  }
  getInventoryMaterial() {
    return cy.get('[data-cy="inventory-material"]');
  }
  getInventoryCount() {
    return cy.get('[data-cy="inventory-count"]');
  }
  getInventoryQuantity() {
    return cy.get('[data-cy="inventory-quantity"]');
  }
  getInventoryNotes() {
    return cy.get('[data-cy="inventory-notes"]');
  }
  getInventoryPaginator() {
    return cy.get('[data-cy="inventory-paginator"]');
  }
  getInventoryRow() {
    return cy.get('[data-cy="inventory-row"]');
  }
  getInventoryFilterClear() {
    return cy.get('[data-cy="inventory-clear"]');
  }

  // filters
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
    cy.get(filterSelector).clear().type(text);
    return cy.get('mat-option').contains(text).click();
  }
}
