import { StockReportPage } from "../support/stock-report.po";

const page = new StockReportPage();

describe('Stock Report', () => {
  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getAppTitle().should('contain', 'Stock Report');
  });

  it('Should navigate to Stock Report page', () => {
    page.getSidenavButton().click();
    page.getNavLink('Stock Report').click();
    cy.url().should('match', /\/stock-report$/);
    page.getSidenav().should('be.hidden');
  });

  it('Should display stock state sections', () => {
    // Make sure mat-cards load first (Cypress was being silly, had to add this)
    cy.get('mat-card', { timeout: 10000 }).should('have.length.greaterThan', 0);

    // Look for cards by their specific data-cy attributes
    cy.get('[data-cy="stocked-items-card"]', { timeout: 10000 }).should('exist');
    cy.get('[data-cy="out-of-stock-items-card"]', { timeout: 10000 }).should('exist');
    cy.get('[data-cy="overstocked-items-card"]', { timeout: 10000 }).should('exist');
    cy.get('[data-cy="understocked-items-card"]', { timeout: 10000 }).should('exist');
  });

  it('Should display report generation buttons', () => {
    const errors: string[] = [];

    const recordError = (message: string) => {
      errors.push(message);
      cy.log(message);
      console.warn(message);
    }

    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="generate-and-download-pdf"]').length === 0) {
        recordError(`Missing Generate and Download PDF button`);
      }
      if ($body.find('[data-cy="download-all-pdfs"]').length === 0) {
        recordError(`Missing Download All PDFs button`);
      }
      if ($body.find('[data-cy="delete-all-pdfs"]').length === 0) {
        recordError(`Missing Delete All PDFs button`);
      }
    });

    cy.then(() => {
      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }
    });
  });

  it('Should be able to generate and download a PDF report', () => {
    page.getGenerateAndDownloadPDFButton().click();
    // Verify snackbar message appears
    cy.get('.mdc-snackbar').should('contain', 'Generating and saving report');
  });

  it('Should be able to generate and save a PDF report to server', () => {
    cy.intercept('POST', '/api/stockreport*').as('saveReport');
    page.getReportCard().first().within(() => {
      cy.get('button').contains('Generate Report as PDF').click();
    });
    cy.wait('@saveReport');
    cy.get('.mdc-snackbar').should('contain', 'Generating and downloading report');
  });

  it('Should be able to download a single report from the server', () => {
    // Ensure we have at least one report
    cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');

    // Find the first report item and click its download button
    cy.get('[data-cy="pdf-report-item"]').first().within(() => {
      cy.get('[data-cy="download-pdf-button"]').click();
    });

    // Verify snackbar shows download message
    cy.get('.mdc-snackbar').should('contain', 'Downloading report');
  });

  it('Should be able to download all reports as a ZIP from the server', () => {
    // Ensure reports exist
    cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');

    // Click download all button
    page.getDownloadAllPDFsButton().click();

    // Verify snackbar shows download message
    cy.get('.mdc-snackbar').should('contain', 'Downloaded all report');
  });

  it('Should be able to delete a single report from the server', () => {
    // Ensure we have at least one report
    cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');

    // Find the first report item and click its delete button
    cy.get('[data-cy="pdf-report-item"]').first().within(() => {
      cy.get('[data-cy="delete-pdf-button"]').click();
    });

    // Confirm deletion in dialog
    cy.contains('button', 'Confirm').click();

    // Verify snackbar shows deletion confirmation
    cy.get('.mdc-snackbar').should('contain', 'deleted successfully');
  });

  it('Should be able to delete all reports from the server', () => {
    // Ensure reports exist
    cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');

    // Click delete all button
    page.getDeleteAllReportsButton().click();

    // Confirm deletion in dialog
    cy.contains('button', 'Confirm').click();

    // Verify snackbar shows deletion confirmation
    cy.get('.mdc-snackbar').should('contain', 'deleted successfully');
  });

  it('Should show message when no reports available for download', () => {
    // After deleting all reports, the list should be empty
    // Try to download when empty
    page.getDownloadAllPDFsButton().click();

    // Should show no reports message
    cy.get('.mdc-snackbar').should('contain', 'No reports available');
  });

});
