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
    expect(routeSummary).toContain({ path: 'settings', title: 'Settings' });
    expect(routeSummary).toContain({ path: 'supplylist', title: 'Supply List' });
    expect(routeSummary).toContain({ path: 'supplylist/new', title: 'Add Supply List Item' });
    expect(routeSummary).toContain({ path: 'point-of-sale', title: 'Point Of Sale' });
  });

  it('protects point of sale with the bundled point of sale permission', () => {
    const pointOfSaleRoute = router.config.find(route => route.path === 'point-of-sale');

    expect(pointOfSaleRoute?.data?.['roles']).toEqual(['ADMIN', 'VOLUNTEER']);
    expect(pointOfSaleRoute?.data?.['permissions']).toEqual(['access_point_of_sale']);
  });

  // What is the point of this test? It is just testing that the same route is defined twice, which is not a good thing.
  // If we want to test that the supply list route is defined, we should test that it is defined once, not that it is defined twice.
  // it('contains the duplicated supplylist route configuration currently defined in the module', () => {
  //   const supplyRoutes = router.config.filter(route => route.path === 'supplylist');

  //   expect(supplyRoutes.length).toBe(2);
  //   expect(supplyRoutes.every(route => route.title === 'Supply List')).toBeTrue();
  // });

  it('contains the single supplylist route configuration currently defined in the module', () => {
    const supplyRoutes = router.config.filter(route => route.path === 'supplylist');

    expect(supplyRoutes.length).toBe(1);
    expect(supplyRoutes.every(route => route.title === 'Supply List')).toBeTrue();
  });
});
