import { SupplyListPage } from "../support/supplylist.po";

const page = new SupplyListPage();
const Filters_Test = {
  School: 'Hancock',
  //Teacher: 'All Teachers',
  Grade: 'Kindergarten',
}

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
    cy.contains('mat-card', 'St. Mary\'s').should('exist');
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

  it("Should be able to take an input and display the correct filtered results", () => {
    // Intercept the filtered API calls
    cy.intercept('GET', '/api/supplylist*').as('filterSupplyList');

    cy.get('[data-cy="filter-school"]').type(Filters_Test.School);
    cy.get('[data-cy="filter-grade"]').type(Filters_Test.Grade);

    // Wait for the filtered results to load
    nextTick(1000);

    // Check results match
    cy.contains('Chokio').should('not.exist');
    cy.contains('Hancock').should('be.visible');
    page.expandTreeNode('Hancock');
    cy.contains('Kindergarten').should('be.visible');
    cy.contains('1st Grade').should('not.exist');
  });

  it('Should have the tree view', () => {
    cy.get('[data-cy="supplylist-card"]', { timeout: 10000 }).should('exist');
  });

  it('Should display nested items when tree is expanded', () => {
    page.expandTreeNode('Hancock');
    cy.contains('Kindergarten').should('be.visible');
    page.expandTreeNode('Kindergarten');
    cy.contains('All Teachers').should('be.visible');
    page.expandTreeNode('All Teachers');
    cy.contains('Backpack').should('be.visible');
  });

  it('Should open dialog with item details when item is clicked', () => {
    page.expandTreeNode('Hancock');
    page.expandTreeNode('Kindergarten');
    page.expandTreeNode('All Teachers');
    cy.get('[data-cy="supplylist-info-button"]').first().click();
    cy.contains('Item View - Binder').should('be.visible');
    cy.contains('- Description: 1" 3 Ring Binder').should('be.visible');
    cy.contains('- Brand: N/A').should('be.visible');
    cy.contains('- Color: N/A').should('be.visible');
    cy.contains('- Size: 1"').should('be.visible');
    cy.contains('- Type: 3 Ring').should('be.visible');
    cy.contains('- Material: N/A').should('be.visible');
    cy.contains('- Quantity: 1').should('be.visible');
    cy.contains('- Notes: 1, 3 ring binder of choice size (?)').should('be.visible');
  });

  it('Should close dialog when Exit button is clicked', () => {
    page.expandTreeNode('Hancock');
    page.expandTreeNode('Kindergarten');
    page.expandTreeNode('All Teachers');
    cy.get('[data-cy="supplylist-info-button"]').first().click();
    cy.contains('Item View - Binder').should('be.visible');
    cy.contains('- Description: 1" 3 Ring Binder').should('be.visible');
    cy.contains('- Brand: N/A').should('be.visible');
    cy.contains('- Color: N/A').should('be.visible');
    cy.contains('- Size: 1"').should('be.visible');
    cy.contains('- Type: 3 Ring').should('be.visible');
    cy.contains('- Material: N/A').should('be.visible');
    cy.contains('- Quantity: 1').should('be.visible');
    cy.contains('- Notes: 1, 3 ring binder of choice size (?)').should('be.visible');
    cy.contains('button', 'Exit').click();
    cy.contains('Item View - Binder').should('not.exist');
  });
});

function nextTick(ms: number) {
  cy.wait(ms);
}
