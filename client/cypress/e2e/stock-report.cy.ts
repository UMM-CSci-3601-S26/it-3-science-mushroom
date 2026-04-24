import { StockReportPage } from "../support/stock-report.po";

const page = new StockReportPage();

describe('Stock Report', () => {
  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    page.navigateTo();

    // Create test reports for download/delete tests
    cy.intercept('POST', '/api/stockreport*').as('saveReport');

    // Create first reports
    page.getGenerateAndSavePDFButton().click();
    page.getGenerateAndSaveXLSXButton().click();
    cy.wait('@saveReport');

    // Create second reports
    page.getGenerateAndSavePDFButton().click();
    page.getGenerateAndSaveXLSXButton().click();
    cy.wait('@saveReport');
  });

  describe('General Tests', () => {
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
  });

  describe('Generation Tests', () => {
    describe('PDF Generation', () => {
      it('Should be able to generate and download a PDF report', () => {
        page.getGenerateAndDownloadPDFButton().click();
        // Verify snackbar message appears
        cy.get('.mdc-snackbar').should('contain', 'Generating and downloading report');
      });

      it('Should be able to generate and save a PDF report to server', () => {
        cy.intercept('POST', '/api/stockreport*').as('saveReport');
        page.getGenerateAndSavePDFButton().click();

        cy.wait('@saveReport');
        cy.get('.mdc-snackbar').should('contain', 'Generating and saving report');
      });
    });

    describe('XLSX Generation', () => {
      it('Should be able to generate and download an XLSX report', () => {
        page.getGenerateAndDownloadXLSXButton().click();
        // Verify snackbar message appears
        cy.get('.mdc-snackbar').should('contain', 'Generating and downloading report');
      });

      it('Should be able to generate and save an XLSX report to server', () => {
        cy.intercept('GET', '/api/stockreport*').as('saveReport');
        page.getGenerateAndSaveXLSXButton().click();

        cy.wait('@saveReport');
        cy.get('.mdc-snackbar').should('contain', 'Generating and saving report');
      });
    });
  });

  describe('Downloading Tests', () => {
    describe('Single Report Tests', () => {
      it('Should be able to download a single PDF report from the server', () => {
        // Reports created in beforeEach
        cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');
        cy.get('[data-cy="pdf-report-item"]').first().within(() => {
          cy.get('[data-cy="download-pdf-button"]').click();
        });

        // Verify snackbar shows download message
        cy.get('.mdc-snackbar').should('contain', 'Downloading report');
      });

      it('Should be able to download a single XLSX report from the server', () => {
        // Reports created in beforeEach
        cy.get('[data-cy="xlsx-reports-list"]', { timeout: 10000 }).should('exist');
        cy.get('[data-cy="xlsx-report-item"]').first().within(() => {
          cy.get('[data-cy="download-xlsx-button"]').click();
        });

        // Verify snackbar shows download message
        cy.get('.mdc-snackbar').should('contain', 'Downloading report');
      });
    });

    describe('Multiple Report Tests', () => {
      it('Should be able to download all reports as a ZIP from the server', () => {
        // Reports created in beforeEach
        cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');
        cy.get('[data-cy="xlsx-reports-list"]', { timeout: 10000 }).should('exist');
        page.getDownloadAllReportsButton().click();

        // Verify snackbar shows download message
        cy.get('.mdc-snackbar').should('contain', 'Downloaded all "All" report(s)');
      });

      it('Should be able to download all PDF reports as a ZIP from the server', () => {
        // Reports created in beforeEach
        cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');
        page.getDownloadAllPDFsButton().click();

        // Verify snackbar shows download message
        cy.get('.mdc-snackbar').should('contain', 'Downloaded all "PDF" report(s)');
      });

      it('Should be able to download all XLSX reports as a ZIP from the server', () => {
        // Reports created in beforeEach
        cy.get('[data-cy="xlsx-reports-list"]', { timeout: 10000 }).should('exist');
        page.getDownloadAllXLSXsButton().click();

        // Verify snackbar shows download message
        cy.get('.mdc-snackbar').should('contain', 'Downloaded all "XLSX" report(s)');
      });
    });
  });

  describe('Deletion Tests', () => {
    describe('Single Report Tests', () => {
      it('Should be able to delete a single PDF report from the server', () => {
        // Reports created in beforeEach
        cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');
        cy.get('[data-cy="pdf-report-item"]').first().within(() => {
          cy.get('[data-cy="delete-pdf-button"]').click();
        });

        // Confirm deletion in dialog
        cy.contains('button', 'Confirm').click();

        // Verify snackbar shows deletion confirmation
        cy.get('.mdc-snackbar').should('contain', 'deleted successfully');
      });

      it('Should be able to delete a single XLSX report from the server', () => {
        // Reports created in beforeEach
        cy.get('[data-cy="xlsx-reports-list"]', { timeout: 10000 }).should('exist');
        cy.get('[data-cy="xlsx-report-item"]').first().within(() => {
          cy.get('[data-cy="delete-xlsx-button"]').click();
        });

        // Confirm deletion in dialog
        cy.contains('button', 'Confirm').click();

        // Verify snackbar shows deletion confirmation
        cy.get('.mdc-snackbar').should('contain', 'deleted successfully');
      });
    });

    describe('Multiple Report Tests', () => {
      it('Should be able to delete all reports from the server', () => {
        // Reports created in beforeEach (2 reports ready)
        cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');
        page.getDeleteAllReportsButton().click();

        // Confirm deletion in dialog
        cy.contains('button', 'Confirm').click();

        // Verify snackbar shows deletion confirmation
        cy.get('.mdc-snackbar').should('contain', 'deleted successfully');
      });

      it('Should be able to delete all PDF reports from the server', () => {
        page.getGenerateAndSavePDFButton().click(); // Add a new PDF report to delete
        cy.get('[data-cy="pdf-reports-list"]', { timeout: 10000 }).should('exist');
        page.getDeleteAllPDFsButton().click();

        // Confirm deletion in dialog
        cy.contains('button', 'Confirm').click();

        // Verify snackbar shows deletion confirmation
        cy.get('.mdc-snackbar').should('contain', 'deleted successfully');
      });

      it('Should be able to delete all XLSX reports from the server', () => {
        page.getGenerateAndSaveXLSXButton().click(); // Add a new XLSX report to delete
        cy.get('[data-cy="xlsx-reports-list"]', { timeout: 10000 }).should('exist');
        page.getDeleteAllXLSXsButton().click();

        // Confirm deletion in dialog
        cy.contains('button', 'Confirm').click();

        // Verify snackbar shows deletion confirmation
        cy.get('.mdc-snackbar').should('contain', 'deleted successfully');
      });
    });
  });

  describe('Other Tests', () => {
    it('Should show message when no reports available for download', () => {
      // Delete all reports first to test empty state
      page.getDeleteAllReportsButton().click();
      cy.contains('button', 'Confirm').click();

      // Wait for deletion to complete
      cy.get('.mdc-snackbar').should('contain', 'deleted successfully');

      // Try to download when empty
      page.getDownloadAllReportsButton().click();

      // Should show no reports message
      cy.get('.mdc-snackbar').should('contain', 'No reports available');
    });
  });
});
