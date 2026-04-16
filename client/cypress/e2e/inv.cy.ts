import { InventoryPage } from "../support/inv.po";
const page = new InventoryPage();
const Filters_Test = {
  Item: 'Markers',
  Brand: 'Crayola',
  Color: 'Red',
  Type: 'Washable',
  Size: 'Wide',
  Material: 'N/A',
}

describe('Inventory', () => {
  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    // Intercept the API call before navigating
    cy.intercept('GET', '/api/inventory*').as('getInventory');
    page.navigateTo();
    // Wait for the inventory data to load
    cy.wait('@getInventory');
    //nextTick(1000); // Alternate wait method, preferably wait on the API call instead
  });

  it('Should have the correct title', () => {
    page.getAppTitle().should('contain', 'Inventory');
  });

  it('Should display inventory items', () => {
    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);
    page.getSidenav()
      .should('be.hidden');
    nextTick(1000)
    cy.contains('td', 'Test Item').should('exist'); // First item in the table
    // Note: Once 'test item' gets removed, this needs to be updated (possibly update to not check the first?)
  });

  it('Should have pagination controls in detailed view', () => {
    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);
    page.getSidenav()
      .should('be.hidden');
    cy.get('.mat-mdc-paginator').should('exist');
  });

  it('Should have pagination controls in simple view', () => {
    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);
    page.getSidenav()
      .should('be.hidden');
    cy.get('[data-test="simple-view"]').click();
    cy.get('.mat-mdc-paginator').should('exist');
  });

  it('Should display all inventory column headers in detailed view default', () => {
    cy.get('.demo-table thead th').then(($headers) => {
      const headerTexts = [...$headers].map((header) => (header.textContent || '').replace(/\s+/g, ' ').trim());
      expect(headerTexts).to.deep.equal([
        'Item',
        'Description',
        'Brand',
        'Color',
        'Size',
        'Type',
        'Material',
        'Package Size',
        'Quantity',
        'Notes'
      ])
    })
  });

  it('Should display all inventory column headers in simple view', () => {
    cy.get('[data-test="simple-view"]').click();
    cy.get('.demo-table thead th').then(($headers) => {
      const headerTexts = [...$headers].map((header) => (header.textContent || '').replace(/\s+/g, ' ').trim());
      expect(headerTexts).to.deep.equal([
        'Description',
        'Quantity',
        'Notes'
      ])
    })
  });

  it('Should display all inventory column headers in detailed view when switched to', () => {
    cy.get('[data-test="simple-view"]').click();
    cy.get('[data-test="detailed-view"]').click();
    cy.get('.demo-table thead th').then(($headers) => {
      const headerTexts = [...$headers].map((header) => (header.textContent || '').replace(/\s+/g, ' ').trim());
      expect(headerTexts).to.deep.equal([
        'Item',
        'Description',
        'Brand',
        'Color',
        'Size',
        'Type',
        'Material',
        'Package Size',
        'Quantity',
        'Notes'
      ])
    })
  });

  it('Should show the current inventory item count summary', () => {
    cy.get('button.count-display').should('be.visible').invoke('text').then((text) => {
      const normalized = text.replace(/\s+/g, ' ').trim();
      expect(normalized).to.match(/^Items:\s*\d+$/);
    });
  });

  // Cypress tests to ensure the filter boxes (including clear button) are there
  // for all specification fields

  it('Should have specification filters', () => {
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
      if ($body.find('[data-cy="filter-clear"]').length === 0) {
        recordError(`Missing clear filters button`);
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

    // Intercept the filtered API calls
    cy.intercept('GET', '/api/inventory*').as('filterInventory');

    cy.get('[data-cy="filter-item"]').type(Filters_Test.Item);
    cy.get('[data-cy="filter-brand"]').type(Filters_Test.Brand);
    cy.get('[data-cy="filter-type"]').type(Filters_Test.Type);
    cy.get('[data-cy="filter-size"]').type(Filters_Test.Size);

    // Wait for the filtered results to load
    //cy.wait('@filterInventory');
    nextTick(1000);

    page.getInventoryRow().first().within(() => {
      cy.get('[data-cy="inventory-item"]').should('contain', Filters_Test.Item);
      cy.get('[data-cy="inventory-brand"]').should('contain', Filters_Test.Brand);
      cy.get('[data-cy="inventory-type"]').should('contain', Filters_Test.Type);
      cy.get('[data-cy="inventory-size"]').should('contain', Filters_Test.Size);
    });
  });

  it("Should be able to clear the filters via the button", () => {
    page.getSidenavButton().click();
    page.getNavLink('Inventory').click();
    cy.url().should('match', /\/inventory$/);

    // Intercept the filtered API calls
    cy.intercept('GET', '/api/inventory*').as('filterInventory');

    cy.get('[data-cy="filter-item"]').type(Filters_Test.Item);
    cy.get('[data-cy="filter-brand"]').type(Filters_Test.Brand);
    cy.get('[data-cy="filter-type"]').type(Filters_Test.Type);
    cy.get('[data-cy="filter-size"]').type(Filters_Test.Size);

    // Wait for the filtered results to load
    cy.wait('@filterInventory');
    //nextTick(1000); // Alternate wait method, preferably wait on the API call instead

    // Click the clear filters button
    cy.get('[data-cy="filter-clear"]').click();

    // Wait for the unfiltered results to load
    cy.wait('@filterInventory');
    //nextTick(1000); // Alternate wait method, preferably wait on the API call instead

    // Check that the first row is no longer the filtered item
    page.getInventoryRow().first().within(() => {
      cy.get('[data-cy="inventory-item"]').should('not.contain', Filters_Test.Item);
      cy.get('[data-cy="inventory-brand"]').should('not.contain', Filters_Test.Brand);
      cy.get('[data-cy="inventory-type"]').should('not.contain', Filters_Test.Type);
      cy.get('[data-cy="inventory-size"]').should('not.contain', Filters_Test.Size);
    });
  });

  describe("autocomplete dropdown filters", () => {
    beforeEach(() => {
      cy.get('[data-cy="filter-clear"]').click();
      cy.intercept('GET', '/api/inventory*').as('getInventory');
      cy.wait('@getInventory');
    });

    it("should show autocomplete options when typing in filter", () => {
      page.getFilterItem().type("Mark");
      cy.get('mat-option').should('exist');
      cy.get('mat-option').should('contain', 'Markers');
    });
    it('Should show autocomplete options when typing in the Brand filter', () => {
      page.getFilterBrand().type('Cray');
      cy.get('mat-option').should('exist');
      cy.get('mat-option').should('contain', 'Crayola');
    });
    it('Should show autocomplete options when typing in the Color filter', () => {
      page.getFilterColor().type('Re');
      cy.get('mat-option').should('exist');
      cy.get('mat-option').should('contain', 'Red');
    });

    it('Should show autocomplete options when typing in the Size filter', () => {
      page.getFilterSize().type('Wid');
      cy.get('mat-option').should('exist');
      cy.get('mat-option').invoke('text').should('contain', 'Wide');
    });

    it('Should show autocomplete options when typing in the Type filter', () => {
      page.getFilterType().type('Wash');
      cy.get('mat-option').should('exist');
      cy.get('mat-option').should('contain', 'Washable');
    });

    it('Should show autocomplete options when typing in the Material filter', () => {
      page.getFilterMaterial().type('Plas');
      cy.get('mat-option').should('exist');
      cy.get('mat-option').should('contain', 'Plastic');
    });


    it('Should narrow autocomplete options as the user types more characters', () => {
      page.getFilterItem().type('M');
      cy.get('mat-option').its('length').then((broadCount) => {
        page.getFilterItem().clear().type('Markers');
        cy.get('mat-option').its('length').should('be.lte', broadCount);
      });
    });

    it('Should show no autocomplete options when input matches nothing', () => {
      page.getFilterItem().should('be.enabled').type('someItem')
      cy.get('mat-option').should('not.exist');
    });

    it('Should filter results when selecting an autocomplete option for Item', () => {
      cy.intercept('GET', '/api/inventory*').as('filterInventory');
      page.selectAutoCompleteOption('[data-cy="filter-item"]', 'Markers');
      cy.wait('@filterInventory');
      cy.get('[data-cy="inventory-item"]').first().should('have.text', 'Markers');
    });

    it('Should filter results when selecting an autocomplete option for Brand', () => {
      cy.intercept('GET', '/api/inventory*').as('filterInventory');
      page.selectAutoCompleteOption('[data-cy="filter-brand"]', 'Crayola');
      cy.wait('@filterInventory');
      cy.get('[data-cy="inventory-brand"]').first().should('have.text', 'Crayola');
    });

    it('Should filter results when selecting an autocomplete option for Color', () => {
      cy.intercept('GET', '/api/inventory*').as('filterInventory');
      page.selectAutoCompleteOption('[data-cy="filter-color"]', 'Red');
      cy.wait('@filterInventory');
      cy.get('[data-cy="inventory-color"]').first().should('have.text', 'Red');
    });

    it('Should filter results when selecting an autocomplete option for Type', () => {
      cy.intercept('GET', '/api/inventory*').as('filterInventory');
      page.selectAutoCompleteOption('[data-cy="filter-type"]', 'Washable');
      cy.wait('@filterInventory');
      cy.get('[data-cy="inventory-type"]').first().should('have.text', 'Washable');
    });
  });

  it('Should handle empty inventory response', () => {
    cy.intercept('GET', '/api/inventory*', {
      body: []
    }).as('emptyInventory');

    cy.visit('/inventory');
    cy.wait('@emptyInventory');

    cy.get('[data-cy="inventory-row"]').should('have.length', 0);
  });

  it('Should handle API error gracefully', () => {
    cy.intercept('GET', '/api/inventory*', {
      statusCode: 500,
      body: {}
    }).as('apiFail');

    cy.visit('/inventory');
    cy.wait('@apiFail');

    cy.contains(/error|failed/i).should('exist');
  });

  it('Should render all inventory fields', () => {
    cy.get('[data-cy="inventory-row"]').first().within(() => {
      cy.get('[data-cy="inventory-item"]').should('exist');
      cy.get('[data-cy="inventory-description"]').should('exist');
      cy.get('[data-cy="inventory-brand"]').should('exist');
      cy.get('[data-cy="inventory-color"]').should('exist');
      cy.get('[data-cy="inventory-size"]').should('exist');
      cy.get('[data-cy="inventory-type"]').should('exist');
      cy.get('[data-cy="inventory-material"]').should('exist');
      cy.get('[data-cy="inventory-packageSize"]').should('exist');
      cy.get('[data-cy="inventory-quantity"]').should('exist');
      cy.get('[data-cy="inventory-notes"]').should('exist');
    });
  });

  it('Should navigate through pages', () => {
    cy.get('[data-cy="inventory-paginator"]').should('exist');

    cy.get('button[aria-label="Next page"]').click();
    cy.wait(500);

    cy.get('[data-cy="inventory-row"]').should('exist');
  });

  it('Should handle clearing filters when already empty', () => {
    cy.get('[data-cy="filter-clear"]').click();
    cy.get('[data-cy="inventory-row"]').should('exist');
  });

  it('Should filter using only item field', () => {
    cy.intercept({
      method: 'GET',
      pathname: '/api/inventory',
      query: {
        item: 'Markers'
      }
    }).as('filterByItem');

    cy.get('[data-cy="filter-item"]')
      .clear()
      .type('Markers')
      .blur();

    cy.wait('@filterByItem');

    cy.get('[data-cy="inventory-item"]').then(($items) => {
      const itemTexts = [...$items].map((item) =>
        (item.textContent || '').trim()
      );

      expect(itemTexts.length).to.be.greaterThan(0);
      itemTexts.forEach((text) => {
        expect(text).to.contain('Markers');
      });
    });
  });
  it('Should capture error when no autocomplete options exist', () => {
    cy.on('fail', (err) => {
      expect(err.message).to.include('No autocomplete options found');
    });

    page.selectAutoCompleteOption('[data-cy="filter-item"]', 'someItem');
  });



  // Note: The below test should remain empty until a finalized inventory list JSON is used to seed the database.

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
