import { Family } from 'src/app/family/family';
import { EditFamilyPage } from '../support/edit-family.po';

describe('Edit family page', () => {
  const page = new EditFamilyPage();

  beforeEach(() => {
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getTitle().should('have.text', 'Edit Family');
  });

  it('Should be enabled for the edit family button, since we are editing an existing family', () => {
    page.editFamilyButton().should('be.enabled');
  });

  it('Should show error messages for invalid inputs on the family form', () => {
    // Before doing anything there shouldn't be an error
    cy.get('[data-test=guardianNameError]').should('not.exist');

    // Deleting and then clicking the guardian name field without entering anything should cause an error message
    page.getFormField('guardianName').click().clear().blur();
    cy.get('[data-test=guardianNameError]').should('exist').and('be.visible');

    // Some more tests for various invalid guardian name inputs
    page.getFormField('guardianName').type('J').blur();
    cy.get('[data-test=guardianNameError]').should('exist').and('be.visible');
    page
      .getFormField('guardianName')
      .clear()
      .type('This is a very long name that goes beyond the 50 character limit')
      .blur();
    cy.get('[data-test=guardianNameError]').should('exist').and('be.visible');

    // Entering a valid guardian name should remove the error.
    page.getFormField('guardianName').clear().type('John Smith').blur();
    cy.get('[data-test=guardianNameError]').should('not.exist');

    // Before doing anything there shouldn't be an error
    cy.get('[data-test=addressError]').should('not.exist');
    // Deleting and then clicking the address field without entering anything should cause an error message
    page.getFormField('address').click().clear().blur();
    // Entering a valid address should remove the error.
    page.getFormField('address').clear().type('123 Street').blur();
    cy.get('[data-test=addressError]').should('not.exist');

    // Before doing anything there shouldn't be an error
    cy.get('[data-test=emailError]').should('not.exist');
    // Deleting and then clicking the email field without entering anything should cause an error message
    page.getFormField('email').click().clear().blur();
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
    // All the errors should not exist before we do anything,
    // since we should start with a filled out student form
    cy.get('[data-test=nameError]').should('not.exist');
    cy.get('[data-test=gradeError]').should('not.exist');
    cy.get('[data-test=schoolError]').should('not.exist');

    page.addStudentButton().click();

    // Test invalid name
    page.getStudentField(2, 'name').click().blur();
    cy.get('[data-test=nameError]').should('exist').and('be.visible');
    // Entering a valid name should remove the error
    page.getStudentField(2, 'name').clear().type('Lisa').blur();
    cy.get('[data-test=nameError]').should('not.exist');

    // Test invalid grade
    page.getStudentField(2, 'grade').type('99').blur();
    cy.get('[data-test=gradeError]').should('exist').and('be.visible');
    // Entering a valid grade should remove the error
    page.getStudentField(2, 'grade').clear().type('10').blur();
    cy.get('[data-test=gradeError]').should('not.exist');

    // Test invalid school
    page.getStudentField(2, 'school').type('a').blur();
    cy.get('[data-test=schoolError]').should('exist').and('be.visible');
    // Entering a valid school should remove the error
    page.getStudentField(2, 'school').clear().type('Morris Schools').blur();
    cy.get('[data-test=schoolError]').should('not.exist');
  });

  it('Should be able to remove a student', () => {
    // Filled out form array should start with two students, since we're editing an existing family
    cy.get(`[formarrayname="students"] [formcontrolname="name"]`).should('have.length', 2);

    page.addStudentButton().click();
    page.getStudentField(2, 'name').type('Lisa');
    page.getStudentField(2, 'grade').type('6');
    page.getStudentField(2, 'school').type('Morris High School');

    cy.get(`[formarrayname="students"] [formcontrolname="name"]`).should('have.length', 3);

    cy.contains('button', 'Remove').click();
    cy.get(`[formarrayname="students"] [formcontrolname="name"]`).should('have.length', 2);
  });

  describe('Updating a new family', () => {
    beforeEach(() => {
      cy.task('seed:database');
      page.navigateTo();
    });

    it('Should go to the right page, and have the right info', () => {
      const expectedFamily: Family = {
        guardianName: 'Jane Doe',
        email: 'jane@email.com',
        address: '467 8th Street NE',
        timeSlot: '9:00-10:00',
        students: [
          {
            name: 'Tim',
            grade: '12',
            school: 'MAHS',
            teacher: '',
            requestedSupplies: [
              'Headphones'
            ]
          },
          {
            name: 'Sara',
            grade: '11',
            school: 'MAHS',
            teacher: 'Mr. Test',
            requestedSupplies: [
              'Backpack'
            ]
          }
        ]
      };

      const formInfo: Family = {
        guardianName: '',
        email: '',
        address: '467 8th Street NE',
        timeSlot: '',
        students: [
          {
            name: '',
            grade: '',
            school: '',
            teacher: '',
            requestedSupplies: [
            ]
          },
          {
            name: '',
            grade: '',
            school: '',
            teacher: 'Mr. Test',
            requestedSupplies: [
            ]
          }
        ]
      };

      cy.intercept('/api/family').as('updateFamily');
      page.updateFamily(formInfo);
      cy.wait('@updateFamily');
      cy.log('API intercepted, checking URL...');

      // New URL should go right back to the family list page (/family)
      cy.wait('@updateFamily');
      cy.url({ timeout: 3000 })
        .should('match', /\/family$/)

      // Wait for at least one family card
      cy.get('.family-card', { timeout: 10000 })
        .should('have.length.greaterThan', 0);

      // Valid test family information
      cy.get('.family-card-guardianName')
        .contains(expectedFamily.guardianName)
        .should('exist');

      cy.get('.family-card-address')
        .contains(expectedFamily.address)
        .should('exist');

      cy.get('.family-card-email')
        .contains(expectedFamily.email)
        .should('exist');

      cy.get('.family-card-timeSlot')
        .contains(expectedFamily.timeSlot)
        .should('exist');

      // We should see the confirmation message at the bottom of the screen
      page.getSnackBar().should('contain', `Updated family ${expectedFamily.guardianName}`);
    });
  });
});
