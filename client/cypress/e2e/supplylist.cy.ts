import { SupplyListPage } from "../support/supplylist.po";

const page = new SupplyListPage();
const FILTERS_TEST = {
  school: 'Hancock',
  grade: 'Kindergarten',
};

const HANCOCK_GROUP = {
  school: 'Hancock Elementary',
  grade: 'Kindergarten',
  teacher: 'N/A',
  item: 'Binder',
};

describe('Supply List', () => {
  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    cy.loginAsRole('admin');
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getAppTitle().should('contain', 'Supply List');
  });

  it('The sidenav should open, navigate to "Supply List" and back to "Home"', () => {
    // Before clicking on the button, the sidenav should be hidden
    page.getSidenav()
      .should('be.hidden');
    page.getSidenavButton()
      .should('be.visible');

    page.getSidenavButton().click();
    page.getNavLink('Supply List').click();
    cy.url().should('match', /\/supplylist$/);
    page.getSidenav()
      .should('be.hidden');

    page.getSidenavButton().click();
    page.getNavLink('Home').click();
    cy.url().should('match', /^https?:\/\/[^/]+\/?$/);
    page.getSidenav()
      .should('be.hidden');
  });

  it('Should display Supply List items', () => {
    page.getSidenavButton().click();
    page.getNavLink('Supply List').click();
    cy.url().should('match', /\/supplylist$/);
    page.getSidenav()
      .should('be.hidden');
    page.getResultsCard().should('contain', 'Hancock Elementary');
  });

  // Cypress tests to ensure the filter boxes are there
  // for all specification fields

  it('Should have specification filters', () => {
    page.getSidenavButton().click();
    page.getNavLink('Supply List').click();
    cy.url().should('match', /\/supplylist$/);

    const errors: string[] = [];

    const recordError = (message: string) => {
      errors.push(message);
      cy.log(message);
      console.warn(message);
    }
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="filter-school"]').length === 0) {
        recordError(`Empty filter input for School`);
      }
      if ($body.find('[data-cy="filter-item"]').length === 0) {
        recordError(`Empty filter input for Item`);
      }
      if ($body.find('[data-cy="filter-brand"]').length === 0) {
        recordError(`Empty filter input for Brand`);
      }
      if ($body.find('[data-cy="filter-color"]').length === 0) {
        recordError(`Empty filter input for Color`);
      }
      if ($body.find('[data-cy="filter-size"]').length === 0) {
        recordError(`Empty filter input for Size`);
      }
      if ($body.find('[data-cy="filter-type"]').length === 0) {
        recordError(`Empty filter input for Type`);
      }
      if ($body.find('[data-cy="filter-material"]').length === 0) {
        recordError(`Empty filter input for Material`);
      }
    });

    cy.then(() => {
      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }
    });
  });

  it('Should have grade filter', () => {
    page.getSidenavButton().click();
    page.getNavLink('Supply List').click();
    cy.url().should('match', /\/supplylist$/);

    const errors: string[] = [];

    const recordError = (message: string) => {
      errors.push(message);
      cy.log(message);
      console.warn(message);
    }
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="filter-grade"]').length === 0) {
        recordError(`Empty filter input for Grade`);
      }
    });
  });

  it("Should be able to take an input and display the correct filtered results", () => {
    cy.intercept('GET', '/api/supplylist*').as('filterSupplyList');

    cy.get('[data-cy="filter-school"]').type(FILTERS_TEST.school);
    cy.get('[data-cy="filter-grade"]').type(FILTERS_TEST.grade);

    cy.wait('@filterSupplyList');

    page.getSupplyListSchool().should('have.length', 1);
    page.getResultsCard().should('contain', HANCOCK_GROUP.school);
    page.getResultsCard().should('not.contain', 'Chokio-Alberta Elementary');
    page.expandGradePanel(HANCOCK_GROUP.school, HANCOCK_GROUP.grade);
    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .should('exist');
    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .should('contain', HANCOCK_GROUP.item);
    page.getResultsCard().should('not.contain', '1st Grade');
  });

  it('Should have the tree view', () => {
    page.getResultsCard().should('exist');
    page.getSupplyListSchool().its('length').should('be.greaterThan', 0);
  });

  it('Should display grouped items when a grade panel is expanded', () => {
    page.expandGradePanel(HANCOCK_GROUP.school, HANCOCK_GROUP.grade);
    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .should('contain', 'Teacher(s):');
    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .should('contain', 'Backpack');
    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .should('contain', HANCOCK_GROUP.item);
  });

  it('Should enter inline edit mode when edit is clicked', () => {
    page.expandGradePanel(HANCOCK_GROUP.school, HANCOCK_GROUP.grade);
    page.getFirstItemRow(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .scrollIntoView()
      .find('[data-cy="edit-item"]')
      .click();

    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .find('[data-cy="save-item"]')
      .should('be.visible');
    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .find('[data-cy="cancel-edit"]')
      .should('be.visible');
  });

  it('Should leave inline edit mode when Cancel is clicked', () => {
    page.expandGradePanel(HANCOCK_GROUP.school, HANCOCK_GROUP.grade);
    page.getFirstItemRow(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .scrollIntoView()
      .find('[data-cy="edit-item"]')
      .click();

    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .find('[data-cy="cancel-edit"]')
      .click();

    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .find('[data-cy="edit-item"]')
      .should('be.visible');
    page.getTeacherGroup(HANCOCK_GROUP.school, HANCOCK_GROUP.grade, HANCOCK_GROUP.teacher)
      .find('[data-cy="save-item"]')
      .should('not.exist');
  });
});
