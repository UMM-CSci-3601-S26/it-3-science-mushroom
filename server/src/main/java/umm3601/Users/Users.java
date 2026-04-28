package umm3601.Users;

import java.util.Objects;

import org.mongojack.Id;
import org.mongojack.ObjectId;
import umm3601.Auth.Role;

// Set users password to "password123"

@SuppressWarnings({ "VisibilityModifier" })
public class Users {
  @ObjectId
  @Id
  @SuppressWarnings({ "MemberName" })
  public String _id;
  public String username;
  public String passwordHash;
  public String fullName;
  public String email;

  public Role systemRole; // admin, volunteer, guardian (now an enum)
  public String jobRole;    // nullable unless volunteer

  @Override
  public boolean equals(Object obj) {
    if (!(obj instanceof Users)) {
      return false;
    }
    Users other = (Users) obj;
    return _id != null && _id.equals(other._id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(_id);
  }
}
