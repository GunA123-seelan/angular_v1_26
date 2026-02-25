import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, timer, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;
  private userSignal = signal<User | null>(null);
  private refreshInProgress = false;

  user = this.userSignal.asReadonly();
  isLoggedIn = computed(() => this.userSignal() !== null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  checkUsername(username: string) {
    return this.http.post<{ valid: boolean; passkey?: string }>(
      `${this.api}/api/auth/check-username`,
      { username: username?.trim() },
      { withCredentials: true }
    );
  }

  login(username: string, passkey: string) {
    return this.http
      .post<{ user: User }>(`${this.api}/api/auth/login`, { username: username?.trim(), password: passkey?.trim() }, { withCredentials: true })
      .pipe(
        tap((res) => this.userSignal.set(res.user)),
        catchError((err) => {
          this.userSignal.set(null);
          throw err;
        })
      );
  }

  logout() {
    this.http.post(`${this.api}/api/auth/logout`, {}, { withCredentials: true }).subscribe();
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<{ ok: boolean }> {
    if (this.refreshInProgress) {
      return timer(200).pipe(switchMap(() => this.refreshToken()));
    }
    this.refreshInProgress = true;
    return this.http.post<{ ok: boolean }>(`${this.api}/api/auth/refresh`, {}, { withCredentials: true }).pipe(
      tap(() => { this.refreshInProgress = false; }),
      catchError((err) => {
        this.refreshInProgress = false;
        this.logout();
        throw err;
      })
    );
  }

  setUser(user: User | null) {
    this.userSignal.set(user);
  }
}
