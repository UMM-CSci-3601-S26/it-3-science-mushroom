package umm3601;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;

import io.javalin.Javalin;
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


public class Bootstrap {
  private static final int DEFAULT_PORT = 4567;

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

  private static String getEnv(String key, String fallback) {
    return System.getenv().getOrDefault(key, fallback);
  }

  private static MongoDatabase connectToDatabase() {
    String mongoAddr = getEnv("MONGO_ADDR", "localhost");
    String dbName = getEnv("MONGO_DB", "dev");
    MongoClient mongoClient = DatabaseConfig.configureDatabase(mongoAddr);
    return mongoClient.getDatabase(dbName);
  }

  private static Javalin createApp(AuthMiddleware authMiddleware) {
    Javalin app = Javalin.create();
    ApiExceptionHandler.register(app);
    app.get("/api/health", ctx -> ctx.result("ok"));
    app.before(authMiddleware::handle);
    return app;
  }

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

  private static void registerRoutes(Javalin app, PermissionsService permissionsService, Object[] controllers) {
    for (Object controller : controllers) {
      RouteRegistrar.register(app, controller, permissionsService);
    }
  }

  private static int getPort() {
    String port = getEnv("PORT", Integer.toString(DEFAULT_PORT));
    try {
      return Integer.parseInt(port);
    } catch (NumberFormatException e) {
      return DEFAULT_PORT;
    }
  }
}
