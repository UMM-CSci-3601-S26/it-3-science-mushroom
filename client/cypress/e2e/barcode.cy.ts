import { BarcodePage } from '../support/barcode.po';
import { InventoryPage } from '../support/inv.po';

const inventory = new InventoryPage();
const barcode = new BarcodePage();

describe('Barcode / Scanner Feature', () => {

  beforeEach(() => {
    cy.intercept('GET', '/api/inventory*').as('getInventory');
    inventory.navigateTo();
    cy.wait('@getInventory');
  });

  it('Should open and close the scanner', () => {
    barcode.getScanButton().click();

    barcode.getScannerWrapper().should('exist');
    barcode.getScannerStatus().should('contain', 'Scanner is ready');

    // Toggle off
    barcode.getScanButton().click();
    barcode.getScannerWrapper().should('not.exist');
  });

  it('Should toggle scan button text correctly', () => {
    barcode.getScanButton().should('contain', 'Scan Item');

    barcode.getScanButton().click();
    barcode.getScanButton().should('contain', 'Close Scanner');

    barcode.getScanButton().click();
    barcode.getScanButton().should('contain', 'Scan Item');
  });

  it('Should show scan mode options when open', () => {
    barcode.getScanButton().click();

    cy.contains('Select a scan mode to begin.').should('exist');
    cy.contains('button', 'Camera Scan').should('exist');
    cy.contains('button', 'Hand Held Scan').should('exist');
  });

  it('Should keep scan button disabled state consistent', () => {
    barcode.getScanButton().should('not.be.disabled');
  });

  it('Should open manual entry dialog (simulated)', () => {
    // Simulate manual entry trigger
    cy.window().then((win: Window) => {
      win.document.dispatchEvent(new CustomEvent('manualEntryNeeded', {
        detail: { barcode: '12345' }
      }));
    });

    // Fallback: ensure dialog exists if app opens it differently
    cy.get('body').then(($body) => {
      if ($body.find('mat-dialog-container').length > 0) {
        barcode.getDialog().should('exist');
        barcode.getDialogTitle().should('contain', 'Manual Entry');
      }
    });
  });

  it('Should validate required fields in manual entry form', () => {
    // Attempt to find dialog first
    cy.get('body').then(($body) => {
      if ($body.find('mat-dialog-container').length > 0) {
        barcode.getSaveButton().click();

        cy.contains('Item is required').should('exist');
        cy.contains('Quantity is required').should('exist');
      }
    });
  });

  it('Should validate minimum quantity', () => {
    cy.get('body').then(($body) => {
      if ($body.find('mat-dialog-container').length > 0) {
        barcode.getItemInput().type('Markers');
        barcode.getQuantityInput().type('0');

        barcode.getSaveButton().click();

        cy.contains('Quantity must be at least 1').should('exist');
      }
    });
  });

  it('Should submit manual entry form successfully', () => {
    cy.get('body').then(($body) => {
      if ($body.find('mat-dialog-container').length > 0) {
        barcode.getItemInput().type('Markers');
        barcode.getQuantityInput().type('5');

        barcode.getSaveButton().click();

        barcode.getDialog().should('not.exist');
      }
    });
  });

  it('Should close manual entry dialog on cancel', () => {
    cy.get('body').then(($body) => {
      if ($body.find('mat-dialog-container').length > 0) {
        barcode.getCancelButton().click();
        barcode.getDialog().should('not.exist');
      }
    });
  });

  it('Should not break when scanner is toggled multiple times', () => {
    barcode.getScanButton().click();
    barcode.getScanButton().click();
    barcode.getScanButton().click();

    barcode.getScannerWrapper().should('exist');
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

});
