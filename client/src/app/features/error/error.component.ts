import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <h1>Page not found</h1>
      <p>This page does not exist or you don't have access.</p>
      <a routerLink="/login">Go to Login</a> · <a routerLink="/dashboard">Dashboard</a>
    </div>
  `
})
export class ErrorComponent {}
