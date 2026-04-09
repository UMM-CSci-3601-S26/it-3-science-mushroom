import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';

describe('AppRoutingModule', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppRoutingModule]
    });

    router = TestBed.inject(Router);
  });

  it('registers the expected application routes and titles', () => {
    const routeSummary = router.config.map(route => ({
      path: route.path,
      title: route.title
    }));

    expect(routeSummary).toContain({ path: '', title: 'Home' });
    expect(routeSummary).toContain({ path: 'family', title: 'Family' });
    expect(routeSummary).toContain({ path: 'family/new', title: 'Add Family' });
    expect(routeSummary).toContain({ path: 'inventory', title: 'Inventory' });
    expect(routeSummary).toContain({ path: 'stock-report', title: 'Stock Report' });
    expect(routeSummary).toContain({ path: 'pdf-generator', title: 'PDF Generator' });
    expect(routeSummary).toContain({ path: 'stationOrder', title: 'Station Order' });
  });

  it('contains the duplicated supplylist route configuration currently defined in the module', () => {
    const supplyRoutes = router.config.filter(route => route.path === 'supplylist');

    expect(supplyRoutes.length).toBe(2);
    expect(supplyRoutes.every(route => route.title === 'Supply List')).toBeTrue();
  });
});
