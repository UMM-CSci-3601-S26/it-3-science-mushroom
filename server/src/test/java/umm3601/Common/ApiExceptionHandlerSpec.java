package umm3601.Common;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;

import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.ExceptionHandler;
import io.javalin.http.HttpStatus;

@SuppressWarnings("unchecked")
class ApiExceptionHandlerSpec {

  @Mock
  private Javalin app;

  @Mock
  private Context ctx;

  private final Map<Class<?>, ExceptionHandler<?>> handlers = new HashMap<>();

  @BeforeEach
  void setup() {
    MockitoAnnotations.openMocks(this);
    when(app.exception(org.mockito.ArgumentMatchers.any(Class.class), org.mockito.ArgumentMatchers.any()))
        .thenAnswer(invocation -> {
          Class<?> type = invocation.getArgument(0);
          ExceptionHandler<?> handler = invocation.getArgument(1);
          handlers.put(type, handler);
          return app;
        });

    ApiExceptionHandler.register(app);
  }

  @Test
  void registerHooksExpectedExceptionHandlers() {
    assertTrue(handlers.containsKey(IllegalArgumentException.class));
    assertTrue(handlers.containsKey(Exception.class));
  }

  @Test
  void illegalArgumentMapsToBadRequest() throws Exception {
    ExceptionHandler<IllegalArgumentException> handler =
        (ExceptionHandler<IllegalArgumentException>) handlers.get(IllegalArgumentException.class);

    handler.handle(new IllegalArgumentException("bad input"), ctx);

    verify(ctx).status(HttpStatus.BAD_REQUEST);
    verify(ctx).json(new Document("error", "bad input"));
  }

  @Test
  @SuppressWarnings("MagicNumber")
  void wrappedHttpResponseExceptionUsesContainedStatusAndMessage() throws Exception {
    ExceptionHandler<Exception> handler = (ExceptionHandler<Exception>) handlers.get(Exception.class);

    handler.handle(new BadRequestResponse("payload invalid"), ctx);

    verify(ctx).status(400);
    ArgumentCaptor<Document> docCaptor = ArgumentCaptor.forClass(Document.class);
    verify(ctx).json(docCaptor.capture());
    assertNotNull(docCaptor.getValue().get("error"));
  }

  @Test
  void genericExceptionReturnsInternalServerError() throws Exception {
    ExceptionHandler<Exception> handler = (ExceptionHandler<Exception>) handlers.get(Exception.class);

    handler.handle(new RuntimeException("boom"), ctx);

    verify(ctx).status(HttpStatus.INTERNAL_SERVER_ERROR);
    verify(ctx).json(new Document("error", "Internal server error"));
  }
}
