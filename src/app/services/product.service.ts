import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  url = 'https://nalumos-backend-production.up.railway.app/api/products';

  constructor(private httpClient: HttpClient) { }

  getAll() {
    return this.httpClient.get(this.url);
  }

  getLasted() {
    return this.httpClient.get(this.url+'/latest');
  }

  getBestSeller() {
    return this.httpClient.get(this.url+'/bestseller');
  }

  getRated() {
    return this.httpClient.get(this.url+'/rated');
  }

  getOne(id: number) {
    return this.httpClient.get(this.url+'/'+id);
  }

  getByCategory(id: number) {
    return this.httpClient.get(this.url+'/category/'+id);
  }

  getSuggest(categoryId: number, productId: number) {
    return this.httpClient.get(this.url+'/suggest/'+categoryId+"/"+productId);
  }
}
