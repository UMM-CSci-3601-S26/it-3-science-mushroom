// Package
package umm3601.Auth;

// Java Imports
import java.util.List;

/**
 * RoleConfig is a simple data class that represents the configuration for a
 * specific role in the permissions system. It includes a list of permissions
 * that are directly assigned to the role, as well as a list of other roles that
 * this role inherits permissions from. This allows for a flexible permissions system.
 *
 * This class is used as part of the RolePermissions configuration to define the
 * permissions structure for different roles in the application. By using this
 * class, we can easily manage and organize permissions for various roles,
 * including support for role inheritance, which allows for more flexible and
 * maintainable permission configurations.
 */

@SuppressWarnings({ "VisibilityModifier" })
public class RoleConfig {
  public List<String> permissions;
  public List<String> inherits;
}
