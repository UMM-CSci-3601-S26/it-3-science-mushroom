import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Terms } from './terms';

@Injectable({
  providedIn: 'root'
})
export class TermsService {
  private httpClient = inject(HttpClient);
  readonly termsUrl: string = `${environment.apiUrl}terms`;

  getTerms(): Observable<Terms> {
    return this.httpClient.get<Terms>(this.termsUrl);
  }
}
