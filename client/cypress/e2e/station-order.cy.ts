import { stationOrderPage } from "cypress/support/station-order.po";

const page = new stationOrderPage();

describe('Station Order', () => {
  before(() => {
    cy.task('seed:database');
  })
  beforeEach(() => {
    cy.intercept('GET', '/api/stationOrder*').as('drop')
    page.navigateTo();
    page.getSidenavButton().click();
    page.getNavLink('Event Station Order').click();
    cy.url().should('match', /\/stationOrder$/);
    page.getSidenav().should('be.hidden');
  });

  // correct title
  it('Should have the correct title', () => {
    page.getAppTitle().should('contain', 'Event Station Order');
  });

  // each list exists
  it('Should have Requested Items and Station Order Lists', () => {
    cy.get('.item-list-bank').should('exist');
    cy.get('.item-list-station-order').should('exist');
  });
});
