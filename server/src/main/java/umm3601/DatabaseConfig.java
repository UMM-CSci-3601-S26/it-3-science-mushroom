package umm3601;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;

/**
 * Utility class for server configuration, such as database connection setup.
 * This is not intended to be instantiated, but rather to provide static helper
 * methods for other classes in the server package.
 *
 * Server no longer directly start the server or manage the application
 * lifecycle, so this class is focused on database configuration. Server startup
 * and lifecycle management is now handled by Bootstrap.java, which allows for
 * better separation of concerns and easier testing.
 */
public class DatabaseConfig {
  public static MongoClient configureDatabase(String host) {
    String normalized = host == null ? "" : host.trim();
    if (!normalized.startsWith("mongodb://") && !normalized.startsWith("mongodb+srv://")) {
      normalized = "mongodb://" + normalized;
    }
    return MongoClients.create(normalized);
  }
}
