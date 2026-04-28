// Package declaration
package umm3601.Auth;

// Static Imports
import static com.mongodb.client.model.Updates.set;
import static com.mongodb.client.model.Updates.unset;
import static com.mongodb.client.model.Filters.eq;

// Com Imports
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.UpdateOptions;

// Org Imports
import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

// Java Imports
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.lang.reflect.Method;

import io.javalin.http.BadRequestResponse;
import umm3601.Settings.SettingsController;
import umm3601.Family.FamilyController;
import umm3601.Inventory.InventoryController;
import umm3601.SupplyList.SupplyListController;

/**
 * Service for managing role-based permissions in the application.
 * This service interacts with a MongoDB collection to store and retrieve
 * permissions configurations for different roles.
 * The permissions are defined in a RolePermissions document, which contains a
 * mapping of role names to their respective permissions and inherited roles.
 *
 * Functions provided by this service include:
 * - getPermissions
 * - getEffectivePermissions
 * - updateRole
 * - deleteRole
 * - roleExists
 * - getPermissionsForRole
 * - buildDefaultPermissions
 *
 * Why use a PermissionsService?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * A PermissionsService centralizes the management of role-based permissions,
 * making it easier to maintain and update access controls. It provides a clear
 * and consistent way to define, update, and query permissions, ensuring that
 * the application's security model is both robust and flexible. By using a
 * MongoDB collection to store permissions, we can easily persist and manage
 * complex permissions configurations, including role inheritance, without
 * hardcoding them into the application.
 */
public class PermissionsService {
  private static final String PERMISSIONS_ID = "role-permissions";
  private static final List<Class<?>> PERMISSION_SOURCES = List.of(
      FamilyController.class,
      InventoryController.class,
      SupplyListController.class,
      SettingsController.class);
  private static final List<String> ROUTE_PERMISSIONS = List.of(
      "add_family",
      "delete_family",
      "edit_family",
      "export_families_csv",
      "manage_family_help_sessions",
      "request_family_delete",
      "schedule_families",
      "view_dashboard_stats",
      "view_families",
      "view_family",
      "family_portal_access",
      "add_inventory_item",
      "delete_inventory_item",
      "edit_inventory_item",
      "view_inventory",
      "view_inventory_item",
      "add_supply_list",
      "delete_supply_list",
      "edit_supply_list",
      "view_supply_lists",
      "manage_checklist",
      "view_checklist",
      "edit_available_spots",
      "edit_schools",
      "edit_supply_order",
      "edit_time_availability",
      "manage_stock_reports",
      "view_reports",
      "view_settings");
  private final JacksonMongoCollection<RolePermissions> collection;

  public PermissionsService(MongoDatabase db) {
    collection = JacksonMongoCollection.builder().build(
        db,
        "permissions",
        RolePermissions.class,
        UuidRepresentation.STANDARD);
  }

  /**
   * Retrieves the current permissions configuration from the database. If no
   * configuration exists, a default configuration is created and stored in the
   * database before being returned.
   *
   * @return The current RolePermissions configuration.
   */
  public RolePermissions getPermissions() {
    RolePermissions perms = collection.find(eq("_id", PERMISSIONS_ID)).first();
    if (perms == null || perms.roles == null || !perms.roles.containsKey("volunteer_base")) {
      perms = buildDefaultPermissions();
      collection.updateOne(eq("_id", PERMISSIONS_ID), set("roles", perms.roles), new UpdateOptions().upsert(true));
      perms._id = PERMISSIONS_ID;
      return perms;
    }

    RolePermissions baseline = buildDefaultPermissions();
    RoleConfig volunteerBase = perms.roles.get("volunteer_base");
    boolean changed = false;

    if (volunteerBase.permissions == null) {
      volunteerBase.permissions = new ArrayList<>();
    }
    volunteerBase.permissions = volunteerBase.permissions.stream()
        .filter(permission -> permission != null && !permission.isBlank())
        .distinct()
        .toList();
    for (String permission : baseline.roles.get("volunteer_base").permissions) {
      if (!volunteerBase.permissions.contains(permission)) {
        volunteerBase.permissions = append(volunteerBase.permissions, permission);
        changed = true;
      }
    }
    if (volunteerBase.inherits == null) {
      volunteerBase.inherits = List.of();
      changed = true;
    } else {
      List<String> normalizedInherits = volunteerBase.inherits.stream()
          .filter(parent -> parent != null && !parent.isBlank() && !"volunteer_base".equals(parent))
          .distinct()
          .toList();
      if (!normalizedInherits.equals(volunteerBase.inherits)) {
        volunteerBase.inherits = normalizedInherits;
        changed = true;
      }
    }

    if (changed) {
      collection.updateOne(eq("_id", PERMISSIONS_ID), set("roles", perms.roles), new UpdateOptions().upsert(true));
    }
    return perms;
  }

  /**
   * Computes the effective permissions for a given role by resolving direct
   * permissions and inherited permissions recursively. If the specified role is
   * null or blank, an empty set of permissions is returned.
   *
   * @param role The role for which to compute effective permissions. For
   *             volunteer roles, this would be "volunteer_base" or any role
   *             that inherits from it.
   * @return A set of effective permissions for the specified role.
   */
  public Set<String> getEffectivePermissions(String role) {
    if (role == null || role.isBlank()) {
      return Set.of();
    }

    RolePermissions perms = getPermissions();
    Set<String> result = new HashSet<>();
    resolve(role, perms.roles, result, new HashSet<>());
    return result;
  }

  /**
   * Helper method to recursively resolve permissions for a given role, including
   * direct permissions and permissions inherited from parent roles. The resolved
   * permissions are added to the provided result set.
   *
   * @param role   The role for which to resolve permissions.
   * @param roles  The map of all roles and their configurations.
   * @param result The set to which resolved permissions will be added.
   */
  private void resolve(String role, Map<String, RoleConfig> roles, Set<String> result, Set<String> visiting) {
    RoleConfig config = roles.get(role);
    if (config == null || !visiting.add(role)) {
      return;
    }

    if (config.permissions != null) {
      result.addAll(config.permissions);
    }

    if (config.inherits != null) {
      for (String parent : config.inherits) {
        resolve(parent, roles, result, visiting);
      }
    }
    visiting.remove(role);
  }

  /**
   * Updates the permissions configuration for a specific role. If the role does
   * not exist, it will be created. This method ensures that the baseline roles
   * are present before any custom role update, and then sets the specified role's
   * configuration in the database.
   *
   * @param role   The role to update or create.
   * @param config The configuration for the role.
   */
  public void updateRole(String role, RoleConfig config) {
    // Ensure baseline roles exist before any custom-role update.
    RolePermissions permissions = getPermissions();
    validateRoleConfig(role, config, permissions.roles);
    collection.updateOne(
        eq("_id", PERMISSIONS_ID),
        set("roles." + role, config),
        new UpdateOptions().upsert(true));
  }

  private void validateRoleConfig(String role, RoleConfig config, Map<String, RoleConfig> existingRoles) {
    if (config == null) {
      throw new BadRequestResponse("Role config body is required");
    }

    List<String> inherits = config.inherits == null ? List.of() : config.inherits;
    List<String> normalizedParents = inherits.stream()
        .filter(parent -> parent != null && !parent.isBlank())
        .distinct()
        .toList();

    if (normalizedParents.size() != inherits.size()) {
      throw new BadRequestResponse("Inherited roles must be non-empty unique names");
    }

    if ("volunteer_base".equals(role) && !normalizedParents.isEmpty()) {
      throw new BadRequestResponse("volunteer_base cannot inherit from other roles");
    }

    if (normalizedParents.contains(role)) {
      throw new BadRequestResponse("A job role cannot inherit from itself");
    }

    for (String parent : normalizedParents) {
      if (!existingRoles.containsKey(parent)) {
        throw new BadRequestResponse("Unknown inherited role: " + parent);
      }
    }

    Map<String, RoleConfig> graph = new HashMap<>(existingRoles);
    RoleConfig candidate = new RoleConfig();
    candidate.permissions = config.permissions == null ? List.of() : config.permissions;
    candidate.inherits = normalizedParents;
    graph.put(role, candidate);

    if (hasCycle(role, graph, new HashSet<>(), new HashSet<>())) {
      throw new BadRequestResponse("Role inheritance cannot contain cycles");
    }
  }

  private boolean hasCycle(String role, Map<String, RoleConfig> roles, Set<String> visiting, Set<String> visited) {
    if (visited.contains(role)) {
      return false;
    }
    if (!visiting.add(role)) {
      return true;
    }

    RoleConfig config = roles.get(role);
    if (config != null && config.inherits != null) {
      for (String parent : config.inherits) {
        if (hasCycle(parent, roles, visiting, visited)) {
          return true;
        }
      }
    }

    visiting.remove(role);
    visited.add(role);
    return false;
  }

  private List<String> append(List<String> source, String value) {
    List<String> updated = new ArrayList<>(source);
    updated.add(value);
    return updated;
  }

  /**
   * Deletes a role from the permissions configuration. This method ensures that
   * the baseline roles are present before any custom role deletion, and then
   * removes the specified role from the roles map in the database.
   *
   * @param role The role to delete.
   */
  public void deleteRole(String role) {
    // Ensure document exists for consistent delete semantics.
    getPermissions();
    collection.updateOne(
        eq("_id", PERMISSIONS_ID),
        unset("roles." + role));
  }

  /**
   * Checks if a specific role exists in the permissions configuration. This
   * method retrieves the current permissions and checks if the specified role is
   * present in the roles map.
   *
   * @param role The role to check for existence.
   * @return True if the role exists, false otherwise.
   */
  public boolean roleExists(String role) {
    return getPermissions().roles.containsKey(role);
  }

