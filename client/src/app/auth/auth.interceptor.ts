/**
 * AuthInterceptor — HTTP interceptor that ensures the browser's auth_token
 * cookie is included with every outgoing API request.
 *
 * Why withCredentials?
 * --------------------
 * By default Angular's HttpClient does NOT send cookies on cross-origin
 * requests.  Setting withCredentials: true on every request ensures the
 * HttpOnly auth_token cookie is always attached automatically by the browser.
 * This replaces the old pattern of manually reading a token from localStorage
 * and setting an Authorization header — the cookie is never accessible to
 * JavaScript, so there is nothing for this interceptor to read or attach.
 */
import { Injectable } from "@angular/core";
import { HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    // The auth_token is an HttpOnly cookie — the browser attaches it automatically.
    // We just ensure withCredentials is set so cookies are included cross-origin.
    const clone = req.clone({ withCredentials: true });
    return next.handle(clone);
  }
}
