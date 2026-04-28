// Package declaration
package umm3601.Auth;

// Org Imports
import org.mongojack.Id;

// Java Imports
import java.util.Map;

/**
 * RolePermissions is a data class that represents the overall permissions
 * configuration for the application.
 * It contains an ID field for MongoDB and a map of role names to their
 * corresponding RoleConfig objects.
 *
 * The roles map is where we define the permissions and inheritance for each
 * role in the system. Each key in the map is a role name (e.g., "admin",
 * "volunteer"), and the value is a RoleConfig object that specifies the
 * permissions directly assigned to that role and any other roles it inherits
 * from.
 *
 * This class serves as the central configuration for our permissions system,
 * allowing us to easily manage and update role-based access control throughout
 * the application.
 */
@SuppressWarnings({ "VisibilityModifier" })
public class RolePermissions {
  @Id
  @SuppressWarnings({ "MemberName" })
  public String _id;

  // Only volunteer job roles live here
  public Map<String, RoleConfig> roles;
}
