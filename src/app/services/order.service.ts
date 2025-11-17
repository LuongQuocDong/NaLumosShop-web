import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Cart } from '../common/Cart';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  url = "https://nalumos-backend-production.up.railway.app/api/orders";

  urlOrderDetail = "https://nalumos-backend-production.up.railway.app/api/orderDetail";

  constructor(private httpClient: HttpClient) { }

  post(email: string, cart: Cart) {
    return this.httpClient.post(this.url+'/'+email, cart);
  }

  get(email:string) {
    return this.httpClient.get(this.url+'/user/'+email);
  }

  getById(id:number) {
    return this.httpClient.get(this.url+'/'+id);
  }

  getByOrder(id:number) {
    return this.httpClient.get(this.urlOrderDetail+'/order/'+id);
  }

  cancel(id: number) {
    return this.httpClient.get(this.url+'/cancel/'+id);
  }
}
