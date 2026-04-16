// Packages
package umm3601.StockReport;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static com.mongodb.client.model.Filters.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// IO Imports
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

// Org Imports
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

// Com Imports
import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.UploadedFile;


@SuppressWarnings({ "MagicNumber" })
public class StockReportControllerSpec {

  private StockReportController stockReportController;
  private ObjectId testReportId;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<ArrayList<StockReport>> stockReportArrayListCaptor;

  @Captor
  private ArgumentCaptor<StockReport> stockReportCaptor;

  @Captor
  private ArgumentCaptor<Map<String, String>> mapCaptor;

  // -- Test Management -- \\

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
  static void teardown() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() throws IOException {
    MockitoAnnotations.openMocks(this);

    // Setup database
    MongoCollection<Document> stockReportDocuments = db.getCollection("stockReport");
    stockReportDocuments.drop();
    List<Document> testStockReport = new ArrayList<>();
    testStockReport.add(
        new Document()
            .append("stockReportPDF",  new byte[]{0x25, 0x50, 0x44, 0x46})
            .append("reportName",  "Report 1"));
    testStockReport.add(
        new Document()
            .append("stockReportPDF",  new byte[]{0x25, 0x50, 0x44, 0x46})
            .append("reportName",  "Report 2"));
    testStockReport.add(
        new Document()
            .append("stockReportPDF",  new byte[]{0x25, 0x50, 0x44, 0x46})
            .append("reportName",  "Report 3"));
    testStockReport.add(
        new Document()
            .append("stockReportPDF",  new byte[]{0x25, 0x50, 0x44, 0x46})
            .append("reportName",  "Report 4"));

    testReportId = new ObjectId();
    Document testReport = new Document()
        .append("_id", testReportId)
        .append("stockReportPDF",  new byte[]{0x25, 0x50, 0x44, 0x46})
        .append("reportName",  "Test Report");

    stockReportDocuments.insertMany(testStockReport);
    stockReportDocuments.insertOne(testReport);

    stockReportController = new StockReportController(db);
  }

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    stockReportController.addRoutes(mockServer);
    verify(mockServer, Mockito.atLeast(1)).get(any(), any());
  }

  // -- StockReport GET Tests -- \\

  @Test
  void canGetAllStockReport() throws IOException {
    when(ctx.queryParamMap()).thenReturn(Collections.emptyMap());

    stockReportController.getReports(ctx);

    verify(ctx).json(stockReportArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(
        db.getCollection("stockReport").countDocuments(),
        stockReportArrayListCaptor.getValue().size());

    // Make sure PDF bytes aren't in the response
    for (StockReport report : stockReportArrayListCaptor.getValue()) {
      assertEquals(null, report.stockReportData, "PDF bytes should not be included in list response");
    }
  }

  @Test
  void getStockReportWithExistentId() throws IOException {
    String id = testReportId.toHexString();
    when(ctx.pathParam("id")).thenReturn(id);

    stockReportController.getReportById(ctx);

    verify(ctx).json(stockReportCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals(testReportId.toHexString(), stockReportCaptor.getValue()._id);
  }

  @Test
  void getStockReportWithBadId() throws IOException {
    when(ctx.pathParam("id")).thenReturn("bad");

    assertThrows(IllegalArgumentException.class, () -> {
      stockReportController.getReportById(ctx);
    });
  }

  @Test
  void getStockReportWithNonexistentId() throws IOException {
    String id = "588935f5c668650dc77df581";
    when(ctx.pathParam("id")).thenReturn(id);

    assertThrows(NotFoundResponse.class, () -> {
      stockReportController.getReportById(ctx);
    });
  }

  @Test
  void getReportBytesWithExistentId() throws IOException {
    String id = testReportId.toHexString();
    when(ctx.pathParam("id")).thenReturn(id);

    stockReportController.getReportBytesById(ctx);

    verify(ctx).contentType("application/pdf");
    verify(ctx).result(new byte[]{0x25, 0x50, 0x44, 0x46});
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void getReportBytesWithBadId() throws IOException {
    when(ctx.pathParam("id")).thenReturn("bad");

    assertThrows(BadRequestResponse.class, () -> {
      stockReportController.getReportBytesById(ctx);
    });
  }

  @Test
  void getReportBytesWithNonexistentId() throws IOException {
    String id = "588935f5c668650dc77df581";
    when(ctx.pathParam("id")).thenReturn(id);

    assertThrows(NotFoundResponse.class, () -> {
      stockReportController.getReportBytesById(ctx);
    });
  }

  // -- StockReport POST Tests -- \\

  @Test
  @SuppressWarnings({ "MagicNumber" })
  void addNewReport() throws IOException {
    byte[] pdfBytes = new byte[] {0x25, 0x50, 0x44, 0x46}; // PDF file header bytes
    String reportName = "Charlie Brown's Report";

    UploadedFile mockFile = mock(UploadedFile.class);
    when(mockFile.content()).thenReturn(new java.io.ByteArrayInputStream(pdfBytes));
    when(ctx.uploadedFile("uploadedPDF")).thenReturn(mockFile);

    when(ctx.formParam("reportName")).thenReturn(reportName);

    stockReportController.addNewReport(ctx);

    verify(ctx).json(mapCaptor.capture());
    verify(ctx).status(HttpStatus.CREATED);

    Document added = db.getCollection("stockReport")
      .find(eq("_id", new ObjectId(mapCaptor.getValue().get("id"))))
      .first();

    // MongoDB stores byte arrays as Binary objects, so we need to extract the data
    org.bson.types.Binary binary = (org.bson.types.Binary) added.get("stockReportPDF");
    assertArrayEquals(pdfBytes, binary.getData());
    assertEquals(reportName, added.get("reportName"));
  }

  @Test
  void addInvalidReportData() throws IOException {
    UploadedFile mockFile = mock(UploadedFile.class);
    java.io.InputStream mockStream = mock(java.io.InputStream.class);
    when(mockStream.readAllBytes()).thenThrow(new IOException("File read error"));
    when(mockFile.content()).thenReturn(mockStream);
    when(ctx.uploadedFile("uploadedPDF")).thenReturn(mockFile);
    when(ctx.formParam("reportName")).thenReturn("Invalid Report");

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        stockReportController.addNewReport(ctx);
      });

    assertTrue(exception.getMessage().contains("Failed to read uploaded file:"));
  }

  @Test
  void addNullReportData() {
    when(ctx.uploadedFile("uploadedPDF")).thenReturn(null);
    when(ctx.formParam("reportName")).thenReturn("Invalid Report");

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        stockReportController.addNewReport(ctx);
      });

    assertTrue(exception.getMessage().contains("No file uploaded with key 'uploadedPDF'"));
  }

  @Test
  void addReportMissingName() throws IOException {
    byte[] pdfBytes = new byte[] {0x25, 0x50, 0x44, 0x46};

    UploadedFile mockFile = mock(UploadedFile.class);
    when(mockFile.content()).thenReturn(new java.io.ByteArrayInputStream(pdfBytes));
    when(ctx.uploadedFile("uploadedPDF")).thenReturn(mockFile);

    when(ctx.formParam("reportName")).thenReturn(null);

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        stockReportController.addNewReport(ctx);
      });

    assertTrue(exception.getMessage().contains("Report name is required"));
  }

  // -- Stock Report DELETE Tests -- \\

  @Test
  void deleteFoundReport() {
    when(ctx.pathParam("id"))
      .thenReturn(testReportId.toHexString());

    stockReportController.deleteReport(ctx);

    verify(ctx).status(HttpStatus.OK);

    assertEquals(0,
      db.getCollection("stockReport")
        .countDocuments(eq("_id", testReportId)));
  }

  @Test
  void deleteReportNotFound() {
    // Valid ObjectId format, but not in database
    String nonExistentId = new ObjectId().toHexString();
    when(ctx.pathParam("id")).thenReturn(nonExistentId);

    NotFoundResponse exception =
      assertThrows(NotFoundResponse.class, () -> {
        stockReportController.deleteReport(ctx);
      });

    verify(ctx).status(HttpStatus.NOT_FOUND);

    assertTrue(exception.getMessage().contains(nonExistentId));
    assertTrue(exception.getMessage().contains("Was unable to delete Report ID"));
  }

  @Test
  void deleteReportInvalidId() {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      stockReportController.deleteReport(ctx);
    });

    assertEquals(
      "The requested report id wasn't a legal Mongo Object ID.",
      exception.getMessage());
  }
}

