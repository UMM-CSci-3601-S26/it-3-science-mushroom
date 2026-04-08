//import { FamilyRole } from 'src/app/family/family';

export class FamilyListPage {
  private readonly baseUrl = '/family';
  private readonly pageTitle = '.family-list-title';
  private readonly familyCardSelector = '.family-cards-container app-family-card';
  private readonly familyListItemsSelector = '.family-nav-list .family-list-item';
  private readonly familyDashboard = '.dashboard-grid'
  private readonly familyGuardianName = '.family-card-guardianName'
  private readonly totalFamiliesNum = '.stat-number-family'
  private readonly totalStudentsNum = '.stat-number-student'
  private readonly studentsPerSchool = '.stat-row-school'
  private readonly studentsPerGrade = '.stat-row-grade'
  private readonly studentCardSelector = '.student-cards';
  //private readonly profileButtonSelector = '[data-test=viewProfileButton]';
  //private readonly radioButtonSelector = '[data-test=viewTypeRadio] mat-radio-button';
  //private readonly familyRoleDropdownSelector = '[data-test=familyRoleSelect]';
  private readonly dropdownOptionSelector = 'mat-option';
  private readonly addFamilyButtonSelector = '[data-test=addFamilyButton]';
  private readonly familyFilterSelector = '[data-cy="filter-family"]'
  private readonly sideNavButton = '.sidenav-button';
  private readonly sideNav = '.sidenav';
  private readonly sideNavOption = '[routerlink] > .mdc-list-item__content';

  navigateTo() {
    return cy.visit(this.baseUrl);
  }

  getSidenavButton() {
    return cy.get(this.sideNavButton)
  }

  getSidenav() {
    return cy.get(this.sideNav);
  }

  getNavLink(navOption: 'Home' | 'Families') {
    return cy.contains(this.sideNavOption, `${navOption}`);
  }

  /**
   * Gets the title of the app when visiting the `/families` page.
   *
   * @returns the value of the element with the ID `.family-list-title`
   */
  getFamilyTitle() {
    return cy.get(this.pageTitle);
  }

  getFamilyName() {
    return cy.get(this.familyGuardianName)
  }

  /**
   * Get all the `app-family-card` DOM elements. This will be
   * empty if we're using the list view of the families.
   *
   * @returns an iterable (`Cypress.Chainable`) containing all
   *   the `app-family-card` DOM elements.
   */
  getFamilyCards() {
    return cy.get(this.familyCardSelector);
  }

  /**
   * Gets the dashboard element of the app when visiting the `/families` page.
   *
   * @returns the value of the element with the ID `.family-list-title`
   */
  getDashboard() {
    return cy.get(this.familyDashboard)
  }

  /**
   * Gets the total number of families value in the dashboard when visiting the `/families` page.
   *
   * @returns the value of the element with the ID `.family-list-title`
   */
  getTotalFamilies() {
    return cy.get(this.totalFamiliesNum)
  }

  /**
   * Gets the total number of students value in the dashboard when visiting the `/families` page.
   *
   * @returns the value of the element with the ID `.family-list-title`
   */
  getTotalStudents() {
    return cy.get(this.totalStudentsNum)
  }

  /**
   * Gets the list of schools and total number of students attending when visiting the `/families` page.
   *
   * @returns the value of the element with the ID `.family-list-title`
   */
  getStudentsPerGrade() {
    return cy.get(this.studentsPerGrade
    )
  }

  /**
   * Gets the list of grades and total number of student in each when visiting the `/families` page.
   *
   * @returns the value of the element with the ID `.family-list-title`
   */
  getStudentsPerSchool() {
    return cy.get(this.studentsPerSchool)
  }

  /**
   * Gets all the student cards when visiting the `/families` page.
   *
   * @returns the value of the element with the ID `.family-list-title`
   */
  getStudentCards() {
    return cy.get(this.studentCardSelector)
  }

  getFilterFamily() {
    return cy.get(this.familyFilterSelector)
  }

  selectAutoCompleteOption(filterSelector: string, text: string) {
    cy.get(filterSelector).clear().type(text);

    cy.get('.cdk-overlay-pane span.mdc-list-item__primary-text')
      .should('have.length.greaterThan', 0)
      .then(($spans) => {
        const normalize = (str: string) =>
          str.replace(/\s+/g, ' ').trim();

        const match = [...$spans].find(
          (el) => normalize(el.innerText) === normalize(text)
        );

        if (!match) {
          throw new Error(`Exact match for "${text}" not found`);
        }

        cy.wrap(match).click();
      });
  }

  /**
   * Get all the `.family-list-item` DOM elements. This will
   * be empty if we're using the card view of the families.
   *
   * @returns an iterable (`Cypress.Chainable`) containing all
   *   the `.family-list-item` DOM elements.
   */
  getFamilyListItems() {
    return cy.get(this.familyListItemsSelector);
  }

  addFamilyButton() {
    return cy.get(this.addFamilyButtonSelector);
  }
}
