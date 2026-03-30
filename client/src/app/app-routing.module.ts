// Angular Imports
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';

// Inventory/Supply List Imports
import { InventoryComponent } from './inventory/inventory.component';
import { SupplyListComponent } from './supplylist/supplylist.component';

// Family Imports
import { FamilyDashComponent } from './family-dash/family-dash.component';
import { FamilyListComponent } from './family/family-list.component';
import { AddFamilyComponent } from './family/add-family.component';

// Stock Report Imports
import { StockReportComponent } from './stock-report/stock-report.component';

// Note: Any routes for adding new items need to come before the routes for getting an item by an individual ID
// Ie: 'user/new' comes before 'users/:id'
const routes: Routes = [
  {path: '', component: HomeComponent, title: 'Home'},
  {path: 'dashboard', component: FamilyDashComponent, title: 'Family Dashboard'},
  {path: 'family', component: FamilyListComponent, title: 'Family'},
  {path: 'family/new', component: AddFamilyComponent, title: 'Add Family'},
  {path: 'inventory', component: InventoryComponent, title: 'Inventory'},
  {path: 'supplylist', component: SupplyListComponent, title: 'Supply List'},
  {path: 'stock-report', component: StockReportComponent, title: 'Stock Report'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
