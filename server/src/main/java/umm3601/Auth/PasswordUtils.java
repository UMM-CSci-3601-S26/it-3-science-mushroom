// Package declaration
package umm3601.Auth;

// Bcrypt library for password hashing
import org.mindrot.jbcrypt.BCrypt;

/**
 * PasswordUtils â€” bcrypt password hashing helpers.
 *
 * Why bcrypt?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Bcrypt is a key-derivation function designed to be slow. Unlike fast hashes
 * (MD5, SHA-256), its cost factor makes brute-force and dictionary attacks
 * impractical even if the database is leaked.
 *
 * Cost factor 12 â€” each hash requires ~250 ms on modern hardware. That is
 * acceptable for a login request but prohibitively expensive for an attacker
 * iterating over millions of guesses.
 *
 * The bcrypt algorithm also incorporates a salt, which protects against rainbow
 * table attacks and ensures that identical passwords do not produce the same
 * hash.
 *
 * Functions provided by this class include:
 * hashPassword
 * checkPassword
 *
 * Why use PasswordUtils?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Centralizing password hashing and verification in a utility class promotes
 * code reuse and consistency across the application. It ensures that all
 * password handling follows best practices for security, such as using a strong
 * hashing algorithm and appropriate cost factor. By abstracting away the
 * details of password hashing, we can easily update our hashing strategy in the
 * future if needed without having to modify code throughout the application.
 *
 * *Passwords are NEVER stored in plain text anywhere in this codebase.*
 */

public class PasswordUtils {
  private static final int BCRYPT_COST_FACTOR = 12;

  /**
   * Hashes a plain text password using bcrypt with a cost factor of 12. The
   * resulting hash includes a salt and is suitable for secure storage in the
   * database. The cost factor of 12 provides a good balance between security and
   * performance.
   *
   * @param plain The plain text password to hash.
   * @return The bcrypt hash of the password.
   */
  public static String hashPassword(String plain) {
    return BCrypt.hashpw(plain, BCrypt.gensalt(BCRYPT_COST_FACTOR));
  }

  /**
   * Checks if a plain text password matches a previously hashed password. This
   * method uses bcrypt's built-in verification, which safely handles the salt and
   * cost factor embedded in the hash. It returns true if the password is correct
   * and false otherwise.
   *
   * @param plain The plain text password to verify.
   * @param hash  The previously hashed password to compare against.
   * @return True if the plain text password matches the hash, false otherwise.
   */
  public static boolean checkPassword(String plain, String hash) {
    return BCrypt.checkpw(plain, hash);
  }
}
