package umm3601.Inventory;

import org.bson.Document;
import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;

public class InventoryIdService {
  private final JacksonMongoCollection<Inventory> inventoryCollection;

  public InventoryIdService(MongoDatabase database) {
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );
  }

  public String formatInternalID(int n) {
    return String.format("ID-%05d", n);
  }

  public String formatInternalBarcode(int n) {
    return String.format("ITEM-%05d", n);
  }

  public int getNextSequence() {
    Inventory maxIdItem = inventoryCollection
      .find(Filters.and(
        Filters.exists("internalID", true), Filters.ne("internalID", null)))
      .sort(Sorts.descending("internalID")).first();

    Inventory maxBarcodeItem = inventoryCollection
      .find(Filters.and(
        Filters.exists("internalBarcode", true), Filters.ne("internalBarcode", null)))
      .sort(Sorts.descending("internalBarcode")).first();

    int idNum = extractNumber(maxIdItem != null ? maxIdItem.internalID : null);
    int barcodeNum = extractNumber(maxBarcodeItem != null ? maxBarcodeItem.internalBarcode : null);
    return Math.max(idNum, barcodeNum) + 1;
  }

  public String generateNextID() {
    Inventory last = inventoryCollection.find(new Document("internalID", new Document("$exists", true)))
      .sort(Sorts.descending("internalID"))
      .first();
    String prefix = "ID-";
    int next = 1;
    if (last != null && last.internalID != null && last.internalID.startsWith(prefix)) {
      try {
        next = Integer.parseInt(last.internalID.substring(prefix.length())) + 1;
      } catch (NumberFormatException e) {
        // return 1 if not right format
      }
    }
    return formatInternalID(next);
  }

  private int extractNumber(String value) {
    if (value == null) {
      return 0;
    }

    String digits = value.replaceAll("\\D", "");
    if (digits.isBlank()) {
      return 0;
    }

    try {
      return Integer.parseInt(digits);
    } catch (NumberFormatException e) {
      // If the numeric value is too large or otherwise unparsable, fall back to 0.
      return 0;
    }
  }
}
