import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);
  if (auth.isLoggedIn()) {
    return of(true);
  }
  // Check if we have cookies (e.g. page refresh) by calling a lightweight endpoint
  return http.get(`${environment.apiUrl}/api/dashboard`, { withCredentials: true }).pipe(
    map((res: unknown) => {
      const body = res as { user?: { userId: string; username: string } };
      if (body?.user) auth.setUser({ id: body.user.userId, username: body.user.username });
      return true;
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};
