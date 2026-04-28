// Package declaration
package umm3601.Auth;

/**
 * Enum representing user roles in the system.
 * Each role has an associated level that indicates its position in the
 * hierarchy of permissions.
 * The atLeast method allows for easy comparison of roles to determine if a user
 * has sufficient privileges for a given action.
 *
 * Functions provided by this enum include:
 * - atLeast
 * - fromString
 * - dbName
 *
 * Why use an enum for roles?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Using an enum for roles provides a clear and type-safe way to manage user
 * roles within the application. It allows us to define a fixed set of roles
 * with associated levels, making it easier to implement and maintain access
 * control logic. The methods provided by the enum facilitate common operations
 * related to role comparison and conversion, enhancing code readability and
 * reducing the likelihood of errors when working with user roles.
 */

public enum Role {
  // The levels are defined such that higher numbers indicate more privileges
  GUARDIAN(1),
  VOLUNTEER(2),
  ADMIN(3);

  private final int level;

  /**
   * Constructor for the Role enum, which assigns a level to each role. The level
   * is used to determine the hierarchy of permissions, with higher levels
   * indicating more privileges. This allows for easy comparison of roles using
   * the atLeast method.
   *
   * @param level The level of the role, with higher numbers indicating more
   *              privileges.
   */
  Role(int level) {
    this.level = level;
  }

  /**
   * Determines if the current role has at least the same level of permissions as
   * another role. This method compares the levels of the two roles and returns
   * true if the current role's level is greater than or equal to the other role's
   * level, indicating that it has sufficient privileges for actions that require
   * the other role.
   *
   * @param other The role to compare against.
   * @return True if the current role has at least the same level of permissions
   *         as the other role, false otherwise.
   */
  public boolean atLeast(Role other) {
    return this.level >= other.level;
  }

  /**
   * Converts a string representation of a role to the corresponding Role enum
   * value. The input string is case-insensitive, allowing for flexible usage.
   * This method is useful for parsing role information from external sources,
   * such as user input or database entries, and converting it into the internal
   * Role enum for use in the application.
   *
   * @param role The string representation of the role.
   * @return The corresponding Role enum value.
   * @throws IllegalArgumentException if the input string does not match any
   *                                  defined role.
   */
  public static Role fromString(String role) {
    return Role.valueOf(role.toUpperCase());
  }

  /**
   * Returns the database-friendly name of the role, which is the lowercase
   * version of the enum name. This method is useful for storing role information
   * in a consistent format in the database and for comparing role names in a
   * case-insensitive manner.
   *
   * @return The lowercase name of the role.
   */
  public String dbName() {
    return name().toLowerCase();
  }
}
