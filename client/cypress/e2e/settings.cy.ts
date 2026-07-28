import { SettingsPage } from 'cypress/support/settings.po';

describe('Settings', () => {
  const page = new SettingsPage();

  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    cy.loginAsRole('admin');
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getTitle().should('have.text', 'Settings')
  })

  describe('Time Availability', () => {

    it('Should not show the removed Available Spots tab', () => {
      page.getAvailableSpotsTab().should('not.exist');
    });

    it('Should keep schedule column controls in the Time Availability tab', () => {
      page.getTimeAvailabilityTab().should('exist');
      page.getTimeAvailabilityTab().click();

      page.getFormField('englishFamilies').should('exist');
      page.getFormField('spanishFamilies').should('exist');
      page.getFormField('availableSpots').should('not.exist');
    });
  });

  describe('Inventory Management Tab', () => {

    it('Should have Inventory Management tab', () => {
      page.getInventoryTab().should('exist');
      page.getInventoryTab().click();
      cy.contains('Inventory Management').should('be.visible');
    });

    it('Should have the filters', () => {
      page.getInventoryTab().click();
      page.getFilterItem().should('exist');
      page.getFilterBrand().should('exist');
      page.getFilterColor().should('exist');
      page.getFilterSize().should('exist');
      page.getFilterType().should('exist');
      page.getFilterMaterial().should('exist');
    });

    it('Should have the clear filter button', () => {
      page.getInventoryTab().click();
      page.getInventoryFilterClear().should('exist');
    });

    it('Should have the clear inventory button', () => {
      page.getInventoryTab().click();
      page.getClearInventoryButton().should('exist');
    });

    it('Should have the delete matching inventory button', () => {
      page.getInventoryTab().click();
      page.getDeleteMatchingInventoryButton().should('exist');
    });

    it('Should have the reset all quantity button', () => {
      page.getInventoryTab().click();
      page.getResetAllQuantityButton().should('exist');
    });

    it('Should have the reset matching quantity button', () => {
      page.getInventoryTab().click();
      page.getResetMatchingQuantityButton().should('exist');
    });
  });
});
