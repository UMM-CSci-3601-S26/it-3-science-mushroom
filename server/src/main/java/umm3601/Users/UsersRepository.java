package umm3601.Users;

import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.ne;
import static com.mongodb.client.model.Sorts.ascending;
import static com.mongodb.client.model.Updates.set;

import java.util.ArrayList;
import java.util.List;
import com.mongodb.client.MongoDatabase;
import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;
import umm3601.Auth.Role;

public class UsersRepository {
  private final JacksonMongoCollection<Users> users;

  public UsersRepository(MongoDatabase db) {
    this(JacksonMongoCollection.builder().build(
        db,
        "users",
        Users.class,
        UuidRepresentation.STANDARD));
  }

  public UsersRepository(JacksonMongoCollection<Users> users) {
    this.users = users;
  }

  public List<Users> findManagedUsers() {
    return users.find(ne("systemRole", Role.GUARDIAN))
        .sort(ascending("systemRole", "fullName", "username"))
        .into(new ArrayList<>());
  }

  public Users findByUsername(String username) {
    return users.find(eq("username", username)).first();
  }

  public Users findById(String userId) {
    return users.find(eq("_id", new ObjectId(userId))).first();
  }

  public void insert(Users user) {
    users.insertOne(user);
  }

  public long replace(String userId, Users user) {
    return users.replaceOne(eq("_id", new ObjectId(userId)), user).getMatchedCount();
  }

  public long deleteById(String userId) {
    return users.deleteOne(eq("_id", new ObjectId(userId))).getDeletedCount();
  }

  public void deleteByUsername(String username) {
    users.deleteOne(eq("username", username));
  }

  public void updateSystemRole(String username, Role role) {
    users.updateOne(eq("username", username), set("systemRole", role));
  }

  public void updateJobRole(String username, String jobRole) {
    users.updateOne(eq("username", username), set("jobRole", jobRole));
  }

  public void updatePasswordHash(String username, String passwordHash) {
    users.updateOne(eq("username", username), set("passwordHash", passwordHash));
  }

  public void updateFullName(String username, String fullName) {
    users.updateOne(eq("username", username), set("fullName", fullName));
  }

  public void updateEmail(String username, String email) {
    users.updateOne(eq("username", username), set("email", email));
  }

  public void updateEmailById(String userId, String email) {
    users.updateOne(eq("_id", new ObjectId(userId)), set("email", email));
  }

  public long countBySystemRole(Role role) {
    return users.countDocuments(eq("systemRole", role));
  }
}
