// Package declaration
package umm3601.Common;

// Static Imports
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.regex;

// Java Imports
import java.util.List;
import java.util.regex.Pattern;

// Org Imports
import org.bson.Document;
import org.bson.conversions.Bson;

/**
 * MongoFilters is a utility class that provides helper methods for constructing
 * common MongoDB filter queries. It includes methods for creating case-insensitive
 * exact match filters and combining multiple filters with a logical AND
 * operation. By centralizing these filter construction methods, MongoFilters
 * promotes code reuse and consistency across the application when querying
 * MongoDB collections.
 *
 * Functions provided by this class include:
 * - caseInsensitiveExact(String field, String value)
 * - andAll(List<Bson> filters)
 *
 * Why use a MongoFilters class?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * A MongoFilters class centralizes common filter construction logic, reducing
 * code duplication and improving readability. It provides a clear and
 * consistent way to create complex MongoDB queries, making it easier for
 * other developers to understand and maintain the codebase. By abstracting away the
 * details of filter construction, it allows developers to focus on the business
 * logic of their queries rather than the specifics of MongoDB's query syntax.
 * Additionally, it promotes best practices for constructing filters, such as
 * using case-insensitive matching when appropriate, which can help prevent bugs
 * and improve the user experience when searching for data in the database.
 */

public final class MongoFilters {
  private MongoFilters() {
    // Private constructor to prevent instantiation
  }

  /**
   * Creates a case-insensitive exact match filter for the specified field and value.
   * This method constructs a regular expression pattern that matches the exact value
   * while ignoring case sensitivity. The resulting filter can be used in MongoDB
   * queries to find documents where the specified field matches the given value,
   * regardless of the case of the characters.
   *
   * @param field the field to match
   * @param value the value to match
   * @return a BSON filter for the specified field and value
   */
  public static Bson caseInsensitiveExact(String field, String value) {
    Pattern pattern = Pattern.compile(Pattern.quote(value), Pattern.CASE_INSENSITIVE);
    return regex(field, pattern);
  }

  /**
   * Combines a list of BSON filters into a single filter using a logical AND operation.
   * If the list of filters is empty, it returns an empty filter that matches all documents.
   * This method is useful for constructing complex queries that require multiple conditions
   * to be satisfied simultaneously. By using this method, developers can easily combine
   * multiple filters without having to manually construct the logical AND syntax for MongoDB queries.
   *
   * @param filters the list of BSON filters to combine
   * @return a single BSON filter that represents the logical AND of the provided filters
   */
  public static Bson andAll(List<Bson> filters) {
    return filters.isEmpty() ? new Document() : and(filters);
  }
}
