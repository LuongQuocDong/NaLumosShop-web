import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Cart } from 'src/app/common/Cart';
import { CartDetail } from 'src/app/common/CartDetail';
import { ChatMessage } from 'src/app/common/ChatMessage';
import { Notification } from 'src/app/common/Notification';
import { Order } from 'src/app/common/Order';
import { CartService } from 'src/app/services/cart.service';
import { NotificationService } from 'src/app/services/notification.service';
import { OrderService } from 'src/app/services/order.service';
import { SessionService } from 'src/app/services/session.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { PaymentService } from 'src/app/services/payment.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  cart!: Cart;
  cartDetail!: CartDetail;
  cartDetails!: CartDetail[];

  discount!: number;
  amount!: number;
  amountReal!: number;

  postForm: FormGroup;

  isProcessingPayment = false;

  constructor(
    private cartService: CartService,
    private toastr: ToastrService,
    private router: Router,
    private sessionService: SessionService,
    private orderService: OrderService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private paymentService: PaymentService,
    private activatedRoute: ActivatedRoute
  ) {
    // Tạo form chỉ 1 lần
    this.postForm = new FormGroup({
      phone: new FormControl(null, [Validators.required, Validators.pattern('(0)[0-9]{9}')]),
      address: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
    this.webSocketService.openWebSocket();
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });

    this.discount = 0;
    this.amount = 0;
    this.amountReal = 0;

    this.getAllItem();
    this.handleVNPAYReturn();
  }

  getAllItem() {
    const email = this.sessionService.getUser();
    this.cartService.getCart(email).subscribe(data => {
      this.cart = data as Cart;

      // patch giá trị vào form (không tạo lại form)
      this.postForm.patchValue({
        phone: this.cart.phone || null,
        address: this.cart.address || ''
      });

      this.cartService.getAllDetail(this.cart.cartId).subscribe(data => {
        this.cartDetails = data as CartDetail[];
        this.cartService.setLength(this.cartDetails.length);
        if (this.cartDetails.length === 0) {
          this.router.navigate(['/']);
          this.toastr.info('Hãy chọn một vài sản phẩm rồi tiến hành thanh toán', 'Hệ thống');
        }
        // reset lại amount trước khi tính
        this.amountReal = 0;
        this.amount = 0;
        this.cartDetails.forEach(item => {
          this.amountReal += item.product.price * item.quantity;
          this.amount += item.price;
        });
        this.discount = this.amount - this.amountReal;
      }, err => {
        console.error('getAllDetail error', err);
      });

    }, err => {
      console.error('getCart error', err);
    });
  }

  checkOut() {
    if (this.postForm.valid) {
      Swal.fire({
        title: 'Bạn có muốn đặt đơn hàng này?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        cancelButtonText: 'Không',
        confirmButtonText: 'Đặt'
      }).then((result) => {
        if (!result.isConfirmed) return;

        const email = this.sessionService.getUser();
        this.cartService.getCart(email).subscribe(data => {
          this.cart = data as Cart;

          // Gán địa chỉ trực tiếp từ ô address
          this.cart.address = this.postForm.value.address;
          this.cart.phone = this.postForm.value.phone;

          this.cartService.updateCart(email, this.cart).subscribe(updated => {
            this.cart = updated as Cart;
            this.orderService.post(email, this.cart).subscribe(dataOrder => {
              const order: Order = dataOrder as Order;
              this.sendMessage(order.ordersId);
              Swal.fire(
                'Thành công!',
                'Chúc mừng bạn đã đặt hàng thành công.',
                'success'
              );
              this.router.navigate(['/cart']);
            }, error => {
              this.toastr.error('Lỗi server', 'Hệ thống');
            });
          }, error => {
            this.toastr.error('Lỗi server', 'Hệ thống');
          });

        }, error => {
          this.toastr.error('Lỗi server', 'Hệ thống');
        });
      });

    } else {
      this.toastr.error('Hãy nhập đầy đủ thông tin', 'Hệ thống');
    }
  }

  sendMessage(id: number) {
    const chatMessage = new ChatMessage(this.cart.user.name, ' đã đặt một đơn hàng');
    this.notificationService.post(new Notification(0, this.cart.user.name + ' đã đặt một đơn hàng (' + id + ')')).subscribe(data => {
      this.webSocketService.sendMessage(chatMessage);
    });
  }

  payWithVNPAY() {
    if (!this.postForm.valid) {
      this.toastr.error('Hãy nhập đầy đủ thông tin', 'Hệ thống');
      return;
    }
    if (!this.amount || this.amount <= 0) {
      this.toastr.warning('Giỏ hàng đang trống', 'Hệ thống');
      return;
    }
    if (this.isProcessingPayment) {
      return;
    }

    this.isProcessingPayment = true;
    const payload = {
      amount: Math.round(this.amount),
      orderInfo: `Thanh toán đơn hàng ${new Date().getTime()}`,
      orderType: 'other',
      language: 'vn'
    };

    this.paymentService.createVNPAYPayment(payload).subscribe({
      next: (response: any) => {
        this.isProcessingPayment = false;
        if (response?.paymentUrl) {
          window.location.href = response.paymentUrl;
          return;
        }
        const fallbackMessage = response?.message || 'Không nhận được liên kết thanh toán VNPAY';
        this.toastr.error(fallbackMessage, 'Hệ thống');
      },
      error: err => {
        this.isProcessingPayment = false;
        console.error('createVNPAYPayment error', err);
        const serverMsg = err?.error?.message;
        this.toastr.error(serverMsg || 'Không thể kết nối VNPAY, vui lòng thử lại', 'Hệ thống');
      }
    });
  }

  private handleVNPAYReturn() {
    this.activatedRoute.queryParamMap.subscribe(params => {
      const vnp_ResponseCode = params.get('vnp_ResponseCode');
      if (vnp_ResponseCode === null) {
        return;
      }
      const vnp_TransactionStatus = params.get('vnp_TransactionStatus');
      const vnp_TxnRef = params.get('vnp_TxnRef');
      const vnp_Amount = params.get('vnp_Amount');
      
      // VNPAY trả về ResponseCode = '00' là thành công
      if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
        this.toastr.success('Thanh toán VNPAY thành công', 'Hệ thống');
        // Tự động đặt hàng sau khi thanh toán thành công
        this.checkOut();
      } else {
        const message = params.get('vnp_ResponseCode') || 'Lỗi không xác định';
        this.toastr.error(`Thanh toán VNPAY thất bại (Mã lỗi: ${vnp_ResponseCode})`, 'Hệ thống');
      }
      this.clearPaymentQueryParams();
    });
  }

  private clearPaymentQueryParams() {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {},
      replaceUrl: true
    });
  }

}
