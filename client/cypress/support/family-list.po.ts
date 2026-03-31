//import { FamilyRole } from 'src/app/family/family';

export class FamilyListPage {
  private readonly baseUrl = '/family';
  private readonly pageTitle = '.family-list-title';
  private readonly familyCardSelector = '.family-cards-container app-family-card';
  private readonly familyListItemsSelector = '.family-nav-list .family-list-item';
  private readonly familyDashboard = '.dashboard-grid'
  private readonly totalFamiliesNum = '.stat-number-family'
  private readonly totalStudentsNum = '.stat-number-student'
  private readonly studentsPerSchool = '.stat-row-school'
  private readonly studentsPerGrade = '.stat-row-grade'
  //private readonly profileButtonSelector = '[data-test=viewProfileButton]';
  //private readonly radioButtonSelector = '[data-test=viewTypeRadio] mat-radio-button';
  //private readonly familyRoleDropdownSelector = '[data-test=familyRoleSelect]';
  private readonly dropdownOptionSelector = 'mat-option';
  private readonly addFamilyButtonSelector = '[data-test=addFamilyButton]';

  navigateTo() {
    return cy.visit(this.baseUrl);
  }

  /**
   * Gets the title of the app when visiting the `/families` page.
   *
   * @returns the value of the element with the ID `.family-list-title`
   */
  getFamilyTitle() {
    return cy.get(this.pageTitle);
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

  getDashbord() {
    return cy.get(this.familyDashboard)
  }

  getTotalFamilies() {
    return cy.get(this.totalFamiliesNum)
  }

  getTotalStudents() {
    return cy.get(this.totalStudentsNum)
  }

  getStudentsPerGrade() {
    return cy.get(this.studentsPerGrade
    )
  }

  getStudentsPerSchool() {
    return cy.get(this.studentsPerSchool)
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
