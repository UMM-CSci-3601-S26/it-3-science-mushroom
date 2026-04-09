export class BarcodePage {
  // Scanner
  getScanButton() {
    return cy.get('[data-cy="scan-button"]');
  }

  getScannerWrapper() {
    return cy.get('.scanner-wrapper');
  }

  getScannerStatus() {
    return cy.contains('Scanner is open');
  }

  // Manual Entry Dialog
  getDialog() {
    return cy.get('mat-dialog-container');
  }

  getDialogTitle() {
    return cy.contains('Manual Entry');
  }

  getBarcodeText() {
    return cy.get('.barcode-ref');
  }

  // Form fields
  getItemInput() {
    return cy.get('input[formControlName="item"]');
  }

  getBrandInput() {
    return cy.get('input[formControlName="brand"]');
  }

  getColorInput() {
    return cy.get('input[formControlName="color"]');
  }

  getSizeInput() {
    return cy.get('input[formControlName="size"]');
  }

  getTypeInput() {
    return cy.get('input[formControlName="type"]');
  }

  getMaterialInput() {
    return cy.get('input[formControlName="material"]');
  }

  getQuantityInput() {
    return cy.get('input[formControlName="quantity"]');
  }

  // Buttons
  getSaveButton() {
    return cy.contains('button', 'Save');
  }

  getCancelButton() {
    return cy.contains('button', 'Cancel');
  }
}
