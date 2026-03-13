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
      .post<{ user: User; expiresAt?: number }>(
        `${this.api}/api/auth/login`,
        { username: username?.trim(), password: passkey?.trim() },
        { withCredentials: true }
      )
      .pipe(
        tap((res) => {
          this.userSignal.set(res.user);
          this.scheduleRefresh(res.expiresAt);
        }),
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

  refreshToken(): Observable<{ ok: boolean; expiresAt?: number }> {
    if (this.refreshInProgress) {
      return timer(200).pipe(switchMap(() => this.refreshToken()));
    }
    this.refreshInProgress = true;
    return this.http
      .post<{ ok: boolean; expiresAt?: number }>(`${this.api}/api/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.refreshInProgress = false;
          this.scheduleRefresh(res.expiresAt);
        }),
        catchError((err) => {
          this.refreshInProgress = false;
          this.logout();
          throw err;
        })
      );
  }

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduleRefresh(expiresAt?: number) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    if (!expiresAt) return;
    const refreshBeforeSec = 60;
    const ms = (expiresAt - refreshBeforeSec) * 1000 - Date.now();
    if (ms <= 0) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshToken().subscribe();
    }, ms);
  }

  setUser(user: User | null) {
    this.userSignal.set(user);
  }
}
