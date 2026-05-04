// Package
package umm3601;

// Com imports
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;

// Javalin imports
import io.javalin.Javalin;

// App imports
import umm3601.Auth.AuthController;
import umm3601.Auth.PermissionsService;
import umm3601.Auth.RouteRegistrar;
import umm3601.Common.ApiExceptionHandler;
import umm3601.Family.FamilyController;
import umm3601.Family.FamilyPortalController;
import umm3601.Inventory.BarcodeController;
import umm3601.Inventory.InventoryController;
import umm3601.Middleware.AuthMiddleware;
import umm3601.Settings.SettingsController;
import umm3601.StockReport.StockReportController;
import umm3601.SupplyList.SupplyListController;
import umm3601.Terms.TermsController;
import umm3601.Users.UsersController;
import umm3601.Users.UsersPolicy;
import umm3601.Users.UsersService;
import umm3601.Users.UsersValidator;

/**
 * Bootstrap is the entry point for the application. It wires together the
 * controllers, services, and database connection, then starts the Javalin
 * server.
 */
public class Bootstrap {
  private static final int DEFAULT_PORT = 4567;

  // Prevent instantiation since this class is just a container for the main
  // method.
  public static void start() {
    String jwtSecret = System.getenv("JWT_SECRET");
    if (jwtSecret == null || jwtSecret.isBlank()) {
      throw new IllegalStateException("JWT_SECRET must be set");
    }

    MongoDatabase db = connectToDatabase();

    UsersService usersService = new UsersService(db);
    PermissionsService permissionsService = new PermissionsService(db);
    AuthMiddleware authMiddleware = new AuthMiddleware(jwtSecret, usersService);

    Javalin app = createApp(authMiddleware);
    Object[] controllers = buildControllers(db, jwtSecret, usersService, permissionsService);
    registerRoutes(app, permissionsService, controllers);
    app.start(getPort());
  }

  // Helper methods for bootstrapping the app. These are kept separate from the
  // main method for readability and testability.
  private static String getEnv(String key, String fallback) {
    return System.getenv().getOrDefault(key, fallback);
  }

  // Connect to MongoDB using the address and database name from environment
  // variables, with defaults for local development.
  private static MongoDatabase connectToDatabase() {
    String mongoAddr = getEnv("MONGO_ADDR", "localhost");
    String dbName = getEnv("MONGO_DB", "dev");
    MongoClient mongoClient = DatabaseConfig.configureDatabase(mongoAddr);
    return mongoClient.getDatabase(dbName);
  }

  // Create a Javalin app with global middleware and exception handling.
  private static Javalin createApp(AuthMiddleware authMiddleware) {
    Javalin app = Javalin.create();
    ApiExceptionHandler.register(app);
    app.get("/api/health", ctx -> ctx.result("ok"));
    app.before(authMiddleware::handle);
    return app;
  }

  // Instantiate the controllers with their required dependencies. This keeps the
  // main method clean and makes it easier to test controllers in isolation.
  private static Object[] buildControllers(
      MongoDatabase db,
      String jwtSecret,
      UsersService usersService,
      PermissionsService permissionsService) {
    AuthController authController = new AuthController(usersService, jwtSecret, permissionsService);
    UsersController usersController = new UsersController(
        usersService,
        new UsersPolicy(),
        new UsersValidator(permissionsService));
    FamilyController familyController = new FamilyController(db);
    SettingsController settingsController = new SettingsController(db);

    return new Object[] {
        new InventoryController(db),
        new BarcodeController(db),
        familyController,
        new FamilyPortalController(familyController, settingsController, usersService),
        new SupplyListController(db),
        settingsController,
        new StockReportController(db),
        new TermsController(db),
        authController,
        usersController
    };
  }

  // Register the routes for each controller with the Javalin app.
  private static void registerRoutes(Javalin app, PermissionsService permissionsService, Object[] controllers) {
    for (Object controller : controllers) {
      RouteRegistrar.register(app, controller, permissionsService);
    }
  }

  // Get the port number from the environment variable or use the default. This
  // allows flexibility for deployment while providing a sensible default for
  // local development.
  private static int getPort() {
    String port = getEnv("PORT", Integer.toString(DEFAULT_PORT));
    try {
      return Integer.parseInt(port);
    } catch (NumberFormatException e) {
      return DEFAULT_PORT;
    }
  }
}
