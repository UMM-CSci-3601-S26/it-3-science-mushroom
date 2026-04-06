export class stationOrderPage {
  private readonly baseUrl = '/stationOrder';
  private readonly titleSelector = '.title';
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

  getNavLink(navOption: 'Home' | 'Event Station Order') {
    return cy.contains(this.sideNavOption, `${navOption}`);
  }

  drop(sourceSelector: string, targetSelector: string) {
    const dataTransfer = new DataTransfer();

    cy.contains(sourceSelector)
      .trigger('dragstart', { dataTransfer, force: true });
    cy.get(targetSelector)
      .trigger('dragover', { dataTransfer, force: true })
      .trigger('drop', { dataTransfer, force: true });
    cy.contains(sourceSelector)
      .trigger('dragend', { dataTransfer, force: true });
  }
}
