// Package declaration
package umm3601.Common;

// Org Imports
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.HttpStatus;
import io.javalin.http.HttpResponseException;

/**
 * ApiExceptionHandler is a utility class responsible for registering global
 * exception handlers with the Javalin application. It defines handlers for
 * specific exceptions, such as IllegalArgumentException, to return appropriate
 * HTTP status codes and error messages in the response. Additionally, it
 * includes a generic handler for all other exceptions, which checks for any
 * HttpResponseException in the exception chain to determine the correct status
 * code and message to return. If no HttpResponseException is found, it logs the
 * error and returns a generic 500 Internal Server Error response. This
 * centralized exception handling mechanism ensures consistent error responses
 * across the application and simplifies error management in route handlers and
 * other components.
 *
 * Why create a separate ApiExceptionHandler class?
 * _______________________________________________________________
 * 1. Separation of Concerns: By centralizing exception handling in a dedicated
 * class, we keep the route handlers and service methods focused on business
 * logic. This promotes cleaner code and makes it easier to maintain and
 * understand the flow of the application.
 * 2. Consistent Error Handling: Centralizing exception handling ensures that
 * all exceptions are handled consistently across the application. This means
 * that similar errors will result in similar responses, making the API more
 * predictable and easier to use.
 * 3. Simplified Logging: By having a single place to handle exceptions, we can
 * easily log all errors in a consistent manner, which aids in monitoring and
 * debugging.
 * 4. Reusability: The ApiExceptionHandler can be reused across different
 * Javalin applications or modules within the same application, providing a
 * standardized way to handle exceptions without duplicating code.
 */

public final class ApiExceptionHandler {
  // Logger for logging exceptions and errors
  private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

  private ApiExceptionHandler() {
    // Private constructor to prevent instantiation
  }

  /**
   * Registers global exception handlers with the Javalin application. It defines
   * handlers for IllegalArgumentException to return a 400 Bad Request response
   * and a generic handler for all other exceptions that checks for
   * HttpResponseException
   * in the exception chain to determine the appropriate status code and message
   * to return. If no HttpResponseException is found, it logs the error and
   * returns a 500
   * Internal Server Error response.
   *
   * @param app The Javalin application instance to which the exception handlers
   *            will be registered.
   */
  public static void register(Javalin app) {
    app.exception(IllegalArgumentException.class, (e, ctx) -> {
      LOGGER.warn("Bad request", e);
      ctx.status(HttpStatus.BAD_REQUEST);
      ctx.json(new Document("error", e.getMessage()));
    });

    app.exception(Exception.class, (e, ctx) -> {
      HttpResponseException httpResponseException = findHttpResponseException(e);
      if (httpResponseException != null) {
        ctx.status(httpResponseException.getStatus());
        ctx.json(new Document("error", httpResponseException.getMessage()));
        return;
      }
      LOGGER.error("Unhandled server error", e);
      ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
      ctx.json(new Document("error", "Internal server error"));
    });
  }

  /**
   * Searches the exception chain for an instance of HttpResponseException. If
   * found, it returns the exception; otherwise, it returns null.
   * This method allows us to determine if an exception in the chain is an
   * HttpResponseException, which contains specific HTTP status and message
   * information that we can use to construct the response.
   *
   * @param throwable The throwable to search through for an
   *                  HttpResponseException.
   * @return The HttpResponseException if found, otherwise null.
   */
  private static HttpResponseException findHttpResponseException(Throwable throwable) {
    Throwable current = throwable;
    while (current != null) {
      if (current instanceof HttpResponseException exception) {
        return exception;
      }
      current = current.getCause();
    }
    return null;
  }
}
