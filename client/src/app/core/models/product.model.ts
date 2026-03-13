export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface DeliveryDetails {
  address: string;
  city: string;
  pincode: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  delivery: DeliveryDetails;
  total: number;
  createdAt: string;
}
