// Angular Imports
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';

// Inventory/Supply List Imports
import { InventoryComponent } from './inventory/inventory.component';
import { SupplyListComponent } from './supplylist/supplylist.component';

// Family Imports
import { FamilyListComponent } from './family/family-list.component';
import { AddFamilyComponent } from './family/add-family.component';

// Stock Report Imports
import { StockReportComponent } from './stock-report/stock-report.component';

// PDF Generator Imports
import { ReportGeneratorComponent } from './stock-report/report-generator/report-generator.component';

import { StationOrderComponent } from './station-order/station-order.component';

// Note: Any routes for adding new items need to come before the routes for getting an item by an individual ID
// Ie: 'user/new' comes before 'users/:id'
const routes: Routes = [
  {path: '', component: HomeComponent, title: 'Home'},
  {path: 'family', component: FamilyListComponent, title: 'Family'},
  {path: 'family/new', component: AddFamilyComponent, title: 'Add Family'},
  {path: 'inventory', component: InventoryComponent, title: 'Inventory'},
  {path: 'supplylist', component: SupplyListComponent, title: 'Supply List'},
  {path: 'stock-report', component: StockReportComponent, title: 'Stock Report'},
  {path: 'pdf-generator', component: ReportGeneratorComponent, title: 'PDF Generator'},
  {path: 'supplylist', component: SupplyListComponent, title: 'Supply List'},
  {path: 'stationOrder', component: StationOrderComponent, title: 'Station Order'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
