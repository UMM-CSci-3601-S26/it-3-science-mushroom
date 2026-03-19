export class SupplyListPage {
  private readonly baseUrl = '/supplylist';
  private readonly titleSelector = '.supplylist-title';
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

  getNavLink(navOption: 'Home' | 'Supply List' ) {
    return cy.contains(this.sideNavOption, `${navOption}`);
  }
  getSupplyListSchool() {
    return cy.get('[data-cy=supplylist-school]')
  }
  getSupplyListGrade() {
    return cy.get('[data-cy=supplylist-grade]')
  }
  getSupplylistItem() {
    return cy.get('[data-cy="supplylist-item"]');
  }
  getSupplylistBrand() {
    return cy.get('[data-cy="supplylist-brand"]');
  }
  getSupplylistColor() {
    return cy.get('[data-cy="supplylist-color"]');
  }
  getSupplylistSize() {
    return cy.get('[data-cy="supplylist-size"]');
  }
  getSupplylistType() {
    return cy.get('[data-cy="supplylist-type"]');
  }
  getSupplylistMaterial() {
    return cy.get('[data-cy="supplylist-material"]');
  }
  getSupplylistCount() {
    return cy.get('[data-cy="supplylist-count"]');
  }
  getSupplylistQuantity() {
    return cy.get('[data-cy="supplylist-quantity"]');
  }
  getSupplylistNotes() {
    return cy.get('[data-cy="supplylist-notes"]');
  }
}
