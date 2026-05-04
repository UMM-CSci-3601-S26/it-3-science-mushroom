// Package
package umm3601.Users;

// Java imports
import java.util.Objects;

// Org imports
import org.mongojack.Id;
import org.mongojack.ObjectId;

// App imports
import umm3601.Auth.Role;

/**
 * Mongo-backed login account.
 *
 * systemRole controls the broad account type. jobRole is only used for
 * volunteers, where it points to a configurable permission bundle such as
 * volunteer_base or inventory_manager.
 */
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

  public Role systemRole;
  public String jobRole;

  // Equality is based on Mongo identity so separate loaded copies of the same
  // account compare as the same user.
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
