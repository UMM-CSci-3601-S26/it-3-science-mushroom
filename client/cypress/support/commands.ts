// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

type TestRole = 'admin' | 'staff' | 'viewer';

Cypress.Commands.add('loginAsRole', (role: TestRole) => {
  const roleKey = role.toUpperCase();

  const user = Cypress.env(`E2E_${roleKey}_USER`);
  const password = Cypress.env(`E2E_${roleKey}_PASSWORD`);

  if (!user || !password) {
    throw new Error(`Missing Cypress credentials for role: ${role}`);
  }

  Cypress.env('E2E_ROLE_LOGIN_ACTIVE', true);

  cy.visit('/login');

  cy.get('[data-testid="user-input"]').type(user);
  cy.get('[data-testid="password-input"]').type(password, { log: false });
  cy.get('[data-testid="login-button"]').click();

  cy.url().should('not.include', '/login');
});
