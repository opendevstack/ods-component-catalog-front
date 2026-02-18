import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { AzureService } from "./services/azure.service";
import { catchError, from, Observable, switchMap, throwError } from "rxjs";
import { AuthenticationResult } from "@azure/msal-browser";
import { inject } from "@angular/core";


export function tokenInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const authService = inject(AzureService);
  
  const token = authService.getIdToken();
  
  if (token) {
    request = request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(request).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        // Token might be expired, try to refresh it
        return from(authService.refreshToken()).pipe(
          switchMap((newAuth: AuthenticationResult) => {
            const newToken = newAuth.idToken;
            // Clone the request with the new token
            const newRequest = request.clone({
              headers: request.headers.set('Authorization', `Bearer ${newToken}`),
            });
            return next(newRequest);
          }),
          catchError((refreshErr) => {
            authService.login();
            return throwError(() => new Error(refreshErr));
          })
        );
      }
      return throwError(() => err);
    })
  );
}