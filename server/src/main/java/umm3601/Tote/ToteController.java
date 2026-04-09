package umm3601.Tote;

import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Updates.popFirst;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;

import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.ConflictResponse;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import umm3601.Controller;
import umm3601.Inventory.Inventory;

public class ToteController implements Controller {
  private static final String API_TOTES = "/api/totes";
  private static final String API_TOTE_BY_BARCODE = "/api/totes/{barcode}";
  private static final String API_TOTE_ADD = "/api/totes/{barcode}/add";
  private static final String API_TOTE_REMOVE = "/api/totes/{barcode}/remove";
  private static final String API_TOTE_MOVE = "/api/totes/move";

  private final JacksonMongoCollection<Tote> toteCollection;
  private final JacksonMongoCollection<Inventory> inventoryCollection;

  public ToteController(MongoDatabase database) {
    toteCollection = JacksonMongoCollection.builder().build(
      database,
      "totes",
      Tote.class,
      UuidRepresentation.STANDARD
    );

    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );
  }

  public void getTote(Context ctx) {
    String toteBarcode = normalizeBarcode(ctx.pathParam("barcode"));
    Tote tote = requireTote(toteBarcode);

    ctx.json(tote);
    ctx.status(HttpStatus.OK);
  }

  public void createTote(Context ctx) {
    Tote newTote = ctx.bodyAsClass(Tote.class);
    String toteBarcode = normalizeBarcode(newTote.toteBarcode);
      if (toteBarcode.isBlank()) {
        throw new BadRequestResponse("toteBarcode is required");
      }

      if (toteCollection.find(eq("toteBarcode", toteBarcode)).first() != null) {
        throw new ConflictResponse("A tote with barcode" + toteBarcode + "already exists");
      }

      newTote.toteBarcode = toteBarcode;
      newTote.name = cleanOptionalText(newTote.name);
      newTote.notes = cleanOptionalText(newTote.notes);
      newTote.contents = newTote.contents == null ? new ArrayList<>() : newTote.contents;

      toteCollection.insertOne(newTote);
      ctx.json(newTote);
      ctx.status(HttpStatus.CREATED);
  }

  public void addItemToTote(Context ctx) {
    String toteBarcode = normalizeBarcode(ctx.pathParam("barcode"));
    ToteQuantityChangeRequest request = ctx.bodyAsClass(ToteQuantityChangeRequest.class);
    validateQuantityChange(request);

    Tote tote = requireTote(toteBarcode);
    Inventory inventoryItem = requireInventory(request.internalID);

    int allocatedQuantity = getAllocatedQuantity(request.internalID);
    int remainingAvailable = inventoryItem.quantity - allocatedQuantity;

    if (request.quantity > remainingAvailable) {
      throw new BadRequestResponse("Not Enough unallocated inventory is avaliable to place item in this tote");
    }

    addQuantity(tote, request.internalID, request.quantity);
    toteCollection.save(tote);
    ctx.json(tote);
    ctx.status(HttpStatus.OK);
  }

  public void removeItemFromTote(Context ctx) {
    String toteBarcode = normalizeBarcode(ctx.pathParam("barcode"));
    ToteQuantityChangeRequest request = ctx.bodyAsClass(ToteQuantityChangeRequest.class);
    validateQuantityChange(request);

    Tote tote = requireTote(toteBarcode);
    removeQuantity(tote, request.internalID, request.quantity);

    toteCollection.save(tote);
    ctx.json(tote);
    ctx.status(HttpStatus.OK);
  }

  public void moveItemBetweenTotes(Context ctx) {
    MoveToteItemRequest request = ctx.bodyAsClass(MoveToteItemRequest.class);

    String fromToteBarcode = normalizeBarcode(request.fromToteBarcode);
    String toToteBarcode = normalizeBarcode(request.toToteBarcode);

    if (fromToteBarcode.isBlank() || toToteBarcode.isBlank()) {
      throw new BadRequestResponse("Both fromToteBarcode and toToteBarcode are required.");
    }

    if (fromToteBarcode.equals(toToteBarcode)) {
      throw new BadRequestResponse("Source and destination totes must be different.");
    }

    if (request.quantity < 1) {
      throw new BadRequestResponse("quantity must be greater than 0");
    }

    requireInventory(request.internalID);

    Tote fromTote = requireTote(fromToteBarcode);
    Tote toTote = requireTote(toToteBarcode);

    removeQuantity(fromTote, request.internalID, request.quantity);
    addQuantity(toTote, request.internalID, request.quantity);

    toteCollection.save(fromTote);
    toteCollection.save(toTote);

    ctx.json(new Document()
      .append("fromToteBarcode", fromToteBarcode)
      .append("toToteBarcode", toToteBarcode)
      .append("internalID", request.internalID)
      .append("quantity", request.quantity));
    ctx.status(HttpStatus.OK);
  }

  private Inventory requireInventory(String internalID) {
    if (internalID == null || internalID.isBlank()) {
      throw new BadRequestResponse("internalID is required");
    }

    Inventory inventory = inventoryCollection.find(eq("internalID", internalID)).first();
    if (inventory == null) {
      throw new NotFoundResponse("No inventory item found for internalID: " + internalID);
    }
    return inventory;
  }

  private void validateQuantityChange(ToteQuantityChangeRequest request) {
    if (request.internalID == null || request.internalID.isBlank()) {
      throw new BadRequestResponse("internalID is required");
    }

    if (request.quantity < 1) {
      throw new BadRequestResponse("quantity must be greater than 0");
    }
  }

  private int getAllocatedQuantity(String internalID) {
    List<Tote> totes = toteCollection.find().into(new ArrayList<>());
    int allocatedQuantity = 0;

    for (Tote tote : totes) {
      if (tote.contents == null) {
        continue;
      }
      for (ToteEntry entry : tote.contents) {
        if (entry != null && internalID.equals(entry.internalID)) {
          allocatedQuantity += entry.quantity;
        }
      }
    }

    return allocatedQuantity;
  }

  private void addQuantity(Tote tote, String internalID, int quantity) {
    ensureContentsList(tote);

    for (ToteEntry entry : tote.contents) {
      if (internalID.equals(entry.internalID)) {
        entry.quantity += quantity;
        return;
      }
    }

    ToteEntry entry = new ToteEntry();
    entry.internalID = internalID;
    entry.quantity = quantity;
    tote.contents.add(entry);
  }

  private void removeQuantity(Tote tote, String internalID, int quantity) {
    ensureContentsList(tote);

    ToteEntry entry = null;
    for (ToteEntry currentEntry : tote.contents) {
      if (internalID.equals(currentEntry.internalID)) {
        entry = currentEntry;
        break;
      }
    }

    if (entry == null) {
      throw new NotFoundResponse("The requested inventory item is not currently in this tote.");
    }

    if (quantity > entry.quantity) {
      throw new BadRequestResponse("Cannot remove more than the quantity currently in the tote.");
    }

    entry.quantity -= quantity;
    if (entry.quantity == 0) {
      tote.contents.remove(entry);
    }
  }

  private void ensureContentsList(Tote tote) {
    if (tote.contents == null) {
      tote.contents = new ArrayList<>();
    }
  }

  public String normalizeBarcode(String barcode) {
    return barcode == null ? "" : barcode.trim().toUpperCase();
  }

  private String cleanOptionalText(String value) {
    if (value == null) {
      return null;
    }
    String cleaned = value.trim();
    return cleaned.isEmpty() ? null : cleaned;
  }

  public Tote requireTote(String toteBarcode) {
    Tote tote = toteCollection.find(eq("toteBarcode", toteBarcode)).first();
    if (tote == null){
      throw new NotFoundResponse("Tote could not be found" + toteBarcode);
    }

    if (tote.contents == null) {
      tote.contents = new ArrayList<>();
    }
    return tote;
  }
  @Override
  public void addRoutes(Javalin server) {
    server.get(API_TOTE_BY_BARCODE, this::getTote);
    server.post(API_TOTES, this::createTote);
    server.post(API_TOTE_ADD, this::addItemToTote);
    server.post(API_TOTE_REMOVE, this::removeItemFromTote);
    server.post(API_TOTE_MOVE, this::moveItemBetweenTotes);
  }
}
