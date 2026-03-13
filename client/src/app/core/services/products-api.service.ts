import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Product, Order, DeliveryDetails } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsApiService {
  private readonly api = environment.apiUrl;
  private http = inject(HttpClient);

  getProducts() {
    return this.http.get<Product[]>(`${this.api}/api/products`);
  }

  getProduct(id: string) {
    return this.http.get<Product>(`${this.api}/api/products/${id}`);
  }

  addProduct(product: Partial<Product>) {
    return this.http.post<Product>(`${this.api}/api/products`, product);
  }

  updateProduct(id: string, product: Partial<Product>) {
    return this.http.put<Product>(`${this.api}/api/products/${id}`, product);
  }

  deleteProduct(id: string) {
    return this.http.delete(`${this.api}/api/products/${id}`);
  }

  getCart() {
    return this.http.get<{ items: { id: string; name: string; price: number; image: string; description: string; quantity: number }[] }>(`${this.api}/api/cart`);
  }

  addToCart(productId: string, quantity = 1) {
    return this.http.post<{ items: unknown[] }>(`${this.api}/api/cart`, { productId, quantity });
  }

  updateCartItemQuantity(productId: string, quantity: number) {
    return this.http.put<{ items: unknown[] }>(`${this.api}/api/cart/items/${productId}`, { quantity });
  }

  removeFromCart(productId: string) {
    return this.http.delete<{ items: unknown[] }>(`${this.api}/api/cart/items/${productId}`);
  }

  getOrders() {
    return this.http.get<Order[]>(`${this.api}/api/orders`);
  }

  createOrder(items: { productId: string; quantity: number }[], delivery: DeliveryDetails) {
    return this.http.post<Order>(`${this.api}/api/orders`, { items, delivery });
  }

  getOrder(id: string) {
    return this.http.get<Order>(`${this.api}/api/orders/${id}`);
  }
}
