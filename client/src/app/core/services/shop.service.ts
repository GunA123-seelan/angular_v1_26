import { Injectable, inject, signal, computed } from '@angular/core';
import { ProductsApiService } from './products-api.service';
import { Product, CartItem, Order, DeliveryDetails } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ShopService {
  private api = inject(ProductsApiService);

  private productsSignal = signal<Product[]>([]);
  private cartItemsSignal = signal<CartItem[]>([]);
  private ordersSignal = signal<Order[]>([]);

  products = this.productsSignal.asReadonly();
  cartItems = this.cartItemsSignal.asReadonly();
  orders = this.ordersSignal.asReadonly();

  cartTotal = computed(() =>
    this.cartItemsSignal().reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0)
  );
  cartCount = computed(() =>
    this.cartItemsSignal().reduce((sum: number, i: CartItem) => sum + i.quantity, 0)
  );

  loadProducts() {
    this.api.getProducts().subscribe({
      next: (list) => this.productsSignal.set(list),
      error: () => this.productsSignal.set([])
    });
  }

  fetchCart() {
    this.api.getCart().subscribe({
      next: (res) => this.cartItemsSignal.set((res.items || []) as CartItem[]),
      error: () => this.cartItemsSignal.set([])
    });
  }

  fetchOrders() {
    this.api.getOrders().subscribe({
      next: (list) => this.ordersSignal.set(list),
      error: () => this.ordersSignal.set([])
    });
  }

  addToCart(productId: string, quantity = 1) {
    this.api.addToCart(productId, quantity).subscribe({
      next: () => this.fetchCart(),
      error: () => {}
    });
  }

  updateQuantity(productId: string, quantity: number) {
    this.api.updateCartItemQuantity(productId, quantity).subscribe({
      next: () => this.fetchCart(),
      error: () => {}
    });
  }

  removeFromCart(productId: string) {
    this.api.removeFromCart(productId).subscribe({
      next: () => this.fetchCart(),
      error: () => {}
    });
  }

  createOrder(items: { productId: string; quantity: number }[], delivery: DeliveryDetails) {
    return this.api.createOrder(items, delivery).subscribe({
      next: (order) => {
        this.ordersSignal.update(list => [order, ...list]);
        this.fetchCart();
      },
      error: () => {}
    });
  }
}
