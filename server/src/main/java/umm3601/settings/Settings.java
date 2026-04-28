// Package
package umm3601.Settings;

// Java Imports
import java.util.List;

// Mongojack Imports
import org.mongojack.Id;

/**
 * Singleton settings document stored in the "settings" MongoDB collection.
 *
 * Contains operator-configurable values used across the application:
 *  - schools: list of supported schools shown in the Add Family form
 *  - timeAvailability: human-readable time labels for each availability slot
 *
 * Only one document ever exists, identified by _id = "app-settings".
 */
@SuppressWarnings({"VisibilityModifier", "MagicNumber"})
public class Settings {

  @Id
  @SuppressWarnings({"MemberName"})
  public String _id;

  // List of schools the operator supports
  public List<SchoolInfo> schools;

  // Time labels for each availability slot (operator-configurable)
  public TimeAvailabilityLabels timeAvailability;

  // Ordered list of supply item statuses used to sort/filter checklists on drive day
  public List<SupplyItemOrder> supplyOrder;

  // Represents a single school entry
  public static class SchoolInfo {
    public String name;         // e.g. "Morris Area High School"
    public String abbreviation; // e.g. "MAHS"
  }

  /**
   * Maps each availability slot key to a human-readable time string.
   * The operator sets what "earlyMorning" etc. actually means in terms of clock time.
   * Family documents store boolean flags against these same keys.
   */
  public static class TimeAvailabilityLabels {
    public String earlyMorning;
    public String lateMorning;
    public String earlyAfternoon;
    public String lateAfternoon;
  }

    /**
   * Spots available per time slot at the drive
   * Used to schedule families between the different time slots based on their preferences
   */
  public int availableSpots;

  // Warns the operator before printing more than this many barcode labels for one item
  public int barcodePrintWarningLimit = 25;

  /**
   * Records how a single supply list entry should be treated on drive day.
   * "staged"   â€“ included in the checklist at this exact position in the list
   * "unstaged" â€“ included in the checklist but appended after all staged items
   * "notGiven" â€“ excluded from the checklist entirely
   */
  public static class SupplyItemOrder {
    public String itemTerm; // general item term, e.g. "notebook", "folder"
    public String status;   // "staged", "unstaged", or "notGiven"
  }
}
