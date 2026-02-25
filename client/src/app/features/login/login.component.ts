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

      @if (step === 1) {
        <form (submit)="onGetCode($event, usernameRef.value)">
          <div>
            <label>Username</label>
            <input #usernameRef type="text" placeholder="Enter username" required />
          </div>
          <button type="submit" [disabled]="loading">{{ loading ? 'Checking...' : 'Get code' }}</button>
        </form>
        <p class="hint">Valid username: <strong>guna</strong></p>
      } @else {
        <form (submit)="onLogin($event, codeRef.value)">
          <p class="step2-label">Enter 4-digit code for <strong>{{ pendingUsername }}</strong></p>
          @if (passkey) {
            <p class="passkey-hint">Your code: <strong>{{ passkey }}</strong> (enter below)</p>
          }
          <div>
            <label>4-digit code</label>
            <input #codeRef type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="0000" />
          </div>
          <button type="submit" [disabled]="loading">{{ loading ? 'Signing in...' : 'Login' }}</button>
          <button type="button" class="back" (click)="back()">Back</button>
        </form>
      }

      <p><a routerLink="/dashboard">Dashboard</a> (protected)</p>
    </div>
  `,
  styles: [`
    .error { color: #c62828; }
    .hint, .step2-label, .passkey-hint { color: #666; font-size: 0.9rem; }
    .passkey-hint { margin-bottom: 0.5rem; }
    input { display: block; margin: 0.25rem 0 1rem; padding: 0.5rem; width: 200px; }
    button { padding: 0.5rem 1rem; cursor: pointer; margin-right: 0.5rem; }
    button.back { background: #eee; }
  `]
})
export class LoginComponent {
  step: 1 | 2 = 1;
  pendingUsername = '';
  passkey = '';
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  onGetCode(event: Event, username: string) {
    event.preventDefault();
    this.error = '';
    if (!username?.trim()) return;
    this.loading = true;
    this.auth.checkUsername(username).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.valid && res.passkey) {
          this.pendingUsername = username.trim();
          this.passkey = res.passkey;
          this.step = 2;
        } else {
          this.error = 'Invalid username. Use: guna';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Request failed';
      }
    });
  }

  onLogin(event: Event, code: string) {
    event.preventDefault();
    this.error = '';
    if (!code?.trim() || code.trim().length !== 4) {
      this.error = 'Enter the 4-digit code';
      return;
    }
    this.loading = true;
    this.auth.login(this.pendingUsername, code).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Invalid code or expired. Get a new code.';
      }
    });
  }

  back() {
    this.step = 1;
    this.error = '';
    this.passkey = '';
    this.pendingUsername = '';
  }
}
