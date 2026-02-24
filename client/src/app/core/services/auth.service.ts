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

  login(username: string, password: string) {
    console.log(username, password);
    return this.http
      .post<{ user: User }>(`${this.api}/api/auth/login`, { username, password }, { withCredentials: true })
      .pipe(
        tap((res) => { console.log('login success', res); this.userSignal.set(res.user) }),
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
