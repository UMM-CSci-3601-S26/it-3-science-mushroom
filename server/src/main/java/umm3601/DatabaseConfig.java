// Package
package umm3601;

// Com imports
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;

/**
 * DatabaseConfig is a utility class that provides a method to configure and
 * create a MongoClient instance based on a given host string. It ensures that
 * the host string is properly formatted with the correct MongoDB URI prefix.
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
