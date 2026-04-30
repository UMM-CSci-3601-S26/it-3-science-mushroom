// Packages
package umm3601.Family;

// Java Imports
import java.util.ArrayList;
import java.util.List;

// Org Imports
import org.mongojack.Id;
import org.mongojack.ObjectId;

@SuppressWarnings({"VisibilityModifier"})
public class Family {
  @ObjectId @Id
  @SuppressWarnings({"MemberName"})
  public String _id;

  public String ownerUserId; // Guardian-level information (applies to the whole household)
  public String guardianName;
  public String email;
  public String address;
  // Whether the guardian or volunteer has completed the family profile.
  public boolean profileComplete;
  public String timeSlot;
  public String accommodations;
  public boolean helped;
  public String status;
  public FamilyChecklist checklist;

  public List<StudentInfo> students;

  public AvailabilityOptions timeAvailability;

  public static class AvailabilityOptions {
    public boolean earlyMorning;
    public boolean lateMorning;
    public boolean earlyAfternoon;
    public boolean lateAfternoon;

    // helper function for sorting
    public int countTrue() {
      int count = 0;
      if (earlyMorning) {
        count++;
      }
      if (lateMorning) {
        count++;
      }
      if (earlyAfternoon) {
        count++;
      }
      if (lateAfternoon) {
        count++;
      }
      return count;
    }
  }

  // Optional delete request metadata used by volunteer->admin approval flow.
  public DeleteRequest deleteRequest;

  public static class StudentInfo {
    public String name;
    public String grade;
    public String school;
    public String schoolAbbreviation;
    public String teacher;
    public Boolean backpack;
    public Boolean headphones;
  }

  public static class DeleteRequest {
    public boolean requested;
    public String message;
    public String requestedByUserId;
    public String requestedByUserName;
    public String requestedBySystemRole;
    public String requestedAt;
  }

  @SuppressWarnings({"VisibilityModifier"})
  public static class FamilyChecklist {
    public String templateId;
    public String printableTitle;
    public boolean snapshot;
    public List<ChecklistSection> sections = new ArrayList<>();
  }

  @SuppressWarnings({"VisibilityModifier"})
  public static class ChecklistSection {
    public String id;
    public String title;
    public String printableTitle;
    public boolean saved;
    public List<ChecklistItem> items = new ArrayList<>();
  }

  @SuppressWarnings({"VisibilityModifier"})
  public static class ChecklistItem {
    public String id;
    public String label;
    public boolean selected = true;
    public boolean available = true;
    public String itemDescription;
    public String supplyListId;
    public String matchedInventoryId;
    public String matchedInventoryItem;
    public String matchedInventoryDescription;
    public Integer requestedQuantity = 1;
    public String notPickedUpReason;
    public String substituteItem;
    public String substituteBarcode;
    public String substituteDescription;
    public String substituteInventoryId;
    public String notes;
  }
}
