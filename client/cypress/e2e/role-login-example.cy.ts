const hasConfiguredAdminCredentials = () => {
  const user = Cypress.env('E2E_ADMIN_USER');
  const password = Cypress.env('E2E_ADMIN_PASSWORD');

  return Boolean(user && password && user !== 'cypress-admin' && password);
};

describe('Role login example', () => {
  it('logs in as admin and visits settings', function () {
    if (!hasConfiguredAdminCredentials()) {
      this.skip();
    }

    cy.loginAsRole('admin');
    cy.visit('/settings');
    cy.contains('Settings').should('exist');
  });
});
