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
        { label: 'Chokio-Alberta High School', value: '2'},
        { label: 'Hancock High School', value: '4'},
        { label: 'Herman-Norcross High School', value: '2'},
        { label: 'Herman-Norcross Middle School', value: '2'},
        { label: 'Morris Area Elementary School', value: '4'},
        { label: 'Morris Area High School', value: '4'},
        { label: 'Morris Area Middle School', value: '3'},
      ];

      page.getStudentsPerSchool().each((e, i) => {
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

  describe('Filter', () => {
    it('Should have specification filters', () => {
      page.getSidenavButton().click();
      page.getNavLink('Families').click();
      cy.url().should('match', /\/family$/);

      const errors: string[] = [];

      const recordError = (message: string) => {
        errors.push(message);
        cy.log(message);
        console.warn(message);
      }

      cy.get('body').then(($body) => {
        if ($body.find('[data-cy="filter-family"]').length === 0) {
          recordError(`Empty filter input for family`);
        }
      });

      cy.then(() => {
        if (errors.length > 0) {
          throw new Error(errors.join('\n'));
        }
      });
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
        { name: 'Name: Tim', school: 'School: MAHS', grade: 'Grade: 12', teacher: 'Teacher: N/A'},
        { name: 'Name: Sara', school: 'School: MAHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
        { name: 'Name: Johnny Jr.', school: 'School: HHS', grade: 'Grade: 9', teacher: 'Teacher: N/A'},
        { name: 'Name: Burtrum', school: 'School: HHS', grade: 'Grade: 10', teacher: 'Teacher: N/A'},
        { name: 'Name: Harold', school: 'School: HHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
        { name: 'Name: Timothy', school: 'School: CAHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
        { name: 'Name: Sarah', school: 'School: CAHS', grade: 'Grade: 9', teacher: 'Teacher: N/A'},
        { name: 'Name: Alyssa', school: 'School: MAMS', grade: 'Grade: 8', teacher: 'Teacher: N/A'},
        { name: 'Name: Kevin', school: 'School: HNHS', grade: 'Grade: 10', teacher: 'Teacher: N/A'},
        { name: 'Name: Lily', school: 'School: HNMS', grade: 'Grade: 7', teacher: 'Teacher: N/A'},
        { name: 'Name: Chris', school: 'School: MAHS', grade: 'Grade: 12', teacher: 'Teacher: N/A'},
        { name: 'Name: Derek', school: 'School: HNHS', grade: 'Grade: 9', teacher: 'Teacher: N/A'},
        { name: 'Name: Maya', school: 'School: HNMS', grade: 'Grade: 6', teacher: 'Teacher: N/A'},
        { name: 'Name: Elena', school: 'School: MAHS', grade: 'Grade: 11', teacher: 'Teacher: N/A'},
        { name: 'Name: Lucas', school: 'School: MAES', grade: 'Grade: 5', teacher: 'Teacher: N/A'}
      ];

      page.getStudentCards().each((e, i) => {
        cy.wrap(e).find('.student-name').should('have.text', expectedValuesStudent[i].name);
        cy.wrap(e).find('.student-school').should('have.text', expectedValuesStudent[i].school);
        cy.wrap(e).find('.student-grade').should('have.text', expectedValuesStudent[i].grade);
        cy.wrap(e).find('.student-teacher').should('have.text', expectedValuesStudent[i].teacher);
      });
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

  describe('Export menu', () => {
    it('Should have an export button that opens the export menu', () => {
      page.getFamilyCards().should('have.length', 8);
      page.toggleExportMenu();
      cy.get('[data-cy="export-menu-toggle"]').should('be.visible');
    });

    it('Should have an export menu with a button to export CSV', () => {
      page.toggleExportMenu();
      page.exportCSVButton().should('be.visible');
    });

    it('Should have an export menu with a button to export PDF', () => {
      page.toggleExportMenu();
      page.exportPDFButton().should('be.visible');
    });
  });

});
