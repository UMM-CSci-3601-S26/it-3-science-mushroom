import { convertToParamMap, ParamMap, Params } from '@angular/router';
import { ReplaySubject } from 'rxjs';

// This code is modified from https://angular.io/guide/testing-components-scenarios#activatedroutestub

/**
 * An ActivateRoute test double with a `paramMap` observable.
 * Use the `setParamMap()` method to add the next `paramMap` value.
 */
export class ActivatedRouteStub {
  // Use a ReplaySubject to share previous values with subscribers
  // and pump new values into the `paramMap` observable
  private subject = new ReplaySubject<ParamMap>(1);

  /** The mock paramMap observable */
  readonly paramMap = this.subject.asObservable();

  readonly snapshot: { paramMap: ParamMap};

  constructor(initialParams?: Params) {
    if (initialParams) {
      const paramMap = convertToParamMap(initialParams);
      this.setParamMap(initialParams);
      this.snapshot = { paramMap };
    } else {
      this.snapshot = { paramMap: convertToParamMap({}) };
    }
  }

  /** Set the paramMap observables's next value */
  setParamMap(params: Params) {
    this.subject.next(convertToParamMap(params));
  }
}
