// Angular Imports
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { RoleGuard } from './auth/role.guard';

// Note: Any routes for adding new items need to come before the routes for getting an item by an individual ID
// Ie: 'user/new' comes before 'users/:id'

const routes: Routes = [
  // Home page
  {path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent), title: 'Home'},

  // Sign up/Login pages
  {path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent), title: 'Login'},
  {path: 'sign-up', loadComponent: () => import('./auth/sign-up/sign-up.component').then(m => m.SignUpComponent), title: 'Volunteer Sign Up'},
  {path: 'guardian-sign-up', loadComponent: () => import('./auth/sign-up/sign-up.component').then(m => m.SignUpComponent), title: 'Guardian Sign Up'},

  // Family Portal
  {path: 'family-portal', loadComponent: () => import('./family/family-portal-home.component').then(m => m.FamilyPortalHomeComponent), title: 'Family Portal',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['GUARDIAN'], permissions: ['family_portal_access'] }},
  {path: 'family-portal/form', loadComponent: () => import('./family/family-portal-form.component').then(m => m.FamilyPortalFormComponent), title: 'Family Form',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['GUARDIAN'], permissions: ['family_portal_access'] }},

  // Family Pages (Volunteer and Admin view)
  {path: 'family', loadComponent: () => import('./family/family-list.component').then(m => m.FamilyListComponent), title: 'Family',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_families', 'view_dashboard_stats'] }},
  {path: 'family/new', loadComponent: () => import('./family/add-family.component').then(m => m.AddFamilyComponent), title: 'Add Family',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['add_family'] }},
  {path: 'family/:id', loadComponent: () => import('./family/edit-family.component').then(m => m.EditFamilyComponent), title: 'Edit Family',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_family', 'edit_family'] }},

  // Inventory/Supplylist
  {path: 'inventory', loadComponent: () => import('./inventory/inventory.component').then(m => m.InventoryComponent), title: 'Inventory',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_inventory'] }},
  {path: 'supplylist', loadComponent: () => import('./supplylist/supplylist.component').then(m => m.SupplyListComponent), title: 'Supply List',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_supply_lists'] }},
  {path: 'supplylist/new', loadComponent: () => import('./supplylist/add-supplylist.component').then(m => m.AddSupplyListComponent), title: 'Add Supply List Item',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['add_supply_list'] }},

  // PDF generator
  {path: 'pdf-generator', loadComponent: () => import('./stock-report/report-generator/report-generator.component').then(m => m.ReportGeneratorComponent), title: 'PDF Generator',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_inventory', 'view_reports'] }},

  // Stock Report
  {path: 'stock-report', loadComponent: () => import('./stock-report/stock-report.component').then(m => m.StockReportComponent), title: 'Stock Report',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_inventory', 'view_reports'] }},

  // Settings
  {path: 'settings', loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent), title: 'Settings',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_settings'] }},

  // Point of Sale
  {path: 'point-of-sale', loadComponent: () => import('./PointOfSale/PointOfSale.component').then(m => m.PointOfSaleComponent), title: 'Point Of Sale',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['access_point_of_sale'] }},  

  // User management
  {path: 'users', loadComponent: () => import('./users/users.component').then(m => m.UsersComponent), title: 'Users',
    canActivate: [AuthGuard, RoleGuard], data: { roles: ['ADMIN'] }},

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule { }
