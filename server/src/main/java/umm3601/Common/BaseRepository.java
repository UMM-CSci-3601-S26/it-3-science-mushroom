// Package declaration
package umm3601.Common;

// Java Imports
import java.util.ArrayList;
import java.util.List;

// Org Imports
import org.bson.Document;
import org.bson.conversions.Bson;
import org.mongojack.JacksonMongoCollection;

/**
 * BaseRepository is an abstract class that provides common database operations
 * for repositories that interact with MongoDB collections using the
 * JacksonMongoCollection.
 *
 * It defines two protected methods:
 * - findAll(Bson filter)
 * - replaceAll(List<T> items)
 *
 * Why use a BaseRepository?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * A BaseRepository centralizes common database operations, reducing code
 * duplication across different repositories. By providing a shared implementation
 * of basic CRUD operations, it allows individual repositories to focus on
 * domain-specific logic while still having access to consistent and reusable
 * database interaction methods. This promotes cleaner code and easier maintenance,
 * as changes to common database operations can be made in one place rather than across multiple repositories.
 */

@SuppressWarnings({ "VisibilityModifier" })
public abstract class BaseRepository<T> {
  protected final JacksonMongoCollection<T> collection;

  protected BaseRepository(JacksonMongoCollection<T> collection) {
    this.collection = collection;
  }

  /**
   * Finds all documents in the collection that match the provided filter and
   * returns them as a list of objects of type T. The filter is a BSON document
   * that specifies the criteria for selecting documents from the collection.
   * This method abstracts away the details of querying the MongoDB collection,
   * allowing subclasses to easily retrieve data based on specific criteria
   * without needing to implement the query logic themselves.
   *
   * @param filter A BSON document that specifies the criteria for selecting documents from the collection.
   * @return A list of objects of type T that match the provided filter.
   */
  protected List<T> findAll(Bson filter) {
    return collection.find(filter).into(new ArrayList<>());
  }

  /**
   * Replaces all documents in the collection with the provided list of items. This
   * method first deletes all existing documents in the collection and then
   * inserts the new list of items. It abstracts away the details of modifying
   * the MongoDB collection, allowing subclasses to easily update the entire
   * collection with a new set of data without needing to implement the logic for
   * deleting and inserting documents themselves.
   *
   * @param items A list of objects of type T that will replace all existing documents in the collection.
   */
  protected void replaceAll(List<T> items) {
    collection.deleteMany(new Document());
    if (!items.isEmpty()) {
      collection.insertMany(items);
    }
  }
}
