// Package declaration
package umm3601.Auth;

/**
 * Enum representing HTTP methods for use in @Route annotations.
 * This allows us to specify the method for a route in a type-safe way,
 * reducing the risk of errors from using raw strings.
  * Example usage:
  * `@Route(method = HttpMethod.GET, path = "/api/terms")
  * public void getTerms(Context ctx) { ... }
  *
  * Why use an enum?
  * __________________________________________
  *
  * Using an enum for HTTP methods provides several benefits:
  * 1. Type safety: Ensures only valid HTTP methods are used.
  * 2. Readability: Makes the code more readable and self-documenting.
  * 3. Maintainability: Easier to update and manage supported HTTP methods.
  */

public enum HttpMethod {
    GET,
    POST,
    PUT,
    DELETE,
    PATCH
}
