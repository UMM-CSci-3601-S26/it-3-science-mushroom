package umm3601.Demand;

import static com.mongodb.client.model.Filters.eq;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Updates;

import io.javalin.http.NotFoundResponse;
import umm3601.Family.Family;
import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

public class DemandService {
  private static final int INVALID_LINK_PERCENTAGE_FILLED = -2;
  private static final int PERCENT_SCALE = 100;
  private static final String INTERNAL_INVENTORY_ID_PATTERN = "^ID-\\d{4,5}$";

  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<SupplyList> supplyListCollection;

  public DemandService(MongoDatabase database) {
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );

    familyCollection = JacksonMongoCollection.builder().build(
      database,
      "family",
      Family.class,
      UuidRepresentation.STANDARD
    );

    supplyListCollection = JacksonMongoCollection.builder().build(
      database,
      "supplylist",
      SupplyList.class,
      UuidRepresentation.STANDARD
    );
  }

  /**
   * Calculates the calculatedStockState and calculatedMinQuantity of items based on
   * number of students under each teacher, grade, and school.
   *
   * @return summary counts for the demand calculation run
   */
  @SuppressWarnings({ "checkstyle:MethodLength" })
  public DemandCalculationResult calculatePredictedStockStates() {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    Map<String, Map<String, Map<String, Integer>>> studentTotals = getSchoolGradeTeacherTotals();
    long totalSupplyLists = supplyListCollection.countDocuments();

    long validInvIDCount = 0;
    long invalidInvIDCount = 0;
    long bestMatchNullCount = 0;
    long schoolCount = 0;

    // loop through each supply list
    for (SupplyList supplyList : allSupplyLists) {
      int totalNeeded = 0;

      if (supplyList.school == null || supplyList.grade == null || supplyList.teacher == null) {
        continue; // Skip if any of the fields are null
      }

      // Find first properly formatted invID
      String validInvID = null;
      for (String invID : inventoryIds(supplyList)) {
        if (isInternalInventoryId(invID)) {
          validInvID = invID;
          validInvIDCount++;
          break;
        }
      }

      if (validInvID == null) { // No properly formatted ID found
        invalidInvIDCount++;
        supplyList.percentageFilled = INVALID_LINK_PERCENTAGE_FILLED;
        supplyListCollection.updateOne(
          eq("_id", new ObjectId(supplyList._id)),
          Updates.set("percentageFilled", supplyList.percentageFilled));
        continue; // Skip to next supply list
      }

      Inventory bestMatch = inventoryCollection.find(eq("internalID", validInvID)).first();

      if (bestMatch == null) {
        bestMatchNullCount++;
        continue; // Skip if no matching inventory item is found
      }

      // loop through each school
      for (Map.Entry<String, Map<String, Map<String, Integer>>> schoolEntry : studentTotals.entrySet()) {
        String school = schoolEntry.getKey();
        Map<String, Map<String, Integer>> gradeTotals = schoolEntry.getValue();

        // loop through each grade
        for (Map.Entry<String, Map<String, Integer>> gradeEntry : gradeTotals.entrySet()) {
          String grade = gradeEntry.getKey();
          Map<String, Integer> teacherTotals = gradeEntry.getValue();

          // loop through each teacher
          for (Map.Entry<String, Integer> teacherEntry : teacherTotals.entrySet()) {
            String teacher = teacherEntry.getKey();
            int numStudents = teacherEntry.getValue();

            // if the supply list matches the school, grade, and teacher,
            // add the quantity needed for that supply list to the total needed
            if (supplyList.school.equals(school)
                && supplyList.grade.equals(grade)
                && supplyList.teacher.equals(teacher)) {
              int qty = supplyList.quantity != null ? supplyList.quantity : 1;
              totalNeeded += numStudents * qty;

              schoolCount++;

              // Use the first linked item to update its calculatedMinQuantity.
              bestMatch.calculatedMinQuantity = totalNeeded;
              bestMatch.calculatedStockState = calculateStockState(bestMatch);
              inventoryCollection.updateOne(
                eq("_id", new ObjectId(bestMatch._id)),
                Updates.set("calculatedMinQuantity", bestMatch.calculatedMinQuantity));
              inventoryCollection.updateOne(
                eq("_id", new ObjectId(bestMatch._id)),
                Updates.set("calculatedStockState", bestMatch.calculatedStockState));

              // Combine quantity from all valid invIDs in the supply list to calculate percentageFilled
              int requestedQuantity = 0;
              for (String invID : inventoryIds(supplyList)) {
                if (isInternalInventoryId(invID)) {
                  Inventory inv = inventoryCollection.find(eq("internalID", invID)).first();
                  if (inv != null) {
                    requestedQuantity += inv.quantity;
                  }
                }
              }

              int percentageFilled = requestedQuantity > 0
                ? (int) (Math.round((double) requestedQuantity / totalNeeded * PERCENT_SCALE))
                : 0;
              supplyList.percentageFilled = percentageFilled;
              supplyListCollection.updateOne(
                eq("_id", new ObjectId(supplyList._id)),
                Updates.set("percentageFilled", supplyList.percentageFilled));
            }
          }
        }
      }
    }

    return new DemandCalculationResult(
      totalSupplyLists,
      validInvIDCount,
      invalidInvIDCount,
      bestMatchNullCount,
      schoolCount
    );
  }

  /**
   * Gets the total number of students in each school and grade.
   *
   * @return a map of school to grade to teacher to student count
   */
  private Map<String, Map<String, Map<String, Integer>>> getSchoolGradeTeacherTotals() {
    ArrayList<Family> families = familyCollection.find().into(new ArrayList<>());
    Map<String, Map<String, Map<String, Integer>>> schoolGradeTeacherTotals = new HashMap<>();

    // Go through all the families
    for (Family family : families) {
      if (family == null || family.students == null) {
        continue;
      }

      // Go through all the students in that family
      for (Family.StudentInfo student : family.students) {
        if (student == null) {
          continue;
        }

        // Get the school, grade, and teacher for the student
        String school = student.school != null ? student.school : "Unknown School";
        String grade = student.grade != null ? student.grade : "Unknown Grade";
        String teacher = student.teacher != null ? student.teacher : "Unknown Teacher";

        // Add the student to the appropriate school
        Map<String, Map<String, Integer>> gradeTotals = schoolGradeTeacherTotals.get(school);
        if (gradeTotals == null) {
          gradeTotals = new HashMap<>();
          schoolGradeTeacherTotals.put(school, gradeTotals); // Put grades in schools
        }

        Map<String, Integer> teacherTotals = gradeTotals.get(grade);
        if (teacherTotals == null) {
          teacherTotals = new HashMap<>();
          gradeTotals.put(grade, teacherTotals); // Put teachers in grades
        }

        teacherTotals.put(teacher, teacherTotals.getOrDefault(teacher, 0) + 1);  // Add student to teacher
      }
    }

    return schoolGradeTeacherTotals;
  }

  /**
   * Updates the calculatedStockState of the given inventory item based on quantity
   * and calculatedMinQuantity.
   *
   * @param inv The inventory item to update the calculatedStockState for
   * @throws NotFoundResponse if the item was not found
   * @throws IllegalArgumentException if calculatedMinQuantity is null
   * @return the updated calculatedStockState of the inventory item
   */
  private String calculateStockState(Inventory inv) {
    String calculatedStockState = null;
    // Make sure item exists
    if (inv == null) {
      throw new NotFoundResponse("The requested inventory item was not found");
    } else {
      // Validate quantity, minQuantity, and maxQuantity
      if (inv.calculatedMinQuantity == null) {
        throw new IllegalArgumentException("calculatedMinQuantity must be an integer.");
      }

      int itemDiff = inv.quantity - inv.calculatedMinQuantity;

      if (itemDiff == 0) {
        calculatedStockState = "Stocked";
      } else if (itemDiff < 0) {
        calculatedStockState = "Understocked";
      } else {
        calculatedStockState = "Overstocked";
      }

      return calculatedStockState;
    }
  }

  private List<String> inventoryIds(SupplyList supplyList) {
    return supplyList.invIDs == null ? List.of() : supplyList.invIDs;
  }

  private boolean isInternalInventoryId(String invID) {
    return invID != null && invID.matches(INTERNAL_INVENTORY_ID_PATTERN);
  }
}
