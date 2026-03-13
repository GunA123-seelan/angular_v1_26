import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ShopService } from '../../core/services/shop.service';
import { Product, CartItem, Order, DeliveryDetails } from '../../core/models/product.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  shop = inject(ShopService);

  currentSlide = signal(0);
  showCart = signal(false);
  showOrderForm = signal(false);
  deliveryForm = signal<DeliveryDetails>({ address: '', city: '', pincode: '' });
  placingOrder = signal(false);

  sliderImages = [
    'https://picsum.photos/seed/s1/1200/400',
    'https://picsum.photos/seed/s2/1200/400',
    'https://picsum.photos/seed/s3/1200/400'
  ];

  ngOnInit() {
    this.shop.loadProducts();
    this.shop.fetchCart();
    this.shop.fetchOrders();
  }

  nextSlide() {
    this.currentSlide.update(i => (i + 1) % this.sliderImages.length);
  }

  prevSlide() {
    const len = this.sliderImages.length;
    this.currentSlide.update(i => (i - 1 + len) % len);
  }

  addToCart(p: Product, qty = 1) {
    this.shop.addToCart(p.id, qty);
  }

  updateQty(productId: string, quantity: number) {
    this.shop.updateQuantity(productId, quantity);
  }

  removeFromCart(productId: string) {
    this.shop.removeFromCart(productId);
  }

  toggleCart() {
    this.showCart.update(v => !v);
  }

  setDelivery(field: keyof DeliveryDetails, value: string) {
    this.deliveryForm.update(f => ({ ...f, [field]: value }));
  }

  placeOrder() {
    const items = this.shop.cartItems().map((i: CartItem) => ({ productId: i.id, quantity: i.quantity }));
    if (!items.length) return;
    this.placingOrder.set(true);
    this.shop.createOrder(items, this.deliveryForm());
    this.placingOrder.set(false);
    this.showOrderForm.set(false);
    this.showCart.set(false);
  }

  openOrderForm() {
    this.showOrderForm.set(true);
  }

  closeOrderForm() {
    this.showOrderForm.set(false);
  }
}
