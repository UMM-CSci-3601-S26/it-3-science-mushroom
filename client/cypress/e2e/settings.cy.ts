import { SettingsPage } from 'cypress/support/settings.po';

describe('Settings', () => {
  const page = new SettingsPage();

  beforeEach(() => {
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getTitle().should('have.text', 'Settings')
  })

  describe('Available Spots', () => {

    it('Should have Available Spots tab', () => {
      cy.contains('#mat-tab-group-0-label-2', 'Available Spots').click();
      //used cypress recording lab to figure out what the tab label was
      cy.contains('Set the number of available spots').should('be.visible');
    });

    it('Should allow typing in the Available Spots Form', () => {
      cy.contains('#mat-tab-group-0-label-2', 'Available Spots').click();
      page.getFormField('availableSpots').type('{backspace}{backspace}')
      page.getFormField('availableSpots').type('84');
    });

    it('Should disable the save button if the form is invalid', () => {
      cy.contains('#mat-tab-group-0-label-2', 'Available Spots').click();

      page.getFormField('availableSpots').type('{backspace}{backspace}')
      page.getSaveButton().should('be.disabled');
      page.getFormField('availableSpots').type('84');
      page.getSaveButton().should('be.enabled');
    });

    it('Should save Available Spots input', () => {
      cy.contains('#mat-tab-group-0-label-2', 'Available Spots').click();

      page.getFormField('availableSpots').type('{backspace}{backspace}')

      page.getFormField('availableSpots').type('84');
      cy.get('[data-test="saveButton"]').click();

      cy.get('.mat-mdc-simple-snack-bar')
        .should('be.visible')
        .and('contain.text', 'Available spots setting saved');
    });
  });
});
