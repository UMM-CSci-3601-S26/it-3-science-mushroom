package umm3601.Auth;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import io.javalin.http.BadRequestResponse;

@SuppressWarnings({ "MagicNumber" })
class PermissionsServiceSpec {

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  private PermissionsService permissionsService;

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");
    mongoClient = MongoClients.create(
        MongoClientSettings.builder()
            .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
            .build());
    db = mongoClient.getDatabase("test");
  }

  @AfterAll
  static void teardownAll() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() {
    db.getCollection("permissions").drop();
    permissionsService = new PermissionsService(db);
  }

  @Test
  void getPermissionsBootstrapsDefaultDocument() {
    RolePermissions perms = permissionsService.getPermissions();

    assertEquals("role-permissions", perms._id);
    assertTrue(perms.roles.containsKey("volunteer_base"));
  }

  @Test
  void getPermissionsRepairsExistingVolunteerBaseWhenFieldsAreMissing() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("volunteer_base", new org.bson.Document()
                .append("permissions", null)
                .append("inherits", null))));

    RolePermissions perms = permissionsService.getPermissions();

    assertNotNull(perms.roles.get("volunteer_base").permissions);
    assertTrue(perms.roles.get("volunteer_base").permissions.contains("view_inventory"));
    assertEquals(List.of(), perms.roles.get("volunteer_base").inherits);
  }

  @Test
  void getPermissionsBootstrapsWhenRolesMapIsMissingOrLacksVolunteerBase() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", null));

    RolePermissions missingRoles = permissionsService.getPermissions();

    assertTrue(missingRoles.roles.containsKey("volunteer_base"));

    db.getCollection("permissions").drop();
    permissionsService = new PermissionsService(db);
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("frontdesk", new org.bson.Document()
                .append("permissions", List.of("view_inventory"))
                .append("inherits", List.of()))));

    RolePermissions missingVolunteerBase = permissionsService.getPermissions();

    assertTrue(missingVolunteerBase.roles.containsKey("volunteer_base"));
  }

  @Test
  void getPermissionsCleansVolunteerBasePermissionsAndInheritance() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("volunteer_base", new org.bson.Document()
                .append("permissions", Arrays.asList("view_inventory", null, "", "view_inventory"))
                .append("inherits", Arrays.asList(null, "", "volunteer_base", "frontdesk")))));

    RolePermissions perms = permissionsService.getPermissions();

    assertFalse(perms.roles.get("volunteer_base").permissions.contains(null));
    assertFalse(perms.roles.get("volunteer_base").permissions.contains(""));
    assertEquals(List.of("frontdesk"), perms.roles.get("volunteer_base").inherits);
  }

  @Test
  void getPermissionsRepairsVolunteerBaseSelfInheritance() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("volunteer_base", new org.bson.Document()
                .append("permissions", List.of("view_inventory"))
                .append("inherits", List.of("volunteer_base")))));

    RolePermissions perms = permissionsService.getPermissions();

    assertEquals(List.of(), perms.roles.get("volunteer_base").inherits);
  }

  @Test
  void getEffectivePermissionsIncludesInheritedPermissions() {
    RoleConfig config = new RoleConfig();
    config.permissions = List.of("edit_inventory_item");
    config.inherits = List.of("volunteer_base");
    permissionsService.updateRole("inventory_manager", config);

    Set<String> effective = permissionsService.getEffectivePermissions("inventory_manager");

    assertTrue(effective.contains("edit_inventory_item"));
    assertTrue(effective.contains("view_inventory"));
  }

  @Test
  void getPermissionsForRoleReturnsEmptyForMissingRole() {
    List<String> perms = permissionsService.getPermissionsForRole("missing");

    assertEquals(List.of(), perms);
  }

  @Test
  void getEffectivePermissionsReturnsEmptyForNullOrBlankRole() {
    assertEquals(Set.of(), permissionsService.getEffectivePermissions(null));
    assertEquals(Set.of(), permissionsService.getEffectivePermissions("   "));
  }

  @Test
  void updateDeleteAndRoleExistsWork() {
    RoleConfig config = new RoleConfig();
    config.permissions = List.of("view_settings");
    config.inherits = List.of("volunteer_base");

    permissionsService.updateRole("frontdesk", config);
    assertTrue(permissionsService.roleExists("frontdesk"));

    permissionsService.deleteRole("frontdesk");
    assertFalse(permissionsService.roleExists("frontdesk"));
  }

  @Test
  void updateRoleRejectsVolunteerBaseSelfInheritance() {
    RoleConfig config = new RoleConfig();
    config.permissions = List.of("view_inventory");
    config.inherits = List.of("volunteer_base");

    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("volunteer_base", config));
  }

  @Test
  void updateRoleRejectsInvalidConfigsAndParents() {
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", null));

    RoleConfig duplicateParents = new RoleConfig();
    duplicateParents.permissions = List.of("view_inventory");
    duplicateParents.inherits = List.of("volunteer_base", "volunteer_base");
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", duplicateParents));

    RoleConfig blankParent = new RoleConfig();
    blankParent.permissions = List.of("view_inventory");
    blankParent.inherits = List.of(" ");
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", blankParent));

    RoleConfig selfParent = new RoleConfig();
    selfParent.permissions = List.of("view_inventory");
    selfParent.inherits = List.of("frontdesk");
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", selfParent));

    RoleConfig missingParent = new RoleConfig();
    missingParent.permissions = List.of("view_inventory");
    missingParent.inherits = List.of("missing");
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", missingParent));
  }

  @Test
  void updateRoleRejectsInheritanceCycles() {
    RoleConfig initialInventoryManager = new RoleConfig();
    initialInventoryManager.permissions = List.of("edit_inventory_item");
    initialInventoryManager.inherits = List.of("volunteer_base");
    permissionsService.updateRole("inventory_manager", initialInventoryManager);

    RoleConfig supportHelper = new RoleConfig();
    supportHelper.permissions = List.of("view_inventory");
    supportHelper.inherits = List.of("inventory_manager");
    permissionsService.updateRole("support_helper", supportHelper);

    RoleConfig cyclicInventoryManager = new RoleConfig();
    cyclicInventoryManager.permissions = List.of("edit_inventory_item");
    cyclicInventoryManager.inherits = List.of("support_helper");

    assertThrows(BadRequestResponse.class,
      () -> permissionsService.updateRole("inventory_manager", cyclicInventoryManager));
  }

  @Test
  void getAvailablePermissionsIncludesAnnotatedRoutes() {
    List<String> permissions = permissionsService.getAvailablePermissions();

    assertTrue(permissions.contains("view_families"));
    assertTrue(permissions.contains("request_family_delete"));
    assertTrue(permissions.contains("view_family_checklist"));
    assertTrue(permissions.contains("edit_drive_day"));
    assertTrue(permissions.contains("view_inventory"));
    assertTrue(permissions.contains("manage_checklist"));
    assertFalse(permissions.contains("not_a_real_permission"));
  }

  @Test
  void getPermissionCatalogReturnsReadableMetadata() {
    List<PermissionsService.PermissionCatalogEntry> catalog = permissionsService.getPermissionCatalog();

    PermissionsService.PermissionCatalogEntry requestDelete = catalog.stream()
        .filter(entry -> "request_family_delete".equals(entry.permission))
        .findFirst()
        .orElse(null);
    PermissionsService.PermissionCatalogEntry familyPortal = catalog.stream()
        .filter(entry -> "family_portal_access".equals(entry.permission))
        .findFirst()
        .orElse(null);

    assertNotNull(requestDelete);
    assertEquals("Family", requestDelete.group);
    assertEquals("Family Delete Requests", requestDelete.label);
    assertTrue(requestDelete.volunteerAssignable);

    assertNotNull(familyPortal);
    assertEquals("Family", familyPortal.group);
    assertEquals("Family Portal Access", familyPortal.label);
    assertFalse(familyPortal.volunteerAssignable);
  }

  @Test
  void getPermissionsIncludesFriendlyFamilyAccessBundleInVolunteerBase() {
    RolePermissions permissions = permissionsService.getPermissions();

    assertTrue(permissions.roles.get("volunteer_base").permissions.contains("access_families"));
    assertFalse(permissions.roles.get("volunteer_base").permissions.contains("manage_drive_scheduling"));
    assertFalse(permissions.roles.get("volunteer_base").permissions.contains("view_checklist"));
  }

  @Test
  void getPermissionCatalogCoversAdditionalGroupsAndFallbackLabels() {
    PermissionsService.PermissionCatalogEntry checklist = permissionsService.getPermissionCatalog().stream()
        .filter(entry -> "manage_checklist".equals(entry.permission))
        .findFirst()
        .orElse(null);
    PermissionsService.PermissionCatalogEntry familyChecklist = permissionsService.getPermissionCatalog().stream()
        .filter(entry -> "view_family_checklist".equals(entry.permission))
        .findFirst()
        .orElse(null);
    PermissionsService.PermissionCatalogEntry settings = permissionsService.getPermissionCatalog().stream()
        .filter(entry -> "edit_drive_day".equals(entry.permission))
        .findFirst()
        .orElse(null);
    PermissionsService.PermissionCatalogEntry availableSpots = permissionsService.getPermissionCatalog().stream()
        .filter(entry -> "edit_available_spots".equals(entry.permission))
        .findFirst()
        .orElse(null);
    PermissionsService.PermissionCatalogEntry scheduleFamilies = permissionsService.getPermissionCatalog().stream()
        .filter(entry -> "schedule_families".equals(entry.permission))
        .findFirst()
        .orElse(null);
    PermissionsService.PermissionCatalogEntry barcodePrintLimit = permissionsService.getPermissionCatalog().stream()
        .filter(entry -> "edit_barcode_print_limit".equals(entry.permission))
        .findFirst()
        .orElse(null);

    assertNotNull(checklist);
    assertEquals("Checklist", checklist.group);
    assertEquals("Checklist Management", checklist.label);
    assertFalse(checklist.volunteerAssignable);

    assertNotNull(familyChecklist);
    assertEquals("Checklist", familyChecklist.group);
    assertEquals("Finalized Family Checklist Viewing", familyChecklist.label);
    assertFalse(familyChecklist.volunteerAssignable);

    assertNotNull(settings);
    assertEquals("Settings", settings.group);
    assertEquals("Drive Day Editing", settings.label);

    assertNotNull(availableSpots);
    assertFalse(availableSpots.volunteerAssignable);

    assertNotNull(scheduleFamilies);
    assertFalse(scheduleFamilies.volunteerAssignable);

    assertNotNull(barcodePrintLimit);
    assertEquals("Settings", barcodePrintLimit.group);
    assertEquals("Barcode Print Limit Editing", barcodePrintLimit.label);
    assertTrue(barcodePrintLimit.volunteerAssignable);
  }
}
