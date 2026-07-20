import { AddFamilyPage } from '../support/add-family.po';
import { FamilyListPage } from '../support/family-list.po';

const addFamilyPage = new AddFamilyPage();
const familyListPage = new FamilyListPage();

describe('Guardian account linking flow', () => {
  const guardianPassword = 'password123';
  const guardianFullName = 'E2E Guardian Link';
  const guardianUsername = `e2e_guardian_link_${Date.now()}`;

  before(() => {
    cy.task('seed:database');
  });

  it('links a guardian account without a portal-created family to a manually created family', () => {
    // Guardian creates only the account, then stops at the optional portal profile state.
    cy.visit('/guardian-sign-up');
    cy.get('[formcontrolname="fullName"]').type(guardianFullName);
    cy.get('[formcontrolname="username"]').type(guardianUsername);
    cy.get('[formcontrolname="password"]').type(guardianPassword, { log: false });
    cy.contains('button', 'Sign Up').click();

    cy.url().should('include', '/family-portal');
    cy.contains('No family profile yet').should('be.visible');
    cy.contains('Create Family Profile').should('be.visible');

    // Leave the guardian session and come back as an admin to create the manual family.
    cy.get('.account-button').click();
    cy.contains('button', 'Logout').click();
    cy.url().should('include', '/login');

    cy.loginAsRole('admin');

    addFamilyPage.navigateTo();
    addFamilyPage.addFamily({
      guardianName: guardianFullName,
      email: 'guardian.link@example.com',
      address: '123 Link Street',
      accommodations: 'None',
      needSpanishHelp: false,
      timeSlot: 'TBD',
      timeAvailability: {
        earlyMorning: true,
        lateMorning: false,
        earlyAfternoon: false,
        lateAfternoon: false
      },
      students: [{
        name: 'Link Student',
        grade: '5',
        school: 'Hancock Elementary School',
        schoolAbbreviation: 'HES',
        teacher: 'Teacher',
        headphones: false,
        backpack: true
      }]
    });

    cy.url().should('match', /\/family$/);
    familyListPage.getFilterFamily().clear().type(guardianFullName);
    cy.contains('.family-card', guardianFullName).find('[data-test="editFamilyButton"]').click();

    // Link from inside the edit-family page, which is the workflow admins asked for.
    cy.get('[data-cy="guardian-link-edit-button"]').click();
    cy.get('[data-cy="family-search"]').clear().type(guardianFullName);
    cy.get('mat-option').contains(guardianFullName).click();
    cy.get('[data-cy="guardian-search"]').clear().type(guardianUsername);
    cy.get('mat-option').contains(guardianUsername).click();
    cy.get('[data-cy="guardian-link-button"]').should('be.enabled').click();
    cy.contains('Guardian account linked.').should('be.visible');

    // Confirm the newly linked family appears under the linked guardian status filter.
    cy.visit('/family');
    familyListPage.getFilterFamily().clear().type(guardianFullName);
    cy.get('[data-test="guardianLinkStatusFilter"]').click();
    cy.get('mat-option').contains('Linked Guardian Account').click();

    cy.contains('.family-card', guardianFullName).within(() => {
      cy.get('[data-test="guardianLinkStatus"]').should('contain.text', 'Linked Guardian Account');
    });
  });
});
