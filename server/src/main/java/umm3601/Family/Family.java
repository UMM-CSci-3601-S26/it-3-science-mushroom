// Packages
package umm3601.Family;

// Java Imports
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
  public String timeSlot;

  public List<StudentInfo> students;

  public static class StudentInfo {
    public String name;
    public String grade;
    public String school;
    public String teacher;
    public List<String> requestedSupplies;
  }
}
