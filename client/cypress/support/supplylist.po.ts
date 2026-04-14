export class SupplyListPage {
  private readonly baseUrl = '/supplylist';
  private readonly titleSelector = '.supplylist-title';
  private readonly sideNavButton = '.sidenav-button';
  private readonly sideNav = '.sidenav';
  private readonly sideNavOption = '[routerlink] > .mdc-list-item__content';
  private readonly resultsCard = '[data-cy="supplylist-card"]';


  navigateTo() {
    return cy.visit(this.baseUrl);
  }

  getAppTitle() {
    return cy.get(this.titleSelector);
  }

  getSidenavButton() {
    return cy.get(this.sideNavButton);
  }

  getSidenav() {
    return cy.get(this.sideNav);
  }

  getNavLink(navOption: 'Home' | 'Supply List' ) {
    return cy.contains(this.sideNavOption, `${navOption}`);
  }

  getResultsCard() {
    return cy.get(this.resultsCard);
  }

  getSupplyListSchool() {
    return cy.get('[data-cy=supplylist-school]')
  }
  getSupplyListGrade() {
    return cy.get('[data-cy=supplylist-grade]')
  }
  getSupplylistItem() {
    return cy.get('[data-cy="supplylist-item"]');
  }
  getSupplylistBrand() {
    return cy.get('[data-cy="supplylist-brand"]');
  }
  getSupplylistColor() {
    return cy.get('[data-cy="supplylist-color"]');
  }
  getSupplylistSize() {
    return cy.get('[data-cy="supplylist-size"]');
  }
  getSupplylistType() {
    return cy.get('[data-cy="supplylist-type"]');
  }
  getSupplylistMaterial() {
    return cy.get('[data-cy="supplylist-material"]');
  }
  getSupplylistCount() {
    return cy.get('[data-cy="supplylist-count"]');
  }
  getSupplylistQuantity() {
    return cy.get('[data-cy="supplylist-quantity"]');
  }
  getSupplylistNotes() {
    return cy.get('[data-cy="supplylist-notes"]');
  }

  getSchoolGroup(schoolName: string) {
    return cy.contains('[data-cy="supplylist-school"]', schoolName).closest('.school-group');
  }

  getGradePanel(schoolName: string, gradeName: string) {
    return this.getSchoolGroup(schoolName)
      .contains('[data-cy="supplylist-grade"]', gradeName)
      .closest('mat-expansion-panel');
  }

  expandGradePanel(schoolName: string, gradeName: string) {
    return this.getGradePanel(schoolName, gradeName).then(($panel) => {
      const expanded = $panel.attr('class')?.includes('mat-expanded');

      if (!expanded) {
        cy.wrap($panel).find('mat-expansion-panel-header').click();
      }

      cy.wrap($panel).should('have.class', 'mat-expanded');
    });
  }

  getTeacherGroup(schoolName: string, gradeName: string, teacherName: string) {
    return this.getGradePanel(schoolName, gradeName)
      .contains('.teacher-heading', teacherName)
      .closest('.teacher-group');
  }

  getItemRow(schoolName: string, gradeName: string, teacherName: string, itemText: string) {
    return this.getTeacherGroup(schoolName, gradeName, teacherName)
      .contains('.item-row', itemText)
      .closest('.item-row');
  }

  getFirstItemRow(schoolName: string, gradeName: string, teacherName: string) {
    return this.getTeacherGroup(schoolName, gradeName, teacherName)
      .find('.item-row')
      .first();
  }
}
