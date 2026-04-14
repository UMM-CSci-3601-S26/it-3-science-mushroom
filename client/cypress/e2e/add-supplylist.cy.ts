import { AddSupplyListPage } from '../support/add-supplylist.po';

const page = new AddSupplyListPage();

const TARGET_GROUP = {
  school: 'Hancock Elementary',
  grade: 'Kindergarten',
  teacher: 'N/A'
};

const NEW_ITEM = {
  item: 'E2E Supply Notebook',
  brand: 'Five Star',
  color: 'Blue',
  quantity: '2',
  count: '1',
  notes: 'Created by Cypress add-supply test'
};

describe('Add Supply List Item', () => {
  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    page.navigateTo();
    page.expandGradePanel(TARGET_GROUP.school, TARGET_GROUP.grade);
  });

  it('Should navigate to the add-supply form from the supply list page', () => {
    page.getGradePanel(TARGET_GROUP.school, TARGET_GROUP.grade)
      .find('[data-cy="add-item-button"]')
      .click();

    cy.url().should('include', '/supplylist/new');
    cy.url().should('include', `school=${encodeURIComponent(TARGET_GROUP.school)}`);
    cy.url().should('include', `grade=${encodeURIComponent(TARGET_GROUP.grade)}`);
    page.getTitle().should('contain', 'New Supply List Item');
    page.getSubmitButton().should('be.disabled');
  });

  it('Should create a new supply list item and return to the supply list page', () => {
    cy.intercept('POST', '/api/supplylist').as('addSupplyItem');

    page.getGradePanel(TARGET_GROUP.school, TARGET_GROUP.grade)
      .find('[data-cy="add-item-button"]')
      .click();

    page.getField('item-input').type(NEW_ITEM.item);
    page.getField('brand-input').type(NEW_ITEM.brand);
    page.getField('color-input').type(NEW_ITEM.color);
    page.getField('quantity-input').clear().type(NEW_ITEM.quantity);
    page.getField('count-input').clear().type(NEW_ITEM.count);
    page.getField('notes-input').type(NEW_ITEM.notes);

    page.getSubmitButton().should('not.be.disabled').click();

    cy.wait('@addSupplyItem').then(({ request }) => {
      expect(request.body.school).to.equal(TARGET_GROUP.school);
      expect(request.body.grade).to.equal(TARGET_GROUP.grade);
      expect(request.body.item).to.deep.equal([NEW_ITEM.item]);
      expect(request.body.brand.allOf).to.equal(NEW_ITEM.brand);
      expect(request.body.color.allOf).to.deep.equal([NEW_ITEM.color]);
      expect(request.body.quantity).to.equal(2);
      expect(request.body.count).to.equal(1);
      expect(request.body.notes).to.equal(NEW_ITEM.notes);
    });

    cy.url().should('match', /\/supplylist$/);
    page.getSnackBar().should('contain', 'Added supply list item');

    cy.intercept('GET', '/api/supplylist*').as('getFilteredSupplyList');
    cy.get('[data-cy="filter-school"]').type('Hancock');
    cy.get('[data-cy="filter-grade"]').type(TARGET_GROUP.grade);
    cy.get('[data-cy="filter-item"]').type(NEW_ITEM.item);
    cy.wait('@getFilteredSupplyList');

    page.expandGradePanel(TARGET_GROUP.school, TARGET_GROUP.grade);
    page.getTeacherGroup(TARGET_GROUP.school, TARGET_GROUP.grade, TARGET_GROUP.teacher)
      .should('contain', NEW_ITEM.item);
  });

  describe('Form behaviour (direct navigation)', () => {
    beforeEach(() => {
      page.navigateToFormWithParams(TARGET_GROUP.school, TARGET_GROUP.grade);
    });

    it('Should have the correct title', () => {
      page.getTitle().should('have.text', 'New Supply List Item');
    });

    it('Should disable the submit button when required fields are empty', () => {
      page.getSubmitButton().should('be.disabled');
      page.getField('item-input').type('Notebook');
      page.getSubmitButton().should('be.disabled');
      page.getField('quantity-input').clear().type('2');
      page.getSubmitButton().should('not.be.disabled');
    });

    it('Should show an error message when the item field is left empty', () => {
      cy.get('[data-cy="item-error"]').should('not.exist');
      page.getField('item-input').click().blur();
      cy.get('[data-cy="item-error"]').should('exist').and('contain', 'Item is required');
      page.getField('item-input').type('Notebook').blur();
      cy.get('[data-cy="item-error"]').should('not.exist');
    });

    it('Should show an error when quantity is less than 1', () => {
      page.getField('quantity-input').clear().type('0').blur();
      cy.get('[data-cy="quantity-error"]').should('exist').and('contain', 'Quantity must be at least 1');
      page.getField('quantity-input').clear().type('3').blur();
      cy.get('[data-cy="quantity-error"]').should('not.exist');
    });

    it('Should clear form fields when Clear is clicked', () => {
      page.getField('item-input').type('E2E Test Item');
      page.getField('brand-input').type('TestBrand');
      page.getClearButton().click();
      page.getField('item-input').should('have.value', '');
      page.getField('brand-input').should('have.value', '');
    });

    it('Should navigate back to the supply list when Cancel is clicked', () => {
      page.getCancelButton().click();
      cy.url().should('match', /\/supplylist$/);
    });

    it('Should show the preview card after parsing a description', () => {
      page.getPreviewCard().should('not.exist');
      cy.get('[data-cy="description-input"]').type('2 notebooks');
      cy.get('[data-cy="autofill-button"]').click();
      page.getPreviewCard().should('exist');
      page.getPreviewCard().should('contain', TARGET_GROUP.grade);
    });
  });
});
