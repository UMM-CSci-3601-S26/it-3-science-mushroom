package umm3601.Shopping;

// Static Imports
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.regex;

// Java Imports
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

// Org Imports
import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

// Com Imports
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Updates;
import com.mongodb.client.result.DeleteResult;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

import umm3601.Controller;
import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;
import umm3601.Family.Family;

public class ShoppingController implements Controller {
  private static final String API_SHOPPING = "/api/shopping";

  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<SupplyList> supplyListCollection;
  private final JacksonMongoCollection<Inventory> inventoryCollection;

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_SHOPPING);
  }
}
