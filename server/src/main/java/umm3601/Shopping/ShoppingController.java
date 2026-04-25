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

// Controller for shopping items
public class ShoppingController implements Controller {
  // API Endpoint
  private static final String API_SHOPPING = "/api/shopping";

  // Database Collections
  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<SupplyList> supplyListCollection;
  private final JacksonMongoCollection<Inventory> inventoryCollection;

  // Database Constructor
  public ShoppingController(MongoDatabase database) {
    familyCollection = JacksonMongoCollection.builder().build(
      database,
      "family",
      Family.class,
      UuidRepresentation.STANDARD);
    supplyListCollection = JacksonMongoCollection.builder().build(
      database,
       "supplyLists",
        SupplyList.class,
         UuidRepresentation.STANDARD);
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD);
  }

  // get school and grade totals
  private Map<String, Map<String, Integer>> getSchoolGradeTotals() {
    ArrayList<Family> allFamilies = familyCollection.find().into(new ArrayList<>());
    Map<String, Map<String, Integer>> schoolGradeTotals = new HashMap<>();

    for (Family family : allFamilies) {
      if (family.students == null) continue;

      for (Family.StudentInfo student : family.students) {
        schoolGradeTotals.computeIfAbsent(student.school, school -> new HashMap<>()).merge(student.grade, 1, Integer::sum);
      }
    }
    return schoolGradeTotals;
  }

  // get supplylist totals based on school and grade totals
  // current issue with how family and supply lists data is formatted with school and grade, not being the same format.
  private Map<SupplyList, Integer> getSupplyListTotals(Map<String, Map<String, Integer>> schoolGradeTotals) {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    Map<SupplyList, Integer> supplyListTotals = new HashMap<>();

    // loop through each supply list
    for (SupplyList supplyList : allSupplyLists) {
      int totalNeeded = 0;

      // loop through each school
      for (Map.Entry<String, Map<String, Integer>> schoolEntry : schoolGradeTotals.entrySet()) {
        String school = schoolEntry.getKey();
        Map<String, Integer> gradeTotals = schoolEntry.getValue();

        // loop through each grade
        for (Map.Entry<String, Integer> gradeEntry : gradeTotals.entrySet()) {
          String grade = gradeEntry.getKey();
          int numStudents = gradeEntry.getValue();

          // if the supply list matches the school and grade, add the quantity needed for that supply list to the total needed
          if (supplyList.school.equals(school) && supplyList.grade.equals(grade)) {
            totalNeeded += numStudents * supplyList.quantity;
          }
        }
      }
      supplyListTotals.put(supplyList, totalNeeded);
    }
    return supplyListTotals;
  }


  // get inventory
  private List<Inventory> getInventory() {
    return inventoryCollection.find().into(new ArrayList<>());
  }

  // get shopping items based on supplylist totals and inventory totals,
  // must fulfill specific request first with best matching items
  public void getShoppingItems(Context ctx) {
  Map<String, Map<String, Integer>> schoolGradeTotals = getSchoolGradeTotals();
  Map<SupplyList, Integer> supplyListTotals = getSupplyListTotals(schoolGradeTotals);
  List<Inventory> inventory = getInventory();

  List<Shopping> shoppingItems = new ArrayList<>();
  ctx.json(schoolGradeTotals);
  ctx.status(HttpStatus.OK);
}

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_SHOPPING, this::getShoppingItems);
  }
}
