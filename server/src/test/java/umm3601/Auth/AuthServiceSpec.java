// package umm3601.Auth;

// import static org.junit.jupiter.api.Assertions.assertThrows;

// import org.junit.jupiter.api.AfterAll;
// import org.junit.jupiter.api.BeforeAll;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.Test;


// public class AuthServiceSpec {
//   private AuthService authService;

//   private static AuthValidator validator;

//   @BeforeAll
//   static void setup() {
//     validator = new AuthValidator();
//   }

//   @AfterAll
//   static void teardown() {
//     validator = null;
//   }

//   @BeforeEach
//   void beforeEach() {
//     authService = new AuthService(null, null, null, validator);
//   }

//   @Test
//   void validateLoginRejectsInvalidUsernames() {
//     AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
//     req.username = "invalid username";
//     req.password = "password";

//     assertThrows(IllegalArgumentException.class, () -> authService.login(req));
//   }

//   @Test
//   void validateLoginRejectsInvalidPasswords() {
//     AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
//     req.username = "validusername";
//     req.password = "short";

//     assertThrows(IllegalArgumentException.class, () -> authService.login(req));
//   }

//   @Test
//   void validateSignupRejectsInvalidUsernames() {
//     AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
//     req.username = "invalid username";
//     req.password = "validpassword";
//     req.fullName = "Valid Name";
//     req.email = "valid@email.com";
//     req.systemRole = Role.ADMIN;

//     assertThrows(IllegalArgumentException.class, () -> authService.signup(req));
//   }

//   @Test
//   void validateSignupRejectsInvalidPasswords() {
//     AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
//     req.username = "validusername";
//     req.password = "short";
//     req.fullName = "Valid Name";
//     req.email = "valid@email.com";
//     req.systemRole = Role.ADMIN;

//     assertThrows(IllegalArgumentException.class, () -> authService.signup(req));
//   }

//   @Test
//   void validateSignupRejectsInvalidFullNames() {
//     AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
//     req.username = "validusername";
//     req.password = "validpassword";
//     req.fullName = "   ";
//     req.email = "valid@email.com";
//     req.systemRole = Role.ADMIN;

//     assertThrows(IllegalArgumentException.class, () -> authService.signup(req));
//   }

//   @Test
//   void validateSignupRejectsInvalidEmails() {
//     AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
//     req.username = "validusername";
//     req.password = "validpassword";
//     req.fullName = "Valid Name";
//     req.email = "invalidemail";
//     req.systemRole = Role.ADMIN;

//     assertThrows(IllegalArgumentException.class, () -> authService.signup(req));
//   }

//   @Test
//   void validateSignupRejectsMissingEmailsForNonGuardians() {
//     AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
//     req.username = "validusername";
//     req.password = "validpassword";
//     req.fullName = "Valid Name";
//     req.email = "   ";
//     req.systemRole = Role.ADMIN;

//     assertThrows(IllegalArgumentException.class, () -> authService.signup(req));
//   }

//   @Test
//   void validateSignupAllowsMissingEmailsForGuardians() {
//     AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
//     req.username = "validusername";
//     req.password = "validpassword";
//     req.fullName = "Valid Name";
//     req.email = "   ";
//     req.systemRole = Role.GUARDIAN;

//     assertThrows(IllegalArgumentException.class, () -> authService.signup(req));
//   }
// }
