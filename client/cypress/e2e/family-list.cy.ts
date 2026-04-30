import { FamilyListPage } from '../support/family-list.po';

const page = new FamilyListPage();

describe('Family list', () => {

  before(() => {
    cy.task('seed:database');
  });

  beforeEach(() => {
    cy.loginAsRole('admin');
    page.navigateTo();
  });

  it('Should have the correct title', () => {
    page.getFamilyTitle().should('have.text', 'Families');
  });

  describe('Dashboard', () => {
    it('Should have the dashboard displayed', () => {
      page.getDashboard().should('exist')
    });

    it('Should have the dashboard display the correct number of families', () => {
      page.getTotalFamilies().should('contain.text', '11')
    });

    it('Should have the dashboard display the correct number of students', () => {
      page.getTotalStudents().should('contain.text', '21')
    });

    it('Should have the dashboard display the correct number of students per school', () => {
      const expectedValuesSchool = [
        { label: 'Chokio-Alberta High School', value: '3'},
        { label: 'Hancock Elementary School', value: '2'},
        { label: 'Hancock High School', value: '6'},
        { label: 'Herman-Norcross Elementary School', value: '2'},
        { label: 'Herman-Norcross High School', value: '6'},
        { label: 'Morris Area Elementary School', value: '2'},
      ];

      page.getStudentsPerSchool().should('have.length', expectedValuesSchool.length)
        .each((e, i) => {
          cy.wrap(e).find('.stat-label').should('have.text', expectedValuesSchool[i].label);
          cy.wrap(e).find('.stat-value').should('have.text', expectedValuesSchool[i].value);
        });
    });

    it('Should have the dashboard display the correct number of students per grade', () => {
      const expectedValuesGrade = [
        { label: 'Grade: PreK', value: '1'},
        { label: 'Grade: Kindergarten', value: '1'},
        { label: 'Grade: 3', value: '1'},
        { label: 'Grade: 5', value: '1'},
        { label: 'Grade: 6', value: '2'},
        { label: 'Grade: 7', value: '1'},
        { label: 'Grade: 8', value: '2'},
        { label: 'Grade: 9', value: '3'},
        { label: 'Grade: 10', value: '3'},
        { label: 'Grade: 11', value: '4'},
        { label: 'Grade: 12', value: '2'}
      ];

      page.getStudentsPerGrade().each((e, i) => {
        cy.wrap(e).find('.stat-label').should('have.text', expectedValuesGrade[i].label);
        cy.wrap(e).find('.stat-value').should('have.text', expectedValuesGrade[i].value);
      });
    });
  });

  describe('Options menu', () => {
    it('Should have an options button that opens the options menu', () => {
      page.getFamilyCards().should('have.length', 8);
      page.toggleOptionsMenu();
      cy.get('[data-cy="options-menu-toggle"]').should('be.visible');
    });

    it('Should have an options menu with a button to export CSV', () => {
      page.toggleOptionsMenu();
      page.exportCSVButton().should('be.visible');
    });

    it('Should have an options menu with a button to export PDF', () => {
      page.toggleOptionsMenu();
      page.exportPDFButton().should('be.visible');
    });

    it('Should have an options menu with a button to add a family', () => {
      page.toggleOptionsMenu();
      page.addFamilyButton().should('be.visible');
    });
  });

  describe('Filter', () => {
    it('Should have specification filters', () => {
      page.getSidenavButton().click();
      page.getNavLink('Families').click();
      cy.url().should('match', /\/family$/);

      page.getFilterFamily().should('exist');
    });

    it("Should be able to take an input and display the correct filtered results", () => {
      page.getSidenavButton().click();
      page.getNavLink('Families').click();
      cy.url().should('match', /\/family$/);

      page.getFilterFamily().type("John Doe");

      cy.wait(100);

      page.getFamilyName().should('contain', 'John Doe');
      page.getFamilyCards().should('have.length', 1)
    });

    describe("autocomplete dropdown filters", () => {
      beforeEach(() => {
        page.getFilterFamily().clear();
      });

      it("should show autocomplete options when typing in filter", () => {
        page.getFilterFamily().type("John");
        cy.get('mat-option').should('exist');
        cy.get('mat-option').should('contain', 'John');
      });

      it('Should narrow autocomplete options as the user types more characters', () => {
        page.getFilterFamily().type('Jan');
        cy.get('mat-option').its('length').then((broadCount) => {
          page.getFilterFamily().clear().type('Jane');
          cy.get('mat-option').its('length').should('be.lte', broadCount);
        });
      });

      it('Should show no autocomplete options when input matches nothing', () => {
        page.getFilterFamily().type('imaginaryName');
        cy.get('mat-option').should('not.exist');
      });

      it('Should filter results when selecting an autocomplete option for Family', () => {

        page.selectAutoCompleteOption('[data-cy="filter-family"]', 'Jane Doe');
        page.getFamilyName().first().should('have.text', 'Jane Doe');
      });
    });
  });

  describe('Family Cards', () => {
    // With the default pagination settings, there should be 8 families displayed in card view
    it('Should show 8 families in card view', () => {
      page.getFamilyCards().should('have.length', 8);
    });

    it('Should show students cards with the right information', () => {
      const expectedValuesStudent = [
        { name: 'Name: Tim', school: 'School: HHS', grade: 'Grade: 12', teacher: 'Teacher: N/A'},
        { name: 'Name: Sara', school: 'School: HHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
        { name: 'Name: Johnny Jr.', school: 'School: HNHS', grade: 'Grade: 9', teacher: 'Teacher: N/A'},
        { name: 'Name: Burtrum', school: 'School: HNHS', grade: 'Grade: 10', teacher: 'Teacher: N/A'},
        { name: 'Name: Harold', school: 'School: HNHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
        { name: 'Name: Timothy', school: 'School: HHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
        { name: 'Name: Sarah', school: 'School: HHS', grade: 'Grade: 9', teacher: 'Teacher: N/A'},
        { name: 'Name: Alyssa', school: 'School: CAHS', grade: 'Grade: 8', teacher: 'Teacher: N/A'},
        { name: 'Name: Kevin', school: 'School: HNHS', grade: 'Grade: 10', teacher: 'Teacher: N/A'},
        { name: 'Name: Lily', school: 'School: CAHS', grade: 'Grade: 7', teacher: 'Teacher: N/A'},
        { name: 'Name: Chris', school: 'School: HHS', grade: 'Grade: 12', teacher: 'Teacher: N/A'},
        { name: 'Name: Derek', school: 'School: HNHS', grade: 'Grade: 9', teacher: 'Teacher: N/A'},
        { name: 'Name: Maya', school: 'School: HNES', grade: 'Grade: 6', teacher: 'Teacher: N/A'},
        { name: 'Name: Elena', school: 'School: HHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
        { name: 'Name: Lucas', school: 'School: HES', grade: 'Grade: 5', teacher: 'Teacher: N/A'}
      ];

      page.getStudentCards().should('have.length', expectedValuesStudent.length)
        .each((e, i) => {
          cy.wrap(e).find('[matlistitemtitle]').should('have.text', expectedValuesStudent[i].name.replace('Name: ', ''));
          cy.wrap(e).find('[matlistitemline]').eq(0).should(
            'have.text',
            `${expectedValuesStudent[i].school.replace('School: ', '')} - ${expectedValuesStudent[i].grade.replace('Grade: ', 'Grade ')}`
          );
          cy.wrap(e).find('[matlistitemline]').eq(1).should('have.text', expectedValuesStudent[i].teacher);
        });
    });
  });

  it('Should click add family and go to the right URL', () => {
    page.toggleOptionsMenu();
    // Click on the button for adding a new family
    page.addFamilyButton().click();

    // The URL should end with '/families/new'
    cy.url().should(url => expect(url.endsWith('/family/new')).to.be.true);

    // On the page we were sent to, we should see the right title
    cy.get('.add-family-title').should('have.text', 'New Family');
  });

});
