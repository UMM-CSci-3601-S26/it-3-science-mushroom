package umm3601.Inventory;

import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.or;
import static com.mongodb.client.model.Updates.inc;

import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Sorts;

import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import umm3601.Controller;

public class BarcodeController implements Controller {
    private static final String API_BARCODE_LOOKUP = "/api/barcode/{code}";
    private static final String API_BARCODE_NEXT = "/api/barcode/next";
    private static final String API_BARCODE_ADD = "/api/inventory";
    private static final String API_BARCODE_QTY = "/api/inventory/{id}/quantity";

    private final JacksonMongoCollection<Inventory> inventoryCollection;

    public BarcodeController(MongoDatabase database) {
        this.inventoryCollection = JacksonMongoCollection.builder().build(
          database,
          "inventory",
          Inventory.class,
          UuidRepresentation.STANDARD);
    }

    public void getNextBarcode(Context ctx) {
      Inventory last = inventoryCollection.find(new Document("internalBarcode", new Document("$exists", true)))
      .sort(Sorts.descending("internalBarcode"))
      .first();
      String prefix = "ITEM-";
      int next = 1;
      if (last != null && last.internalBarcode != null && last.internalBarcode.startsWith(prefix)) {
        try {
          next = Integer.parseInt(last.internalBarcode.substring(prefix.length())) + 1;
        } catch (NumberFormatException e) {
          // return 1 if not right format
      }
    }
    String nextCode = String.format("ITEM-%05d", next);
    ctx.json(new Document("internalBarcode", nextCode));
    ctx.status(HttpStatus.OK);
  }

  public void lookupBarcode(Context ctx) {
    String code = ctx.pathParam("code");

    Bson filter = or(
      eq("internalBarcode", code),
      eq("manufacturedBarcode", code)
    );

    Inventory inv = inventoryCollection.find(filter).first();

    if (inv == null) {
      throw new NotFoundResponse("No item found for barcode: " + code);
    }

    ctx.json(inv);
    ctx.status(HttpStatus.OK);
  }

  public void addInventory(Context ctx) {
    Inventory newItem = ctx.bodyAsClass(Inventory.class);

    if (newItem.item == null || newItem.item.isBlank()) {
      throw new BadRequestResponse("Item name is required.");
    }

    if (newItem.internalBarcode == null || newItem.internalBarcode.isBlank()) {
      throw new BadRequestResponse("Internal barcode is required");
    }

    inventoryCollection.insertOne(newItem);
    ctx.json(newItem);
    ctx.status(HttpStatus.CREATED);
  }

  public void updateQuantity(Context ctx) {
    String id = ctx.pathParam("id");
    Document body = ctx.bodyAsClass(Document.class);
    String action = body.getString("action");

    if (!"add".equals(action) && !"remove".equals(action)) {
      throw new BadRequestResponse("action must be 'add' or 'remove'");
    }

    int delta = "add".equals(action) ? 1 : -1;

    Bson filter;
    try {
      filter = eq("_id", new ObjectId(id));
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("Invalid inventory ID.");
    }

    Inventory updated = inventoryCollection.findOneAndUpdate(filter, inc("quantity", delta));
    if (updated == null) {
      throw new NotFoundResponse("Inventory item not found for ID: " + id);
    }
    ctx.json(updated);
    ctx.status(HttpStatus.OK);
  }

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_BARCODE_LOOKUP, this::lookupBarcode);
    server.get(API_BARCODE_NEXT, this::getNextBarcode);
    server.post(API_BARCODE_ADD, this::addInventory);
    server.post(API_BARCODE_QTY, this::updateQuantity);
  }
}
