import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);
  const reqWithCreds = req.clone({ withCredentials: true });
  return next(reqWithCreds).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        return auth.refreshToken().pipe(
          switchMap(() => next(req.clone({ withCredentials: true }))),
          catchError(() => throwError(() => err))
        );
      }
      return throwError(() => err);
    })
  );
};
