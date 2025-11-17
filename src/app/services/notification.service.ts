import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Notification } from '../common/Notification';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  url = 'https://nalumos-backend-production.up.railway.app/api/notification';

  constructor(private http: HttpClient) { }

  post(notification: Notification) {
    return this.http.post(this.url, notification);
  }
}
