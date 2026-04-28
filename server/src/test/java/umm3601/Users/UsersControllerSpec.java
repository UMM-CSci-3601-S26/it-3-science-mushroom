package umm3601.Users;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import umm3601.Auth.PasswordUtils;
import umm3601.Auth.PermissionsService;
import umm3601.Auth.Role;

@SuppressWarnings({ "MagicNumber", "unchecked" })
class UsersControllerSpec {

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  private UsersController usersController;
  private UsersService usersService;

  private String volunteerId;
  private String adminId;

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<Object> objectCaptor;

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
    MockitoAnnotations.openMocks(this);
    db.getCollection("users").drop();
    db.getCollection("permissions").drop();

    usersService = new UsersService(db);
    usersService.createUser(
      "admin.user",
      "hash-admin",
      "Admin User",
      "admin@example.com",
      Role.ADMIN, null);
    usersService.createUser(
      "volunteer.user",
      "hash-volunteer",
      "Volunteer User",
      "volunteer@example.com",
      Role.VOLUNTEER,
      "volunteer_base");
    usersService.createUser(
      "guardian.user",
      "hash-guardian",
      "Guardian User",
      null, Role.GUARDIAN,
      null);

    adminId = usersService.findByUsername("admin.user")._id;
    volunteerId = usersService.findByUsername("volunteer.user")._id;

