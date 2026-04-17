export class StockReportPage {
  private readonly baseUrl = '/stock-report';
  private readonly titleSelector = '.stock-report-title';
  private readonly sideNavButton = '.sidenav-button';
  private readonly sideNav = '.sidenav';
  private readonly sideNavOption = '[routerlink] > .mdc-list-item__content';

  // Generic Selectors
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

  getNavLink(navOption: 'Home' | 'Stock Report') {
    return cy.contains(this.sideNavOption, `${navOption}`);
  }

  // Stock Report Layout
  getReportCard() {
    return cy.get('[data-cy="reports-card"]');
  }

  getPDFReportsList() {
    return cy.get('[data-cy="pdf-reports-list"]');
  }

  getXLSXReportsList() {
    return cy.get('[data-cy="xlsx-reports-list"]');
  }

  // Generate Buttons
  getGenerateAndDownloadXLSXButton() {
    return cy.get('[data-cy="generate-and-download-xlsx"]');
  }

  getGenerateAndDownloadPDFButton() {
    return cy.get('[data-cy="generate-and-download-pdf"]');
  }

  // Stock Report Tree
  getStockedItemsCard() {
    return cy.get('[data-cy="stocked-items-card"]');
  }

  getOutOfStockItemsCard() {
    return cy.get('[data-cy="out-of-stock-items-card"]');
  }

  getOverstockedItemsCard() {
    return cy.get('[data-cy="overstocked-items-card"]');
  }

  getUnderstockedItemsCard() {
    return cy.get('[data-cy="understocked-items-card"]');
  }

  // Download/Delete All Buttons
  getDownloadAllReportsButton() {
    return cy.get('[data-cy="download-all-reports"]');
  }

  getDownloadAllPDFsButton() {
    return cy.get('[data-cy="download-all-pdfs"]');
  }

  getDownloadAllXLSXsButton() {
    return cy.get('[data-cy="download-all-xlsx"]');
  }

  getDeleteAllReportsButton() {
    return cy.get('[data-cy="delete-all-reports"]');
  }

  getDeleteAllPDFsButton() {
    return cy.get('[data-cy="delete-all-pdfs"]');
  }

  getDeleteAllXLSXsButton() {
    return cy.get('[data-cy="delete-all-xlsx"]');
  }

  // Download/Delete Single Buttons
  getDownloadSinglePDFButton(reportName: string) {
    return cy.get(`[data-cy="download-single-pdf"][data-report-name="${reportName}"]`);
  }

  getDeleteSinglePDFButton(reportName: string) {
    return cy.get(`[data-cy="delete-single-pdf"][data-report-name="${reportName}"]`);
  }

  getDownloadSingleXLSXButton(reportName: string) {
    return cy.get(`[data-cy="download-single-xlsx"][data-report-name="${reportName}"]`);
  }

  getDeleteSingleXLSXButton(reportName: string) {
    return cy.get(`[data-cy="delete-single-xlsx"][data-report-name="${reportName}"]`);
  }
}
