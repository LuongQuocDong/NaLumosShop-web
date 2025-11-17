import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { ICreateOrderRequest, IPayPalConfig } from 'ngx-paypal';
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

  amountPaypal!: number;
  public payPalConfig?: IPayPalConfig;

  constructor(
    private cartService: CartService,
    private toastr: ToastrService,
    private router: Router,
    private sessionService: SessionService,
    private orderService: OrderService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService
  ) {
    // Tạo form chỉ 1 lần
    this.postForm = new FormGroup({
      phone: new FormControl(null, [Validators.required, Validators.pattern('(0)[0-9]{9}')]),
      address: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
    this.checkOutPaypal();
    this.webSocketService.openWebSocket();
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });

    this.discount = 0;
    this.amount = 0;
    this.amountPaypal = 0;
    this.amountReal = 0;

    this.getAllItem();
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
        this.amountPaypal = (this.amount / 22727.5);
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

  private checkOutPaypal(): void {

    this.payPalConfig = {
      currency: 'USD',
      clientId: 'Af5ZEdGAlk3_OOp29nWn8_g717UNbdcbpiPIZOZgSH4Gdneqm_y_KVFiHgrIsKM0a2dhNBfFK8TIuoOG',
      createOrderOnClient: (data) => <ICreateOrderRequest>{
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: String(this.amountPaypal ? this.amountPaypal.toFixed(2) : '0.00'),
          },
        }]
      },
      advanced: {
        commit: 'true'
      },
      style: {
        label: 'paypal',
        layout: 'vertical',
        color: 'blue',
        size: 'small',
        shape: 'rect',
      },
      onApprove: (data, actions) => {
        console.log('onApprove - transaction was approved, but not authorized', data, actions);
        actions.order.get().then((details: any) => {
          console.log('onApprove - order details: ', details);
        });
      },
      onClientAuthorization: (data) => {
        console.log('onClientAuthorization', data);
        this.checkOut();
      },
      onCancel: (data, actions) => {
        console.log('OnCancel', data, actions);
      },
      onError: err => {
        console.log('OnError', err);
      },
      onClick: (data, actions) => {
        console.log('onClick', data, actions);
      },
    };
  }

}
