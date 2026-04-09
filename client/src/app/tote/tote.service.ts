import { HttpClient} from "@angular/common/http";
import { inject, Injectable } from "@angular/core"
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { MoveToteItemRequest, Tote, ToteQuantityChangeRequest } from "./tote";


@Injectable({
  providedIn: 'root'
})
export class ToteService {
  private httpClient = inject(HttpClient);

  readonly toteUrl = `${environment.apiUrl}totes`;

  getTote(toteBarcode): Observable<Tote> {
    return this.httpClient.get<Tote>(`${this.toteUrl}/${toteBarcode}`);
  }

  createTote(toteBarcode: string, name?: string, notes?: string): Observable<Tote> {
    return this.httpClient.post<Tote>(this.toteUrl, { toteBarcode, name, notes });
  }

  addToTote(toteBarcode: string, internalID: string, quantity: number): Observable<Tote> {
    const body: ToteQuantityChangeRequest = {internalID , quantity};
    return this.httpClient.post<Tote>(`${this.toteUrl}/${toteBarcode}/add`, body)
  }

  removeFromTote(toteBarcode: string, internalID: string, quantity: number): Observable<Tote> {
    const body: ToteQuantityChangeRequest = {internalID, quantity};
    return this.httpClient.post<Tote>(`${this.toteUrl}/${toteBarcode}`, body);
  }

  moveBetweenTotes(request: MoveToteItemRequest): Observable<unknown> {
    return this.httpClient.post(`${this.toteUrl}/move`,request)
  }
}
