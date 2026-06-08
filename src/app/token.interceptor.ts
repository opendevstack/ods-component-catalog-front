import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { AzureService } from "./services/azure.service";
import { catchError, EMPTY, from, Observable, switchMap, throwError } from "rxjs";
import { inject } from "@angular/core";
import { Router } from "@angular/router";

const PROTECTED_API_PREFIXES = ['/component-catalog', '/projects-api', '/component-provisioner'];

function isProtectedApiRequest(url: string): boolean {
  if (PROTECTED_API_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return true;
  }

  try {
    const parsedUrl = new URL(url, globalThis.location.origin);
    return PROTECTED_API_PREFIXES.some((prefix) => parsedUrl.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

export function tokenInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const authService = inject(AzureService);
  const router = inject(Router);

  if (!isProtectedApiRequest(request.url)) {
    return next(request);
  }

  return from(authService.getAccessToken()).pipe(
    catchError((tokenErr: unknown) => {
      if (tokenErr instanceof Error && tokenErr.message.includes('No accounts found. User must sign in first.')) {
        authService.login();
        return EMPTY;
      }
      return throwError(() => tokenErr);
    }),
    switchMap((token) => {
      if (token) {
        request = request.clone({
          headers: request.headers.set('Authorization', `Bearer ${token}`),
        });
      }
      return next(request).pipe(
        catchError((err) => handleAuthError(err, request, next, authService, router))
      );
    })
  );
}

function handleRefreshError(refreshErr: unknown, authService: AzureService, router: Router): Observable<never> {
  if (refreshErr instanceof HttpErrorResponse && refreshErr.status === 403) {
    router.navigate(['/page-not-found']);
  } else {
    authService.login();
  }
  return throwError(() => refreshErr);
}

function retryWithRefreshedToken(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AzureService,
  router: Router
): Observable<HttpEvent<unknown>> {
  // Token might be expired, force refresh and retry once
  return from(authService.getAccessToken(true)).pipe(
    switchMap((newToken) => {
      const newRequest = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${newToken}`),
      });
      return next(newRequest);
    }),
    catchError((refreshErr) => handleRefreshError(refreshErr, authService, router))
  );
}

function handleAuthError(
  err: unknown,
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AzureService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
    return retryWithRefreshedToken(request, next, authService, router);
  }
  return throwError(() => err);
}