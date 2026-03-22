package umm3601.Family;

import java.util.List;

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

  public List<StudentInfo> students;

  public static class StudentInfo {
    public String name;
    public String grade;
    public String school;
    public List<String> requestedSupplies;
  }
}
