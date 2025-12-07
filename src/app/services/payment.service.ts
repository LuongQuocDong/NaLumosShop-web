import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

interface VNPAYPaymentPayload {
  amount: number;
  orderInfo?: string;
  orderType?: string;
  bankCode?: string;
  language?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private url = 'https://nalumos-backend-production.up.railway.app/api/payments/vnpay';

  constructor(private httpClient: HttpClient) { }

  createVNPAYPayment(payload: VNPAYPaymentPayload) {
    return this.httpClient.post(`${this.url}/create`, payload);
  }
}

