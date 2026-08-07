package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;

import java.util.Arrays;
import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.junit.jupiter.api.Test;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

@SuppressWarnings("MagicNumber")
class FamilyNeededItemLogControllerSpec {
  private FamilyController familyController;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @Mock
  private Context ctx;

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");
    mongoClient = MongoClients.create(
      MongoClientSettings.builder()
        .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
        .build());
    db = mongoClient.getDatabase("test-needed-item-log");
  }

  @AfterAll
  static void teardown() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() {
    MockitoAnnotations.openMocks(this);
    db.getCollection("neededItemLog").drop();
    familyController = new FamilyController(db);
  }

  @Test
  @SuppressWarnings("unchecked")
  void getNeededItemLogsReturnsPersistedNeededItemLogs() {
    db.getCollection("neededItemLog").insertOne(new Document()
      .append("familyId", "family-1")
      .append("guardianName", "Jordan Smith")
      .append("sectionId", "student-1")
      .append("sectionTitle", "Sam Supplies")
      .append("itemId", "item-1")
      .append("label", "Pencils")
      .append("requestedQuantity", 2)
      .append("reason", "not_available_didnt_receive")
      .append("createdAt", "2026-07-07T12:00:00Z"));
    ArgumentCaptor<List<NeededItemLog>> neededItemLogCaptor = ArgumentCaptor.forClass(List.class);

    familyController.getNeededItemLogs(ctx);

    verify(ctx).json(neededItemLogCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals(1, neededItemLogCaptor.getValue().size());
    assertEquals("family-1", neededItemLogCaptor.getValue().get(0).familyId);
    assertEquals("Pencils", neededItemLogCaptor.getValue().get(0).label);
  }
}
