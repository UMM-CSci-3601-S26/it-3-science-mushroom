package umm3601.Shopping;

// Java Imports
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Org Imports
import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

// Com Imports
import com.mongodb.client.MongoDatabase;

// IO Imports
import io.javalin.Javalin;
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
      "supplylist",
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
  // probably a more efficient way to do this, but this is straightforward and works for now
  private List<ShoppingSupplyList> getSupplyListTotals(Map<String, Map<String, Integer>> schoolGradeTotals) {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    List<ShoppingSupplyList> supplyListTotals = new ArrayList<>();

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
          if (supplyList.school.equals(school) && (supplyList.grade.equals(grade) || (supplyList.grade.equals("High School") && Arrays.asList("9","10","11","12").contains(grade)))) {
            int qty = supplyList.quantity != null ? supplyList.quantity : 1;
            totalNeeded += numStudents * qty;
          }
        }
      }
      if (totalNeeded > 0) {
        supplyListTotals.add(new ShoppingSupplyList(supplyList, totalNeeded));
      }
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
    List<ShoppingSupplyList> supplyListTotals = getSupplyListTotals(schoolGradeTotals);

    List<Inventory> inventory = getInventory();

    List<Shopping> shoppingItems = new ArrayList<>();

    // try to find exact match from inventory for each supply list item,
    // if not found, find closest match that satisfies the specifications of the supply list item with the highest quantity in inventory
    // if no match is found, add the supply list item to the shopping list with the quantity needed
    // if supply list item is partially fulfilled by inventory item, add the remaining quantity needed to the shopping list with the quantity needed
    // fill most specific items first, then less specific items, then least specific items
    // Cannot reuse inventory items, so if an inventory item is used, it is removed from the inventory list

    ctx.json(supplyListTotals);
    ctx.status(HttpStatus.OK);
  }

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_SHOPPING, this::getShoppingItems);
  }
}
