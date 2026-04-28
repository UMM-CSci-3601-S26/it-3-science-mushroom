package umm3601.Users;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
// Java Imports
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

// Com Imports
import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.NotFoundResponse;
import io.javalin.json.JavalinJackson;
import umm3601.Auth.Role;

public class UsersServiceSpec {
  private UsersService usersService;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @SuppressWarnings("unused")
  private static JavalinJackson javalinJackson = new JavalinJackson();

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<ArrayList<Users>> usersArrayListCaptor;

  @Captor
  private ArgumentCaptor<Users> usersCaptor;

  @Captor
  private ArgumentCaptor<Map<String, String>> mapCaptor;

  @BeforeAll
  static void setup() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");

    mongoClient = MongoClients.create(
      MongoClientSettings.builder()
        .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
        .build());

    db = mongoClient.getDatabase("test");
  }

  @AfterAll
  static void teardown() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() throws IOException {
    MockitoAnnotations.openMocks(this);

    db.getCollection("users").drop();

    usersService = new UsersService(db);
    usersService.createUser(
      "testuser1",
      "hash1",
      "Test User 1",
      "testuser1@example.com",
      Role.VOLUNTEER,
      "volunteer_base");
    usersService.createUser(
      "testuser2",
      "hash2",
      "Test User 2",
      "testuser2@example.com",
      Role.ADMIN,
      null);
  }

  @Test
  void findByUsernameReturnsUser() {
    Users user = usersService.findByUsername("testuser1");
    assertEquals("testuser1", user.username);
    assertEquals("hash1", user.passwordHash);
    assertEquals("Test User 1", user.fullName);
    assertEquals(Role.VOLUNTEER, user.systemRole);
  }

  @Test
  void findByUsernameReturnsNullIfNotFound() {
    Users user = usersService.findByUsername("nonexistent");
    assertEquals(null, user);
  }

  @Test
  void createUserInsertsUser() {
    usersService.createUser("newuser", "newhash", "New User", "newuser@example.com", Role.VOLUNTEER, "volunteer_base");

    Users user = usersService.findByUsername("newuser");
    assertEquals("newuser", user.username);
    assertEquals("newhash", user.passwordHash);
    assertEquals("New User", user.fullName);
    assertEquals(Role.VOLUNTEER, user.systemRole);
  }

  @Test
  void updateUserSystemRoleClearsJobRoleForNonVolunteer() {
    usersService.updateUserSystemRole("testuser1", Role.ADMIN);

    Users updated = usersService.findByUsername("testuser1");
    assertEquals(Role.ADMIN, updated.systemRole);
    assertNull(updated.jobRole);
  }

  @Test
  void deleteGuardianByIdDeletesGuardianButNotOtherRoles() {
    usersService.createUser("guardian1", "hash3", "Guardian User", null, Role.GUARDIAN, null);
    Users guardian = usersService.findByUsername("guardian1");
    Users admin = usersService.findByUsername("testuser2");

    assertEquals(1L, usersService.deleteGuardianById(guardian._id));
    assertEquals(0L, usersService.deleteGuardianById(admin._id));
    assertNull(usersService.findByUsername("guardian1"));
    assertEquals("testuser2", usersService.findByUsername("testuser2").username);
  }

  @Test
  void replaceUserThrowsWhenMissing() {
    Users replacement = new Users();
    replacement.username = "missing";
    replacement.fullName = "Missing";
    replacement.systemRole = Role.ADMIN;

    assertThrows(NotFoundResponse.class,
        () -> usersService.replaceUser("507f1f77bcf86cd799439011", replacement));
  }

  @Test
  void replaceUserRejectsDemotingTheLastAdmin() {
    Users admin = usersService.findByUsername("testuser2");
    Users replacement = new Users();
    replacement._id = admin._id;
    replacement.username = admin.username;
    replacement.passwordHash = admin.passwordHash;
    replacement.fullName = admin.fullName;
    replacement.email = admin.email;
    replacement.systemRole = Role.VOLUNTEER;
    replacement.jobRole = "volunteer_base";

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
        () -> usersService.replaceUser(admin._id, replacement));
    assertEquals("At least one admin account must remain in the system", exception.getMessage());
  }

  @Test
  void deleteUserByIdRejectsDeletingTheLastAdmin() {
    Users admin = usersService.findByUsername("testuser2");

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
        () -> usersService.deleteUserById(admin._id));
    assertEquals("At least one admin account must remain in the system", exception.getMessage());
  }

  @Test
  void deleteUserByIdAllowsDeletingAnAdminWhenAnotherAdminExists() {
    usersService.createUser(
      "testadmin3",
      "hash3",
      "Test Admin 3",
      "testadmin3@example.com",
      Role.ADMIN,
      null);
    Users admin = usersService.findByUsername("testuser2");

    usersService.deleteUserById(admin._id);

    assertNull(usersService.findByUsername("testuser2"));
    assertEquals(Role.ADMIN, usersService.findByUsername("testadmin3").systemRole);
  }

  @Test
  void deleteUserByIdThrowsWhenMissing() {
    assertThrows(NotFoundResponse.class,
        () -> usersService.deleteUserById("507f1f77bcf86cd799439011"));
  }

  @Test
  void updateUserFieldsPersistToRepository() {
    usersService.updateUserFullName("testuser1", "Updated Name");
    usersService.updateUserEmail("testuser1", "updated@example.com");
    usersService.updateUserPasswordHash("testuser1", "updatedHash");
    usersService.updateUserJobRole("testuser1", "volunteer_base");

    Users updated = usersService.findByUsername("testuser1");
    assertEquals("Updated Name", updated.fullName);
    assertEquals("updated@example.com", updated.email);
    assertEquals("updatedHash", updated.passwordHash);
    assertEquals("volunteer_base", updated.jobRole);
  }

  @Test
  void createUserBackwardCompatibleOverloadDefaultsVolunteerBase() {
    usersService.createUser("legacyuser", "legacyhash", "Legacy User", Role.VOLUNTEER);

    Users user = usersService.findByUsername("legacyuser");
    assertEquals("legacyuser", user.username);
    assertEquals("legacyhash", user.passwordHash);
    assertEquals("Legacy User", user.fullName);
    assertEquals(Role.VOLUNTEER, user.systemRole);
    assertEquals("volunteer_base", user.jobRole);
  }
}
