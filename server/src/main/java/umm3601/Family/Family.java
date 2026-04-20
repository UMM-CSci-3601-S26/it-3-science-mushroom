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

  public String guardianName;
  public String email;
  public String address;
  public String timeSlot;
  public boolean helped;
  public String status;
  public FamilyChecklist checklist;

  public List<StudentInfo> students;
  public static class AvailabilityOptions {
    public boolean earlyMorning;
    public boolean lateMorning;
    public boolean earlyAfternoon;
    public boolean lateAfternoon;
  }
  public static class StudentInfo {
    public String name;
    public String grade;
    public String school;
    public String teacher;
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
    public Integer requestedQuantity = 1;
    public String notPickedUpReason;
    public String substituteItem;
    public String substituteBarcode;
    public String substituteDescription;
    public String substituteInventoryId;
    public String notes;
  }
}
