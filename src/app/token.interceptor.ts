import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { AzureService } from "./services/azure.service";
import { catchError, from, Observable, switchMap, throwError } from "rxjs";
import { inject } from "@angular/core";
import { Router } from "@angular/router";


export function tokenInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const authService = inject(AzureService);
  const router = inject(Router);

  return from(authService.getAccessToken()).pipe(
    switchMap((token) => {
      if (token) {
        request = request.clone({
          headers: request.headers.set('Authorization', `Bearer ${token}`),
        });
      }

      return next(request).pipe(
        catchError((err) => {
          if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
            // Token might be expired, force refresh and retry once
            return from(authService.getAccessToken(true)).pipe(
              switchMap((newToken) => {
                const newRequest = request.clone({
                  headers: request.headers.set('Authorization', `Bearer ${newToken}`),
                });
                return next(newRequest);
              }),
              catchError((refreshErr) => {
                if (refreshErr instanceof HttpErrorResponse && refreshErr.status === 403) {
                  router.navigate(['/page-not-found']);
                } else {
                  authService.login();
                }
                return throwError(() => refreshErr);
              })
            );
          }
          return throwError(() => err);
        })
      );
    })
  );
}