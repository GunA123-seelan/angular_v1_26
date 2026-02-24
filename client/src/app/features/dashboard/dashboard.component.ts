import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <h1>Dashboard</h1>
      @if (auth.user(); as user) {
        <p>Hello, <strong>{{ user.username }}</strong></p>
      }
      @if (data(); as d) {
        <p>{{ d.message }}</p>
      } @else if (loading()) {
        <p>Loading...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <button (click)="auth.logout()">Logout</button>
      <p><a routerLink="/login">Back to Login</a></p>
    </div>
  `,
  styles: [`.error { color: #c62828; }`]
})
export class DashboardComponent {
  auth = inject(AuthService);
  http = inject(HttpClient);
  data = signal<{ message: string } | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    console.log("processs")
    this.http.get<{ message: string }>(`${environment.apiUrl}/api/dashboard`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error || 'Failed to load dashboard');
        this.loading.set(false);
      }
    });
  }
}