  /**
   * Retrieves the effective permissions for a specific role as a list of strings.
   * This method is a backward-compatible adapter that calls
   * getEffectivePermissions and converts the resulting set of permissions into a
   * list. If the specified role does not exist, an empty list is returned.
   *
   * @param role The role for which to retrieve permissions.
   * @return A list of effective permissions for the specified role.
   */
  public List<String> getPermissionsForRole(String role) {
    return new ArrayList<>(getEffectivePermissions(role));
  }

  public List<String> getAvailablePermissions() {
    Set<String> permissions = new TreeSet<>(ROUTE_PERMISSIONS);
    for (Class<?> controllerClass : PERMISSION_SOURCES) {
      for (Method method : controllerClass.getDeclaredMethods()) {
        RequirePermission annotation = method.getAnnotation(RequirePermission.class);
        if (annotation != null) {
          permissions.add(annotation.value());
        }
      }
    }
    return new ArrayList<>(permissions);
  }

  public List<PermissionCatalogEntry> getPermissionCatalog() {
    return getAvailablePermissions().stream()
        .map(this::toPermissionCatalogEntry)
        .toList();
  }

  private PermissionCatalogEntry toPermissionCatalogEntry(String permission) {
    return new PermissionCatalogEntry(
        permission,
        permissionGroup(permission),
        permissionLabel(permission),
        !"family_portal_access".equals(permission));
  }

  private String permissionGroup(String permission) {
    if (permission.contains("inventory")) {
      return "Inventory";
    }
    if (permission.contains("supply")) {
      return "Supply List";
    }
    if (permission.contains("checklist")) {
      return "Checklist";
    }
    if (permission.contains("family")) {
      return "Family";
    }
    if (permission.contains("settings")
        || permission.contains("schools")
        || permission.contains("supply_order")
        || permission.contains("time_availability")
        || permission.contains("available_spots")) {
      return "Settings";
    }
    if (permission.contains("reports")) {
      return "Reports";
    }
    return "Family";
  }

  private String permissionLabel(String permission) {
    return switch (permission) {
      case "add_family" -> "Family Creation";
      case "delete_family" -> "Family Deletion";
      case "edit_family" -> "Family Editing";
      case "export_families_csv" -> "Family CSV Export";
      case "manage_family_help_sessions" -> "Family Help Sessions";
      case "request_family_delete" -> "Family Delete Requests";
      case "schedule_families" -> "Family Scheduling";
      case "view_dashboard_stats" -> "Dashboard Statistics";
      case "view_families" -> "Family List Viewing";
      case "view_family" -> "Family Detail Viewing";
      case "family_portal_access" -> "Family Portal Access";
      case "add_inventory_item" -> "Inventory Item Creation";
      case "delete_inventory_item" -> "Inventory Item Deletion";
      case "edit_inventory_item" -> "Inventory Item Editing";
      case "view_inventory" -> "Inventory Viewing";
      case "view_inventory_item" -> "Inventory Item Viewing";
      case "add_supply_list" -> "Supply List Creation";
      case "delete_supply_list" -> "Supply List Deletion";
      case "edit_supply_list" -> "Supply List Editing";
      case "view_supply_lists" -> "Supply List Viewing";
      case "manage_checklist" -> "Checklist Management";
      case "view_checklist" -> "Checklist Viewing";
      case "edit_schools" -> "School Settings Editing";
      case "edit_available_spots" -> "Available Spot Editing";
      case "edit_supply_order" -> "Supply Order Editing";
      case "edit_time_availability" -> "Time Availability Editing";
      case "manage_stock_reports" -> "Stock Report Management";
      case "view_reports" -> "Report Viewing";
      case "view_settings" -> "Settings Viewing";
      default -> permission;
    };
  }

  @SuppressWarnings({ "VisibilityModifier" })
  public static class PermissionCatalogEntry {
    public String permission;
    public String group;
    public String label;
    public boolean volunteerAssignable;

    public PermissionCatalogEntry(String permission, String group, String label, boolean volunteerAssignable) {
      this.permission = permission;
      this.group = group;
      this.label = label;
      this.volunteerAssignable = volunteerAssignable;
    }
  }

  /**
   * Builds a default permissions configuration with a baseline "volunteer_base"
   * role that has a predefined set of permissions and no inherited roles. This
   * method is used to initialize the permissions configuration in the database if
   * it does not already exist, ensuring that there is always a valid
   * configuration for the application to use.
   * The "volunteer_base" role includes permissions for viewing inventory,
   * families, supply lists, and checklists, and serves as a foundational role
   * that can be inherited by other custom job roles.
   *
   * @return The default role permissions configuration.
   */
  private RolePermissions buildDefaultPermissions() {
    RolePermissions perms = new RolePermissions();
    perms._id = PERMISSIONS_ID;

    Map<String, RoleConfig> roles = new HashMap<>();

    RoleConfig volunteerBase = new RoleConfig();
    volunteerBase.permissions = List.of(
        "view_inventory",
        "view_inventory_item",
        "view_families",
        "view_family",
        "view_supply_lists",
        "view_checklist",
        "request_family_delete");
    volunteerBase.inherits = List.of();

    roles.put("volunteer_base", volunteerBase);
    perms.roles = roles;

    return perms;
  }
}
