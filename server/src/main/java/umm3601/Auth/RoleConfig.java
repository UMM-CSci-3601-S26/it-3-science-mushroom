// Package declaration
package umm3601.Auth;

// Java Imports
import java.util.List;

/**
 * RoleConfig is a simple data class that represents the configuration for a
 * specific role in the permissions system.
 * It contains two fields:
 * - permissions: A list of strings representing the direct permissions assigned
 *                to this role.
 * - inherits: A list of strings representing other roles that this role
 *             inherits permissions from.
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
