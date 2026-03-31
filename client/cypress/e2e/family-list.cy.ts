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
    page.getDashboard().should('exist')
  });

  it('Should have the dashboard display the correct number of families', () => {
    page.getTotalFamilies().should('contain.text', '3')
  });

  it('Should have the dashboard display the correct number of students', () => {
    page.getTotalStudents().should('contain.text', '7')
  });

  it('Should have the dashboard display the correct number of students per school', () => {
    const expectedValuesSchool = [
      { label: 'HHS', value: '3'},
      { label: 'MAHS', value: '4'}
    ];

    page.getStudentsPerSchool().each((e, i) => {
      cy.wrap(e).find('.stat-label').should('have.text', expectedValuesSchool[i].label);
      cy.wrap(e).find('.stat-value').should('have.text', expectedValuesSchool[i].value);
    });
  });

  it('Should have the dashboard display the correct number of students per grade', () => {
    const expectedValuesGrade = [
      { label: 'Grade: 10', value: '1'},
      { label: 'Grade: 11', value: '3'},
      { label: 'Grade: 12', value: '1'},
      { label: 'Grade: 9', value: '2'}
    ];

    page.getStudentsPerGrade().each((e, i) => {
      cy.wrap(e).find('.stat-label').should('have.text', expectedValuesGrade[i].label);
      cy.wrap(e).find('.stat-value').should('have.text', expectedValuesGrade[i].value);
    });
  });

  it('Should show 3 families in card view', () => {
    page.getFamilyCards().should('have.length', 3);
  });

  it('Should show students cards with the right information', () => {
    const expectedValuesStudent = [
      { name: 'Name: Tim', school: 'School: MAHS', grade: 'Grade: 12', teacher: 'Teacher: N/A'},
      { name: 'Name: Sara', school: 'School: MAHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
      { name: 'Name: Johnny Jr.', school: 'School: HHS', grade: 'Grade: 9', teacher: 'Teacher: N/A'},
      { name: 'Name: Burtrum', school: 'School: HHS', grade: 'Grade: 10', teacher: 'Teacher: N/A'},
      { name: 'Name: Harold', school: 'School: HHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
      { name: 'Name: Timothy', school: 'School: MAHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
      { name: 'Name: Sarah', school: 'School: MAHS', grade: 'Grade: 9', teacher: 'Teacher: N/A'}
    ];

    page.getStudentCards().each((e, i) => {
      cy.wrap(e).find('.student-name').should('have.text', expectedValuesStudent[i].name);
      cy.wrap(e).find('.student-school').should('have.text', expectedValuesStudent[i].school);
      cy.wrap(e).find('.student-grade').should('have.text', expectedValuesStudent[i].grade);
      cy.wrap(e).find('.student-teacher').should('have.text', expectedValuesStudent[i].teacher);
    });
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