    PermissionsService permissionsService = new PermissionsService(db);
    usersController = new UsersController(
        usersService,
        new UsersPolicy(),
        new UsersValidator(permissionsService));
  }

  @Test
  void getUsersReturnsOnlyManagedUsers() {
    usersController.getUsers(ctx);

    verify(ctx).json(objectCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    List<UsersController.UserAdminView> users = (List<UsersController.UserAdminView>) objectCaptor.getValue();
    assertEquals(2, users.size());
    assertTrue(users.stream().anyMatch(user -> "admin.user".equals(user.username)));
    assertTrue(users.stream().anyMatch(user -> "volunteer.user".equals(user.username)));
    assertFalse(users.stream().anyMatch(user -> "guardian.user".equals(user.username)));
  }

  @Test
  void createUserCreatesVolunteerWithNormalizedFields() {
    UsersController.UserUpsertRequest request = new UsersController.UserUpsertRequest();
    request.username = "  case.worker  ";
    request.fullName = "  Case Worker  ";
    request.email = "case.worker@example.com";
    request.password = "password123";
    request.systemRole = Role.VOLUNTEER;
    request.jobRole = "";

    when(ctx.bodyAsClass(UsersController.UserUpsertRequest.class)).thenReturn(request);

    usersController.createUser(ctx);

    Users created = usersService.findByUsername("case.worker");
    assertNotNull(created);
    assertEquals("Case Worker", created.fullName);
    assertEquals("case.worker@example.com", created.email);
    assertEquals(Role.VOLUNTEER, created.systemRole);
    assertEquals("volunteer_base", created.jobRole);
    assertTrue(PasswordUtils.checkPassword("password123", created.passwordHash));

    verify(ctx).status(HttpStatus.CREATED);
    verify(ctx).json(objectCaptor.capture());
    UsersController.UserAdminView response = (UsersController.UserAdminView) objectCaptor.getValue();
    assertEquals("case.worker", response.username);
    assertEquals("VOLUNTEER", response.systemRole);
  }

  @Test
  void createUserAllowsGuardianWithoutEmail() {
    UsersController.UserUpsertRequest request = new UsersController.UserUpsertRequest();
    request.username = "guardian.new";
    request.fullName = "New Guardian";
    request.password = "password123";
    request.systemRole = Role.GUARDIAN;

    when(ctx.bodyAsClass(UsersController.UserUpsertRequest.class)).thenReturn(request);

    usersController.createUser(ctx);

    Users created = usersService.findByUsername("guardian.new");
    assertNotNull(created);
    assertNull(created.email);
    assertEquals(Role.GUARDIAN, created.systemRole);
    assertNull(created.jobRole);
  }

  @Test
  void createUserRejectsUnknownVolunteerJobRole() {
    UsersController.UserUpsertRequest request = new UsersController.UserUpsertRequest();
    request.username = "bad.role";
    request.fullName = "Bad Role";
    request.email = "bad.role@example.com";
    request.password = "password123";
    request.systemRole = Role.VOLUNTEER;
    request.jobRole = "not-real";

    when(ctx.bodyAsClass(UsersController.UserUpsertRequest.class)).thenReturn(request);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> usersController.createUser(ctx));
    assertEquals("Unknown volunteer job role: not-real", exception.getMessage());
  }

  @Test
  void updateUserCanPromoteVolunteerToAdminAndClearJobRole() {
    UsersController.UserUpsertRequest request = new UsersController.UserUpsertRequest();
    request.username = "volunteer.user";
    request.fullName = "Volunteer User Updated";
    request.systemRole = Role.ADMIN;
    request.email = "updated-admin@example.com";
    request.password = "";

    when(ctx.pathParam("id")).thenReturn(volunteerId);
    when(ctx.bodyAsClass(UsersController.UserUpsertRequest.class)).thenReturn(request);

    usersController.updateUser(ctx);

    Users updated = usersService.findById(volunteerId);
    assertEquals(Role.ADMIN, updated.systemRole);
    assertNull(updated.jobRole);
    assertEquals("updated-admin@example.com", updated.email);
    assertEquals("Volunteer User Updated", updated.fullName);
    assertEquals("hash-volunteer", updated.passwordHash);

    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void updateUserRejectsDuplicateUsername() {
    UsersController.UserUpsertRequest request = new UsersController.UserUpsertRequest();
    request.username = "admin.user";
    request.fullName = "Volunteer User";
    request.systemRole = Role.VOLUNTEER;
    request.email = "volunteer@example.com";

    when(ctx.pathParam("id")).thenReturn(volunteerId);
    when(ctx.bodyAsClass(UsersController.UserUpsertRequest.class)).thenReturn(request);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> usersController.updateUser(ctx));
    assertEquals("Username already exists", exception.getMessage());
  }

  @Test
  void updateUserRejectsBadId() {
    UsersController.UserUpsertRequest request = new UsersController.UserUpsertRequest();
    request.username = "admin.user";
    request.fullName = "Admin User";
    request.systemRole = Role.ADMIN;
    request.email = "admin@example.com";

    when(ctx.pathParam("id")).thenReturn("bad-id");
    when(ctx.bodyAsClass(UsersController.UserUpsertRequest.class)).thenReturn(request);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> usersController.updateUser(ctx));
    assertEquals("The requested user id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void deleteUserRemovesExistingUser() {
    usersService.createUser(
      "admin.backup",
      "hash-backup",
      "Backup Admin",
      "backup-admin@example.com",
      Role.ADMIN,
      null);
    when(ctx.pathParam("id")).thenReturn(adminId);

    usersController.deleteUser(ctx);

    verify(ctx).status(HttpStatus.OK);
    assertNull(usersService.findById(adminId));
  }

  @Test
  void deleteUserThrowsForMissingUser() {
    when(ctx.pathParam("id")).thenReturn(new ObjectId().toHexString());

    NotFoundResponse exception = assertThrows(NotFoundResponse.class, () -> usersController.deleteUser(ctx));
    assertEquals("User not found", exception.getMessage());
  }

  @Test
  void updateUserRejectsDemotingTheLastAdmin() {
    UsersController.UserUpsertRequest request = new UsersController.UserUpsertRequest();
    request.username = "admin.user";
    request.fullName = "Admin User";
    request.systemRole = Role.VOLUNTEER;
    request.email = "admin@example.com";
    request.jobRole = "volunteer_base";

    when(ctx.pathParam("id")).thenReturn(adminId);
    when(ctx.bodyAsClass(UsersController.UserUpsertRequest.class)).thenReturn(request);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> usersController.updateUser(ctx));
    assertEquals("At least one admin account must remain in the system", exception.getMessage());
  }

  @Test
  void deleteUserRejectsDeletingTheLastAdmin() {
    when(ctx.pathParam("id")).thenReturn(adminId);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> usersController.deleteUser(ctx));
    assertEquals("At least one admin account must remain in the system", exception.getMessage());
  }
}
