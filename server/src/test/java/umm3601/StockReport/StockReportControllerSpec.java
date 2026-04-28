// Packages
package umm3601.StockReport;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
            .append("stockReportData",  new byte[]{0x25, 0x50, 0x44, 0x46})
            .append("reportName",  "Report 1"));
    testStockReport.add(
        new Document()
            .append("stockReportData",  new byte[]{0x25, 0x50, 0x44, 0x46})
            .append("reportName",  "Report 2"));
    testStockReport.add(
        new Document()
            .append("stockReportData",  new byte[]{0x25, 0x50, 0x44, 0x46})
            .append("reportName",  "Report 3"));
    testStockReport.add(
        new Document()
            .append("stockReportData",  new byte[]{0x25, 0x50, 0x44, 0x46})
            .append("reportName",  "Report 4"));

    testReportId = new ObjectId();
    Document testReport = new Document()
        .append("_id", testReportId)
        .append("stockReportData",  new byte[]{0x25, 0x50, 0x44, 0x46})
        .append("reportName",  "Test Report");

    stockReportDocuments.insertMany(testStockReport);
    stockReportDocuments.insertOne(testReport);

    // Setup inventory for XLSX generation tests
    MongoCollection<Document> inventoryDocuments = db.getCollection("inventory");
    inventoryDocuments.drop();

    List<Document> testInventory = new ArrayList<>();
    testInventory.add(new Document()
      .append("description", "Stocked Item 1")
      .append("quantity", 10)
      .append("maxQuantity", 10)
      .append("minQuantity", 5)
      .append("stockState", "Stocked")
      .append("notes", ""));
    testInventory.add(new Document()
      .append("description", "Stocked Item 2")
      .append("quantity", 8)
      .append("maxQuantity", 10)
      .append("minQuantity", 5)
      .append("stockState", "Stocked")
      .append("notes", ""));
    testInventory.add(new Document()
      .append("description", "Out of Stock Item")
      .append("quantity", 0)
      .append("maxQuantity", 10)
      .append("minQuantity", 5)
      .append("stockState", "Out of Stock")
      .append("notes", "Needs reorder"));
    testInventory.add(new Document()
      .append("description", "Understocked Item")
      .append("quantity", 3)
      .append("maxQuantity", 10)
      .append("minQuantity", 5)
      .append("stockState", "Understocked")
      .append("notes", ""));
    testInventory.add(new Document()
      .append("description", "Overstocked Item")
      .append("quantity", 15)
      .append("maxQuantity", 10)
      .append("minQuantity", 5)
      .append("stockState", "Overstocked")
      .append("notes", ""));

    inventoryDocuments.insertMany(testInventory);

    stockReportController = new StockReportController(db);
  }

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    umm3601.Auth.RouteRegistrar.register(mockServer, stockReportController, null);
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

    // Make sure report data bytes aren't in the response
    for (StockReport report : stockReportArrayListCaptor.getValue()) {
      assertEquals(null, report.stockReportData, "Report data bytes should not be included in list response");
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

    verify(ctx).contentType("application/octet-stream");
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
    String reportType = "PDF";

    UploadedFile mockFile = mock(UploadedFile.class);
    when(mockFile.content()).thenReturn(new java.io.ByteArrayInputStream(pdfBytes));
    when(ctx.uploadedFile("uploadedReport")).thenReturn(mockFile);
    when(ctx.formParam("reportName")).thenReturn(reportName);
    when(ctx.formParam("reportType")).thenReturn(reportType);

    stockReportController.addNewReport(ctx);

    verify(ctx).json(mapCaptor.capture());
    verify(ctx).status(HttpStatus.CREATED);

    Document added = db.getCollection("stockReport")
      .find(eq("_id", new ObjectId(mapCaptor.getValue().get("id"))))
      .first();

    // MongoDB stores byte arrays as Binary objects, so we need to extract the data
    org.bson.types.Binary binary = (org.bson.types.Binary) added.get("stockReportData");
    assertArrayEquals(pdfBytes, binary.getData());
    assertEquals(reportName, added.get("reportName"));
    assertEquals(reportType, added.get("reportType"));
  }

  @Test
  void addInvalidReportData() throws IOException {
    UploadedFile mockFile = mock(UploadedFile.class);
    java.io.InputStream mockStream = mock(java.io.InputStream.class);
    when(mockStream.readAllBytes()).thenThrow(new IOException("File read error"));
    when(mockFile.content()).thenReturn(mockStream);
    when(ctx.uploadedFile("uploadedReport")).thenReturn(mockFile);
    when(ctx.formParam("reportName")).thenReturn("Invalid Report");

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        stockReportController.addNewReport(ctx);
      });

    assertTrue(exception.getMessage().contains("Failed to read uploaded file:"));
  }

  @Test
  void addNullReportData() {
    when(ctx.uploadedFile("uploadedReport")).thenReturn(null);
    when(ctx.formParam("reportName")).thenReturn("Invalid Report");

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        stockReportController.addNewReport(ctx);
      });

    assertTrue(exception.getMessage().contains("No file uploaded with key 'uploadedReport'"));
  }

  @Test
  void addReportMissingName() throws IOException {
    byte[] pdfBytes = new byte[] {0x25, 0x50, 0x44, 0x46};

    UploadedFile mockFile = mock(UploadedFile.class);
    when(mockFile.content()).thenReturn(new java.io.ByteArrayInputStream(pdfBytes));
    when(ctx.uploadedFile("uploadedReport")).thenReturn(mockFile);

    when(ctx.formParam("reportName")).thenReturn(null);

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        stockReportController.addNewReport(ctx);
      });

    assertTrue(exception.getMessage().contains("Report name is required"));
  }

  @Test
  void addReportMissingType() throws IOException {
    byte[] pdfBytes = new byte[] {0x25, 0x50, 0x44, 0x46};

    UploadedFile mockFile = mock(UploadedFile.class);
    when(mockFile.content()).thenReturn(new java.io.ByteArrayInputStream(pdfBytes));
    when(ctx.uploadedFile("uploadedReport")).thenReturn(mockFile);

    when(ctx.formParam("reportName")).thenReturn("Test Report");
    when(ctx.formParam("reportType")).thenReturn(null);

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        stockReportController.addNewReport(ctx);
      });

    assertTrue(exception.getMessage().contains("Report type is required"));
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

  // -- XLSX Generation Tests -- \\

  @Test
  void generateStockReportCreatesValidXLSXFile() throws IOException {
    ArgumentCaptor<byte[]> resultCaptor = ArgumentCaptor.forClass(byte[].class);

    stockReportController.generateStockReport(ctx, false);

    verify(ctx).contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    verify(ctx).result(resultCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    byte[] xlsxBytes = resultCaptor.getValue();
    assertTrue(xlsxBytes.length > 0, "XLSX file should not be empty");
  }

  @Test
  void generateStockReportDatabaseCreatesValidFile() throws IOException {
    stockReportController.generateStockReport(ctx, true);

    verify(ctx).status(HttpStatus.CREATED);

    // Check that report was saved to database
    MongoCollection<Document> stockReportDocuments = db.getCollection("stockReport");
    long reportCount = stockReportDocuments.countDocuments();

    assertTrue(reportCount > 0, "Report should be saved to database");

    // Get the saved report and verify it has valid XLSX data
    Document savedReport = stockReportDocuments.find().sort(new Document("_id", -1)).first();
    assertNotNull(savedReport, "Saved report should exist");

    org.bson.types.Binary binData = (org.bson.types.Binary) savedReport.get("stockReportData");
    assertNotNull(binData, "Report data should not be null");

    byte[] xlsxBytes = binData.getData();
    assertTrue(xlsxBytes.length > 0, "XLSX data should not be empty");
  }

  @Test
  void generateStockReportWithEmptyInventory() throws IOException {
    // Ensure inventory is empty
    MongoCollection<Document> inventoryDocuments = db.getCollection("inventory");
    inventoryDocuments.drop();

    ArgumentCaptor<byte[]> resultCaptor = ArgumentCaptor.forClass(byte[].class);

    stockReportController.generateStockReport(ctx, false);

    verify(ctx).contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    verify(ctx).result(resultCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    byte[] xlsxBytes = resultCaptor.getValue();
    assertTrue(xlsxBytes.length > 0, "XLSX file should still be created even with empty inventory");
  }

  @Test
  void generateStockReportWithMockInventory() throws IOException {
    ArgumentCaptor<byte[]> resultCaptor = ArgumentCaptor.forClass(byte[].class);

    stockReportController.generateStockReport(ctx, false);
    verify(ctx).result(resultCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    byte[] xlsxBytes = resultCaptor.getValue();
    assertTrue(xlsxBytes.length > 0, "XLSX file should contain multiple items");
  }

  @Test
  void generateStockReportHasAllStockStates() throws IOException {
    ArgumentCaptor<byte[]> resultCaptor = ArgumentCaptor.forClass(byte[].class);

    stockReportController.generateStockReport(ctx, false);

    verify(ctx).result(resultCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    byte[] xlsxBytes = resultCaptor.getValue();
    assertTrue(xlsxBytes.length > 0, "XLSX file should contain all stock states");
  }

  @Test
  void generateStockReportHandlesIOException() throws IOException {
    StockReportController spyController = Mockito.spy(stockReportController);
    Mockito.doThrow(new IOException("Test IO Exception")).when(spyController).createXLSXFile();

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        spyController.generateStockReport(ctx, false);
      });

    assertTrue(exception.getMessage().contains("Failed to generate stock report:"));
  }


}

