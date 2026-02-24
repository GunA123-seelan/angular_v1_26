import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <h1>Login</h1>
      @if (error) {
        <p class="error">{{ error }}</p>
      }
      <form (submit)="onSubmit($event, usernameRef.value, passwordRef.value)">
        <div>
          <label>Username</label>
          <input #usernameRef type="text" required />
        </div>
        <div>
          <label>Password</label>
          <input #passwordRef type="password" required />
        </div>
        <button type="submit" [disabled]="loading">{{ loading ? 'Signing in...' : 'Sign in' }}</button>
      </form>
      <p class="hint">Demo: any username and password work.</p>
      <p><a routerLink="/dashboard">Go to Dashboard</a> (protected)</p>
    </div>
  `,
  styles: [`
    .error { color: #c62828; }
    .hint { color: #666; font-size: 0.9rem; }
    input { display: block; margin: 0.25rem 0 1rem; padding: 0.5rem; width: 200px; }
    button { padding: 0.5rem 1rem; cursor: pointer; }
  `]
})
export class LoginComponent {
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    console.log('LoginComponent constructor');  
  }

  onSubmit(event: Event, username: string, password: string) {
    event.preventDefault();
    this.error = '';
    this.loading = true;
    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Login failed';
      }
    });
  }
}
