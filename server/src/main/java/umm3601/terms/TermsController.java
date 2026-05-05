// Package
package umm3601.Terms;

// Java imports
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

// Org imports
import org.bson.Document;

// Com imports
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

// Javalin imports
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

// App imports
import umm3601.Auth.HttpMethod;
import umm3601.Auth.Route;

/**
 * Controller that aggregates distinct vocabulary terms from both the
 * supplylist and inventory collections, providing a single endpoint
 * to power autocomplete on the add-item forms.
 */
public class TermsController {

  private static final String API_TERMS = "/api/terms";

  private final MongoCollection<Document> supplyListCollection;
  private final MongoCollection<Document> inventoryCollection;

  public TermsController(MongoDatabase database) {
    supplyListCollection = database.getCollection("supplylist");
    inventoryCollection = database.getCollection("inventory");
  }

  /**
   * getTerms merges distinct values from supplylist and inventory collections for each of the term categories:
   * item, brand, color, size, type, and material. It normalizes the terms by trimming whitespace and converting
   * plurals to singular form. The merged lists are case-insensitively deduplicated and sorted before being returned
   * as a JSON response with a 200 OK status.
   * @param ctx
   */
  @Route(method = HttpMethod.GET, path = API_TERMS)
  public void getTerms(Context ctx) {
    Terms terms = new Terms();

    terms.item = merge(
      distinctStrings(supplyListCollection, "item"),
      distinctStrings(inventoryCollection, "item")
    );

    terms.brand = merge(
      distinctStrings(supplyListCollection, "brand.allOf"),
      distinctStrings(supplyListCollection, "brand.anyOf"),
      distinctStrings(inventoryCollection, "brand")
    );

    terms.color = merge(
      distinctStrings(supplyListCollection, "color.allOf"),
      distinctStrings(supplyListCollection, "color.anyOf"),
      distinctStrings(inventoryCollection, "color")
    );

    terms.size = merge(
      distinctStrings(supplyListCollection, "size.allOf"),
      distinctStrings(supplyListCollection, "size.anyOf"),
      distinctStrings(inventoryCollection, "size")
    );

    terms.type = merge(
      distinctStrings(supplyListCollection, "type.allOf"),
      distinctStrings(supplyListCollection, "type.anyOf"),
      distinctStrings(inventoryCollection, "type")
    );

    terms.material = merge(
      distinctStrings(supplyListCollection, "material.allOf"),
      distinctStrings(supplyListCollection, "material.anyOf"),
      distinctStrings(inventoryCollection, "material")
    );

    ctx.json(terms);
    ctx.status(HttpStatus.OK);
  }

  /**
   * Runs MongoDB distinct(), strips blank values, and normalizes to singular form.
   */
  private List<String> distinctStrings(MongoCollection<Document> collection, String field) {
    List<String> result = new ArrayList<>();
    collection.distinct(field, String.class)
        .forEach(v -> {
          if (v != null && !v.isBlank()) {
            if (v.endsWith("s") && !v.endsWith("ss")) {
              String singular = singularize(v.trim());
              result.add(singular);
            } else {
              result.add(v.trim());
            }
          }
        });
    return result;
  }

  /**
   * Naive English singularization for common plural forms.
   * Handles basic cases: boxes -> box, batteries -> battery, etc.
   * For more robust needs, use a library.
   */
  @SuppressWarnings("MagicNumber")
  public String singularize(String word) {
    if (word == null || word.isEmpty() || word.length() < 3) {
      return word;
    }
    String lower = word.toLowerCase();
    if (lower.endsWith("ies") && lower.length() > 3) {
      // batteries -> battery
      return word.substring(0, word.length() - 3) + "y";
    } else if (lower.endsWith("es") && lower.length() > 2) {
      // boxes -> box, matches -> match
      return word.substring(0, word.length() - 2);
    } else if (lower.endsWith("s") && lower.length() > 1 && !lower.endsWith("ss")) {
      // pens -> pen, but not 'glass' -> 'glas'
      return word.substring(0, word.length() - 1);
    }
    return word;
  }

  /** Merges multiple lists into one sorted, case-deduplicated list. */
  @SafeVarargs
  private List<String> merge(List<String>... lists) {
    TreeSet<String> set = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
    for (List<String> list : lists) {
      set.addAll(list);
    }
    return new ArrayList<>(set);
  }

}
