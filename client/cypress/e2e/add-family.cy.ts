import { Family } from 'src/app/family/family';
import { AddFamilyPage } from '../support/add-family.po';

describe('Add family page', () => {
  const page = new AddFamilyPage();

  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getTitle().should('have.text', 'New Family');
  });

  it('Should be disable the add family button when family does not have a student added', () => {
    page.addFamilyButton().should('be.disabled');
    page.getFormField('guardianFirstName').type('test');
    page.addFamilyButton().should('be.disabled');
    page.getFormField('guardianLastName').type('name');
    page.addFamilyButton().should('be.disabled');
    page.getFormField('address').type('123 Street');
    page.addFamilyButton().should('be.disabled');
    page.getFormField('earlyMorning').click();
    page.addFamilyButton().should('be.disabled');
    page.getFormField('lateMorning').click();
    page.addFamilyButton().should('be.disabled');
    page.getFormField('email').clear().type('familytest@email.com');

    page.addFamilyButton().should('be.disabled');
  });

  it('Should show error messages for invalid inputs on the family form', () => {
    // Before doing anything there shouldn't be an error
    cy.get('[data-test=guardianFirstNameError]').should('not.exist');

    // Just clicking the guardian first name field without entering anything should cause an error message
    page.getFormField('guardianFirstName').click().blur();
    cy.get('[data-test=guardianFirstNameError]').should('exist').and('be.visible');

    // Some more tests for various invalid guardian first name inputs
    page.getFormField('guardianFirstName').type('J').blur();
    cy.get('[data-test=guardianFirstNameError]').should('exist').and('be.visible');
    page
      .getFormField('guardianFirstName')
      .clear()
      .type('This is a very long name that goes beyond the 50 character limit')
      .blur();
    cy.get('[data-test=guardianFirstNameError]').should('exist').and('be.visible');

    // Entering a valid guardian first name should remove the error.
    page.getFormField('guardianFirstName').clear().type('John').blur();
    cy.get('[data-test=guardianFirstNameError]').should('not.exist');

    // Before doing anything there shouldn't be an error
    cy.get('[data-test=guardianLastNameError]').should('not.exist');

    // Just clicking the guardian last name field without entering anything should cause an error message
    page.getFormField('guardianLastName').click().blur();
    cy.get('[data-test=guardianLastNameError]').should('exist').and('be.visible');

    // Some more tests for various invalid guardian last name inputs
    page.getFormField('guardianLastName').type('S').blur();
    cy.get('[data-test=guardianLastNameError]').should('exist').and('be.visible');
    page
      .getFormField('guardianLastName')
      .clear()
      .type('This is a very long name that goes beyond the 50 character limit')
      .blur();
    cy.get('[data-test=guardianLastNameError]').should('exist').and('be.visible');

    // Entering a valid guardian last name should remove the error.
    page.getFormField('guardianLastName').clear().type('Smith').blur();
    cy.get('[data-test=guardianLastNameError]').should('not.exist');

    // Before doing anything there shouldn't be an error
    cy.get('[data-test=addressError]').should('not.exist');
    // Just clicking the address field without entering anything should cause an error message
    page.getFormField('address').click().blur();
    // Entering a valid address should remove the error.
    page.getFormField('address').clear().type('123 Street').blur();
    cy.get('[data-test=addressError]').should('not.exist');

    // Before doing anything there shouldn't be an error
    cy.get('[data-test=emailError]').should('not.exist');
    // Just clicking the email field without entering anything should cause an error message
    page.getFormField('email').click().blur();
    // Some more tests for various invalid email inputs
    cy.get('[data-test=emailError]').should('exist').and('be.visible');
    page.getFormField('email').type('asd').blur();
    cy.get('[data-test=emailError]').should('exist').and('be.visible');
    page.getFormField('email').clear().type('@example.com').blur();
    cy.get('[data-test=emailError]').should('exist').and('be.visible');
    // Entering a valid email should remove the error.
    page.getFormField('email').clear().type('family@example.com').blur();
    cy.get('[data-test=emailError]').should('not.exist');
  });

  it('Should show error messages for invalid inputs on the student form', () => {
    page.addStudentButton().click();

    // Test invalid name
    page.getStudentField(0, 'name').click().blur();
    cy.get('[data-test=nameError]').should('exist').and('be.visible');
    // Entering a valid name should remove the error
    page.getStudentField(0, 'name').clear().type('Lisa').blur();
    cy.get('[data-test=nameError]').should('not.exist');

    // Test invalid grade
    page.getStudentField(0, 'grade').click().type('{esc}');
    cy.get('[data-test=gradeError]').should('exist').and('be.visible');
    // Entering a valid grade should remove the error
    page.getStudentField(0, 'grade').click();
    cy.get('mat-option').contains('10').click();
    cy.get('[data-test=gradeError]').should('not.exist');

    // Test invalid school
    page.getStudentField(0, 'school').click().type('{esc}');
    cy.get('[data-test=schoolError]').should('exist').and('be.visible');
    // Entering a valid school should remove the error
    page.getStudentField(0, 'school').click();
    cy.get('mat-option').contains('Morris Area High School (MAHS)').click();
    cy.get('[data-test=schoolError]').should('not.exist');
  });

  it('Should be able to remove a student', () => {
    page.addStudentButton().click();
    page.getStudentField(0, 'name').type('Lisa');
    page.getStudentField(0, 'grade').click();
    cy.get('mat-option').contains('10').click();
    page.getStudentField(0, 'school').click();
    cy.get('mat-option').contains('Morris Area High School (MAHS)').click();

    cy.contains('button', 'Remove').click();
    cy.get(`[formarrayname="students"] [formcontrolname="name"]`).should('have.length', 0);
  });

  describe('Adding a new family', () => {
    beforeEach(() => {
      cy.task('seed:database');
    });

    it('Should go to the right page, and have the right info', () => {
      const family: Family = {
        _id: null,
        guardianName: 'Test Family',
        address: '123 Street',
        timeSlot: 'TBD',
        timeAvailability: {
          earlyMorning: false,
          lateMorning: true,
          earlyAfternoon: false,
          lateAfternoon: false
        },
        email: 'test@email.com',
        students: [
          {
            name: 'Lisa',
            grade: '6',
            school: "Morris Area Middle School",
            schoolAbbreviation: "MAMS",
            teacher: "N/A",
            headphones: true,
            backpack: false
          },
          {
            name: 'Allie',
            grade: '11',
            school: "Morris Area High School",
            schoolAbbreviation: "MAHS",
            teacher: "N/A",
            headphones: true,
            backpack: false
          },
          {
            name: 'Joe',
            grade: '10',
            school: "Morris Area High School",
            schoolAbbreviation: "MAHS",
            teacher: "N/A",
            headphones: true,
            backpack: false
          },
        ]
      };

      cy.intercept('/api/family').as('addFamily');
      page.addFamily(family);
      cy.wait('@addFamily');
      cy.log('API intercepted, checking URL...');

      // New URL should go right back to the family list page (/family) and stay there (not /family/new)
      cy.wait('@addFamily');
      cy.url({ timeout: 3000 })
        .should('match', /\/family$/)
        .should('not.match', /\/family\/new$/);

      // Wait for at least one family card
      cy.get('.family-card', { timeout: 10000 })
        .should('have.length.greaterThan', 0);

      // Filter the family list by the new family's guardian name to make sure it appears,
      // since the pagination may cause it to not appear on the first page of the family list
      page.getFilterFamily().type(family.guardianName);

      // Valid test family information
      cy.get('.family-card-guardianName')
        .contains(family.guardianName)
        .should('exist');

      cy.get('.family-card-address')
        .contains(family.address)
        .should('exist');

      cy.get('.family-card-email')
        .contains(family.email)
        .should('exist');

      cy.get('.family-card-timeSlot')
        .contains(family.timeSlot)
        .should('exist');

      cy.get('.family-card-timeAvailability')
        .contains('Late Morning')
        .should('exist');

      // We should see the confirmation message at the bottom of the screen
      page.getSnackBar().should('contain', `Added family ${family.guardianName}`);
    });
  });
});
