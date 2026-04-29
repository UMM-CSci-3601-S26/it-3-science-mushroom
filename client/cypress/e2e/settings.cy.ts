import { SettingsPage } from 'cypress/support/settings.po';

describe('Settings', () => {
  const page = new SettingsPage();

  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getTitle().should('have.text', 'Settings')
  })

  describe('Available Spots', () => {

    it('Should have Available Spots tab', () => {
      page.getTab().should('exist');
      page.getTab().click();
      //used cypress recording lab to figure out what the tab label was
      cy.contains('Set the number of available spots').should('be.visible');
    });

    it('Should allow typing in the Available Spots Form', () => {
      page.getTab().click();
      page.getFormField('availableSpots').clear();
      page.getFormField('availableSpots').type('84');
    });

    it('Should disable the save button if the form is invalid', () => {
      page.getTab().click();

      page.getFormField('availableSpots').clear();
      page.getSaveButton().should('be.disabled');
      page.getFormField('availableSpots').type('84');
      page.getSaveButton().should('be.enabled');
    });

    it('Should save Available Spots input', () => {
      page.getTab().click();

      page.getFormField('availableSpots').clear();

      page.getFormField('availableSpots').type('84');
      cy.get('[data-test="saveButton"]').click();

      cy.get('.mat-mdc-simple-snack-bar')
        .should('be.visible')
        .and('contain.text', 'Available spots setting saved');
    });

    it('Should schedule families', () => {
      page.getTab().click();

      page.getFormField('availableSpots').clear();

      page.getFormField('availableSpots').type('84');
      cy.get('[data-test="scheduleFamiliesButton"]').click();

      cy.get('.mat-mdc-simple-snack-bar')
        .should('be.visible')
        .and('contain.text', 'Families scheduled');

      cy.get('.mat-mdc-card-title').should('have.text', 'Families');

    });

    it('Should have error when scheduling families with low capacity', () => {
      page.getTab().click();

      page.getFormField('availableSpots').clear();

      page.getFormField('availableSpots').type('2');
      cy.get('[data-test="scheduleFamiliesButton"]').click();

      cy.get('.mat-mdc-simple-snack-bar')
        .should('be.visible')
        .and('contain.text', 'Your capacity is too low for the number of families');
    });
  });
});
