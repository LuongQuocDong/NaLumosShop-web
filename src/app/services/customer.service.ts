import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { Customer } from '../common/Customer';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  url = "https://nalumos-backend-production.up.railway.app/api/auth";

  constructor(private httpClient: HttpClient) { }

  getOne(id: number) {
    return this.httpClient.get(this.url + '/' + id);
  }

  getByEmail(email: string | null | undefined): Observable<Customer> {
    if (!email) {
      return EMPTY as Observable<Customer>;
    }
    return this.httpClient.get<Customer>(this.url + '/email/' + email);
  }

  update(id: number, customer: Customer) {
    return this.httpClient.put(this.url + '/' + id, customer);
  }
}
