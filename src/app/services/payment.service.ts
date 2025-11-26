import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

interface MomoPaymentPayload {
  amount: number;
  orderInfo?: string;
  extraData?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private url = 'https://nalumos-backend-production.up.railway.app/api/payments/momo';

  constructor(private httpClient: HttpClient) { }

  createMomoPayment(payload: MomoPaymentPayload) {
    return this.httpClient.post(`${this.url}/create`, payload);
  }
}

