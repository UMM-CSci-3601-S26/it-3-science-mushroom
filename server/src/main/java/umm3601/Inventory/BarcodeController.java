package umm3601.Inventory;

import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Updates.inc;

import static com.mongodb.client.model.ReturnDocument.AFTER;
import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.Sorts;
import static com.mongodb.client.model.Updates.addToSet;
import static com.mongodb.client.model.Updates.combine;

import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import umm3601.Controller;

public class BarcodeController implements Controller {
    private static final String API_BARCODE_LOOKUP = "/api/barcode/lookup/{code}"; // find barcode in internal system
    private static final String API_BARCODE_NEXT = "/api/barcode/next";
    private static final String API_BARCODE_QTY = "/api/inventory/{id}/quantity";
    private static final String API_LINK_EXTERNAL_BARCODE = "/api/inventory/{internalID}/link-barcode";

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

    Bson filter;

    if (code.startsWith("ITEM-")) {
      filter = eq("internalBarcode", code);
    } else {
      filter = Filters.in("externalBarcode", code);
    }

    Inventory inv = inventoryCollection.find(filter).first();

    if (inv == null) {
      throw new NotFoundResponse("No item found for barcode: " + code);
    }

    ctx.json(inv);
    ctx.status(HttpStatus.OK);
  }

  public void addInventory(Context ctx) {
    Inventory newItem = ctx.bodyAsClass(Inventory.class);

    boolean noInternal = newItem.internalBarcode == null || newItem.internalBarcode.isBlank();
    boolean noExternal = newItem.externalBarcode == null || newItem.externalBarcode.isEmpty();

    if (noInternal && noExternal) {
    throw new BadRequestResponse("Either internalBarcode or externalBarcode is required");
    }

    inventoryCollection.insertOne(newItem);
    ctx.json(newItem);
    ctx.status(HttpStatus.CREATED);
  }

  public void updateQuantity(Context ctx) {
    String id = ctx.pathParam("id");
    Document body = ctx.bodyAsClass(Document.class);
    String action = body.getString("action");
    Integer amount = body.getInteger("amount");

    if (!"add".equals(action) && !"remove".equals(action)) {
      throw new BadRequestResponse("action must be 'add' or 'remove'");
    }

    if (amount == null || amount < 1) {
      amount = 1;
    }

    int delta = "add".equals(action) ? amount : -amount;

    Bson filter;
    try {
      if (id.startsWith("ITEM-")) {
        filter = eq("internalBarcode", id);
      } else {
        filter = Filters.in("externalBarcode", id);
      }
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("Invalid inventory ID.");
    }

    Inventory updated = inventoryCollection.findOneAndUpdate(filter, inc("quantity", delta),
     new FindOneAndUpdateOptions().returnDocument(AFTER));
    if (updated == null) {
      throw new NotFoundResponse("Inventory item not found for ID: " + id);
    }
    ctx.json(updated);
    ctx.status(HttpStatus.OK);
  }

  public void linkExternalBarcode(Context ctx) {
    String internalID = ctx.pathParam("internalID");
    Document body = ctx.bodyAsClass(Document.class);
    String barcode = body.getString("barcode");
    Integer quantity = body.getInteger("quantity");

    if (barcode == null || barcode.isBlank()) {
      throw new BadRequestResponse("barcode is required");
    }

    if (quantity == null || quantity < 1) {
      quantity = 1;
    }

    Inventory updated = inventoryCollection.findOneAndUpdate(eq("internalID", internalID),
    combine(addToSet("externalBarcode", barcode),
     inc("quantity", quantity)),
      new FindOneAndUpdateOptions().returnDocument(AFTER));

    if (updated == null) {
      throw new NotFoundResponse("Inventory item not found for internalID" + internalID);
    }

    ctx.json(updated);
    ctx.status(HttpStatus.OK);
  }
  @Override
  public void addRoutes(Javalin server) {
    server.get(API_BARCODE_LOOKUP, this::lookupBarcode);
    server.get(API_BARCODE_NEXT, this::getNextBarcode);
    server.post(API_BARCODE_QTY, this::updateQuantity);
    server.patch(API_LINK_EXTERNAL_BARCODE, this::linkExternalBarcode);
  }
}
