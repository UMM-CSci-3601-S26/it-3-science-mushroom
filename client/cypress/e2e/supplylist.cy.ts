import { SupplyListPage } from "../support/supplylist.po";

const page = new SupplyListPage();
// const Filters_Test = {
//   Item: 'Markers',
//   Brand: 'Crayola',
//   Type: 'Washable',
//   Size: 'Wide'
// }

describe('Supply List', () => {
  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => page.navigateTo());

  it('Should have the correct title', () => {
    page.getAppTitle().should('contain', 'Supply List');
  });

  it('The sidenav should open, navigate to "Supply List" and back to "Home"', () => {
    // Before clicking on the button, the sidenav should be hidden
    page.getSidenav()
      .should('be.hidden');
    page.getSidenavButton()
      .should('be.visible');

    page.getSidenavButton().click();
    page.getNavLink('Supply List').click();
    cy.url().should('match', /\/supplylist$/);
    page.getSidenav()
      .should('be.hidden');

    page.getSidenavButton().click();
    page.getNavLink('Home').click();
    cy.url().should('match', /^https?:\/\/[^/]+\/?$/);
    page.getSidenav()
      .should('be.hidden');
  });

  it('Should display Supply List items', () => {
    page.getSidenavButton().click();
    page.getNavLink('Supply List').click();
    cy.url().should('match', /\/supplylist$/);
    page.getSidenav()
      .should('be.hidden');
    nextTick(300)
    cy.contains('mat-card', 'Herman').should('exist');
  });

  // Cypress tests to ensure the filter boxes are there
  // for all specification fields

  it('Should have specification filters', () => {
    page.getSidenavButton().click();
    page.getNavLink('Supply List').click();
    cy.url().should('match', /\/supplylist$/);

    const errors: string[] = [];

    const recordError = (message: string) => {
      errors.push(message);
      cy.log(message);
      console.warn(message);
    }
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="filter-school"]').length === 0) {
        recordError(`Empty filter input for School`);
      }
      if ($body.find('[data-cy="filter-item"]').length === 0) {
        recordError(`Empty filter input for Item`);
      }
      if ($body.find('[data-cy="filter-brand"]').length === 0) {
        recordError(`Empty filter input for Brand`);
      }
      if ($body.find('[data-cy="filter-color"]').length === 0) {
        recordError(`Empty filter input for Color`);
      }
      if ($body.find('[data-cy="filter-size"]').length === 0) {
        recordError(`Empty filter input for Size`);
      }
      if ($body.find('[data-cy="filter-type"]').length === 0) {
        recordError(`Empty filter input for Type`);
      }
      if ($body.find('[data-cy="filter-material"]').length === 0) {
        recordError(`Empty filter input for Material`);
      }
    });

    cy.then(() => {
      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }
    });
  });

  it('Should have grade filter', () => {
    page.getSidenavButton().click();
    page.getNavLink('Supply List').click();
    cy.url().should('match', /\/supplylist$/);

    const errors: string[] = [];

    const recordError = (message: string) => {
      errors.push(message);
      cy.log(message);
      console.warn(message);
    }
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="filter-grade"]').length === 0) {
        recordError(`Empty filter input for Grade`);
      }
    });
  });
});

function nextTick(ms: number) {
  cy.wait(ms);
}
