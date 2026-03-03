import { InventoryPage } from "../support/inv.po";

const page = new InventoryPage();
const Filters_Test = {
  Item: 'Markers',
  Brand: 'Crayola',
  Type: 'Washable',
  Size: 'Wide'
}

describe('Inventory', () => {
  beforeEach(() => page.navigateTo());

  it('Should have the correct title', () => {
    page.getAppTitle().should('contain', 'Inventory');
  });

  it('The sidenav should open, navigate to "Inventory" and back to "Home"', () => {
    // Before clicking on the button, the sidenav should be hidden
    page.getSidenav()
      .should('be.hidden');
    page.getSidenavButton()
      .should('be.visible');

    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);
    page.getSidenav()
      .should('be.hidden');

    page.getSidenavButton().click();
    page.getNavLink('Home').click();
    cy.url().should('match', /^https?:\/\/[^/]+\/?$/);
    page.getSidenav()
      .should('be.hidden');
  });

  it('Should display inventory items', () => {
    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);
    page.getSidenav()
      .should('be.hidden');
    nextTick(300)
    cy.contains('td', 'Test Item').should('exist'); //First item in the table, once 'test item' gets removed, need to update
  });

  it('should have pagination controls', () => {
    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);
    page.getSidenav()
      .should('be.hidden');
    cy.get('.mat-mdc-paginator').should('exist');
  });

  it('Should display all inventory column headers', () => {
    cy.get('.demo-table thead th').as('headers');

    cy.get('@headers').should('contain', 'Item');
    cy.get('@headers').should('contain', 'Description');
    cy.get('@headers').should('contain', 'Brand');
    cy.get('@headers').should('contain', 'Color');
    cy.get('@headers').should('contain', 'Size');
    cy.get('@headers').should('contain', 'Type');
    cy.get('@headers').should('contain', 'Material');
    cy.get('@headers').should('contain', 'Count');
    cy.get('@headers').should('contain', 'Quantity');
    cy.get('@headers').should('contain', 'Notes');
  });

  // Cypress tests to ensure the filter boxes are there
  // for all specification fields

  it('should have specification filters', () => {
    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);

    const errors: string[] = [];

    const recordError = (message: string) => {
      errors.push(message);
      cy.log(message);
      console.warn(message);
    }
    cy.get('body').then(($body) => {
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
  it("Should be able to take an input and display the correct filtered results", () => {
    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);
    cy.get('[data-cy="filter-item"]').type(Filters_Test.Item);
    cy.get('[data-cy="filter-brand"]').type(Filters_Test.Brand);
    cy.get('[data-cy="filter-type"]').type(Filters_Test.Type);
    cy.get('[data-cy="filter-size"]').type(Filters_Test.Size);
    nextTick(300);
    page.getInventoryRow().first().within(() => {
      cy.get('[data-cy="inventory-item"]').should('contain', Filters_Test.Item);
      cy.get('[data-cy="inventory-brand"]').should('contain', Filters_Test.Brand);
      cy.get('[data-cy="inventory-type"]').should('contain', Filters_Test.Type);
      cy.get('[data-cy="inventory-size"]').should('contain', Filters_Test.Size);
    });
  });
  // it('should report all empty cells across all pages', () => {
  //   page.getSidenavButton().click();
  //   page.getNavLink('Inventory').click();
  //   cy.url().should('match', /\/inventory$/);

  //   const errors: string[] = [];

  //   const assertNoEmptyCellsOnCurrentPage = (pageLabel: string) => {
  //     cy.get('.demo-table tbody tr')
  //       .each(($row, rowIndex) => {
  //         cy.wrap($row)
  //           .find('td')
  //           .each(($cell, colIndex) => {
  //             cy.wrap($cell)
  //               .invoke('text')
  //               .then((text) => {
  //                 const value = text.replace(/\s+/g, ' ').trim();

  //                 if (value === '') {
  //                   const message = `Empty cell at ${pageLabel} | Row ${rowIndex + 1}, Col ${colIndex + 1}`;
  //                   errors.push(message);
  //                   cy.log(message);
  //                   console.warn(message);
  //                 }
  //               });
  //           });
  //       });
  //   };

  //   const getRangeLabel = () =>
  //     cy.get('.mat-mdc-paginator-range-label, .mat-paginator-range-label')
  //       .invoke('text')
  //       .then(t => t.replace(/\s+/g, ' ').trim());

  //   const clickNextIfPossible = () => {
  //     cy.get('button[aria-label="Next page"], button[aria-label="next page"]')
  //       .first()
  //       .then(($btn) => {
  //         const disabled =
  //         $btn.is(':disabled') ||
  //         $btn.attr('disabled') !== undefined ||
  //         $btn.attr('aria-disabled') === 'true';

  //         if (disabled) return;

  //         getRangeLabel().then(() => {
  //           cy.wrap($btn).click();

  //           getRangeLabel().then((after) => {
  //             assertNoEmptyCellsOnCurrentPage(after);
  //             clickNextIfPossible();
  //           });
  //         });
  //       });
  //   };

  //   getRangeLabel().then((label) => {
  //     assertNoEmptyCellsOnCurrentPage(label);
  //     clickNextIfPossible();
  //   });

  //   cy.then(() => {
  //     if (errors.length > 0) {
  //       throw new Error(
  //         `Found ${errors.length} empty cells:\n\n` + errors.join('\n')
  //       );
  //     }
  //   });
  // });
});

function nextTick(ms: number) {
  cy.wait(ms);
}

