import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { provideAuth, OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

function initAuth(oidc: OidcSecurityService): () => Promise<unknown> {
  return () =>
    firstValueFrom(oidc.checkAuth()).catch(() => {
      // Code exchange failed (stale/replayed code) — clear OIDC state and reload clean
      oidc.logoffLocal();
      const clean = globalThis.location.origin + '/';
      if (globalThis.location.href !== clean) {
        globalThis.location.replace(clean);
      }
      return null;
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),   // XHR backend — no withFetch()
    provideAnimations(),
    provideStore({}),
    provideEffects([]),
    provideRouterStore(),
    provideAuth({
      config: {
        authority: environment.keycloak.authority,
        redirectUrl: environment.keycloak.redirectUrl,
        postLogoutRedirectUri: environment.keycloak.postLogoutRedirectUri,
        clientId: environment.keycloak.clientId,
        scope: environment.keycloak.scope,
        responseType: environment.keycloak.responseType,
        silentRenew: false,
        useRefreshToken: true,
        renewTimeBeforeTokenExpiresInSeconds: 30,
        ignoreNonceAfterRefresh: true,
        unauthorizedRoute: '/',
      },
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [OidcSecurityService],
      multi: true,
    },
  ],
};
