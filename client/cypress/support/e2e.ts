// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  const visit = originalFn as (
    urlOrOptions: string | Partial<Cypress.VisitOptions>,
    visitOptions?: Partial<Cypress.VisitOptions>
  ) => Cypress.Chainable<Cypress.AUTWindow>;
  const requestedUrl = typeof url === 'string' ? url : url.url;

  if (Cypress.env('E2E_ROLE_LOGIN_ACTIVE') || requestedUrl === '/login') {
    return visit(url, { timeout: 30000, ...options });
  }

  const username = Cypress.env('E2E_ADMIN_USER');
  const password = Cypress.env('E2E_ADMIN_PASSWORD');

  if (!username || !password) {
    return visit(url, { timeout: 30000, ...options });
  }

  return cy.request('POST', '/api/auth/login', { username, password }).then({ timeout: 30000 }, () => {
    return visit(url, { timeout: 30000, ...options });
  });
});
