declare global {
  namespace Cypress {
    interface Chainable {
      loginAsRole(role: 'admin' | 'staff' | 'viewer'): Chainable<void>;
    }
  }
}

export {};
