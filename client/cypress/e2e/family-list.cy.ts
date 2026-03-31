import { FamilyListPage } from '../support/family-list.po';

const page = new FamilyListPage();

describe('Family list', () => {

  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getFamilyTitle().should('have.text', 'Families');
  });

  it('Should have the dashboard displayed', () => {
    page.getDashbord().should('exist')
  });

  it('Should have the dashboard display the correct number of families', () => {
    page.getTotalFamilies().should('contain.text', '3')
  });

  it('Should have the dashboard display the correct number of students', () => {
    page.getTotalStudents().should('contain.text', '7')
  });

  // it('Should have the dashboard display the correct number of students per school', () => {
  //   page.getStudentsPerSchool().each(e => {
  //     cy.wrap(e).find('.stat-label').should('have.text', 'HHS');
  //     cy.wrap(e).find('.stat-value').should('have.text', '3');
  //   });
  // });

  // it('Should have the dashboard display the correct number of students per grade', () => {
  //   page.getStudentsPerGrade().each(e => {
  //     cy.wrap(e).find('.stat-label').should('have.text', 'Grade: 10');
  //     cy.wrap(e).find('.stat-value').should('have.text', '1');
  //   });
  // });

  it('Should show 3 families in card view', () => {
    page.getFamilyCards().should('have.length', 3);
  });

  it('Should click add family and go to the right URL', () => {
    // Click on the button for adding a new family
    page.addFamilyButton().click();

    // The URL should end with '/families/new'
    cy.url().should(url => expect(url.endsWith('/family/new')).to.be.true);

    // On the page we were sent to, we should see the right title
    cy.get('.add-family-title').should('have.text', 'New Family');
  });

});
