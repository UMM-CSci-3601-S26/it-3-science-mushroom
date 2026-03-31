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

  it('Should have the dashboard display the correct number of students per school', () => {
    const expectedValues = [
      { label: 'HHS', value: '3'},
      { label: 'MAHS', value: '4'}
    ];

    page.getStudentsPerSchool().each((e, i) => {
      cy.wrap(e).find('.stat-label').should('have.text', expectedValues[i].label);
      cy.wrap(e).find('.stat-value').should('have.text', expectedValues[i].value);
    });
  });

  it('Should have the dashboard display the correct number of students per grade', () => {
    const expectedValues = [
      { label: 'Grade: 10', value: '1'},
      { label: 'Grade: 11', value: '3'},
      { label: 'Grade: 12', value: '1'},
      { label: 'Grade: 9', value: '2'}
    ];

    page.getStudentsPerGrade().each((e, i) => {
      cy.wrap(e).find('.stat-label').should('have.text', expectedValues[i].label);
      cy.wrap(e).find('.stat-value').should('have.text', expectedValues[i].value);
    });
  });

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
