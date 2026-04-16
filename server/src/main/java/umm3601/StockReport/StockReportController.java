// Packages
package umm3601.StockReport;

// Static Imports
import static com.mongodb.client.model.Filters.eq;

// Java Imports
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.io.FileOutputStream;
import java.io.IOException;

// Org Imports
import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

// Com Imports
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Projections;
import com.mongodb.client.result.DeleteResult;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.UploadedFile;

// Misc Imports
import umm3601.Controller;
import umm3601.Inventory.Inventory;
import umm3601.Family.FamilyController;

// Controller
public class StockReportController implements Controller {

  private static final String API_STOCK_REPORT = "/api/stockreport";
  private static final String API_REPORT_BY_ID = "/api/stockreport/{id}";
  private static final String API_REPORT_BYTES_BY_ID = "/api/stockreport/{id}/bytes";

  private final JacksonMongoCollection<StockReport> stockReportCollection;
  private final JacksonMongoCollection<Inventory> inventoryCollection;

  public StockReportController(MongoDatabase database) {
    stockReportCollection = JacksonMongoCollection.builder().build(
      database,
      "stockReport",
      StockReport.class,
      UuidRepresentation.STANDARD
    );

    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );
  }

  /**
   * Get all reports in the system. Does not return content bytes, only name, type, and ID
   * @param ctx the Javalin context containing the report
   */
  public void getReports(Context ctx) {
    ArrayList<StockReport> matchingReports = stockReportCollection
      .find()
      .projection(Projections.include("reportName", "reportType", "_id")) // Only get report name, type, and ID
      .into(new ArrayList<>());

    ctx.json(matchingReports);
    ctx.status(HttpStatus.OK);
  }

  /**
   * Get a single report by its ID. Returns the report name, type, ID, and bytes.
   * @param ctx Javlin context containing the report
   * @throws IllegalArgumentException if the provided ID is not a valid Mongo Object ID
   * @throws NotFoundResponse if no report with the provided ID exists in the system
   */
  public void getReportById(Context ctx) {
    try {
      new ObjectId(ctx.pathParam("id"));
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("The requested report id wasn't a legal Mongo Object ID.");
    }
    String id = ctx.pathParam("id");
    StockReport report = stockReportCollection.find(eq("_id", new ObjectId(id))).first();

    if (report == null) {
      throw new NotFoundResponse("No report with id " + id);
    }

    ctx.json(report);
    ctx.status(HttpStatus.OK);
  }

  /**
   * Get the raw bytes of a report by its ID. Returns only the bytes with the correct content type.
   * @param ctx the Javalin context containing the report
   * @throws IllegalArgumentException if the provided ID is not a valid Mongo Object ID
   * @throws NotFoundResponse if no report with the provided ID exists in the system
   */
  public void getReportBytesById(Context ctx) {
    try {
      new ObjectId(ctx.pathParam("id"));
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested report id wasn't a legal Mongo Object ID.");
    }

    String id = ctx.pathParam("id");
    StockReport report = stockReportCollection
      .find(eq("_id", new ObjectId(id)))
      .projection(Projections.include("stockReportData"))  // Only get the report's bytes
      .first();

    if (report == null) {
      throw new NotFoundResponse("No report with id " + id);
    }

    // Return the raw report bytes (octet-stream is for generic binary data)
    // Note: could use an if statement based on reportType to set exact content type?
    ctx.contentType("application/octet-stream");
    ctx.result(report.stockReportData);
    ctx.status(HttpStatus.OK);
  }

  /**
   * Add a new report to the system.
   * @param ctx the Javalin context containing the report
   * @throws BadRequestResponse if the uploaded file is missing or cannot be read, or if the report name is missing
   */
  public void addNewReport(Context ctx) {
    byte[] fileBytes;
    UploadedFile uploadedFile = ctx.uploadedFile("uploadedReport");
    if (uploadedFile != null) {
      try {
        fileBytes = uploadedFile.content().readAllBytes();
      } catch (IOException e) {
        throw new BadRequestResponse("Failed to read uploaded file: " + e.getMessage());
      }
    } else {
      throw new BadRequestResponse("No file uploaded with key 'uploadedReport'");
    }

    String reportName = ctx.formParam("reportName");
    if (reportName == null || reportName.isEmpty()) {
      throw new BadRequestResponse("Report name is required");
    }

    String reportType = ctx.formParam("reportType");
    if (reportType == null || reportType.isEmpty()) {
      throw new BadRequestResponse("Report type is required");
    }

    StockReport newReport = new StockReport();

    newReport.reportName = reportName;
    newReport.reportType = reportType;
    newReport.stockReportData = fileBytes;

    stockReportCollection.insertOne(newReport);

    ctx.json(Map.of("id", newReport._id));
    ctx.status(HttpStatus.CREATED);
  }

  /**
   * Delete a report by its ID.
   * @param ctx the Javalin context containing the report
   * @throws IllegalArgumentException if the provided ID is not a valid Mongo Object ID
   * @throws NotFoundResponse if no report with the provided ID exists in the system
   */
  public void deleteReport(Context ctx) {
    String id = ctx.pathParam("id");
    DeleteResult deleteResult;

    // Handle case where ID is not proper
    try {
      ObjectId reportId = new ObjectId(id);
      deleteResult = stockReportCollection.deleteOne(eq("_id", reportId));
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested report id wasn't a legal Mongo Object ID.");
    }

    if (deleteResult.getDeletedCount() != 1) {
      ctx.status(HttpStatus.NOT_FOUND);
      throw new NotFoundResponse(
        "Was unable to delete Report ID "
          + id
          + "; perhaps illegal Report ID or an ID for a Report not in the system?");
    }

    ctx.status(HttpStatus.OK);
  }

  /**
   * Makes CSVs for each Stock State from Inventory
   * @returns Array of CSV strings, one for each Stock State report in the system
   * (Stocked, Out of Stock, Understocked, Overstocked)
   */
  private String stockStateToCSV() {
    ArrayList<Inventory> inventoryItems = inventoryCollection
      .find()
      // Only get fields relevant to Stock Reports
      .projection(Projections.include(
        "description",
        "quantity",
        "maxQuantity",
        "minQuantity",
        "stockState",
        "notes"))
      .into(new ArrayList<>());

    StringBuilder stockedCSV = new StringBuilder();
    StringBuilder outOfStockCSV = new StringBuilder();
    StringBuilder understockedCSV = new StringBuilder();
    StringBuilder overstockedCSV = new StringBuilder();

    // Headers
    stockedCSV.append("Item Description,Quantity,Max Quantity,Min Quantity,Notes\n");
    outOfStockCSV.append("Item Description,Quantity,Max Quantity,Min Quantity,Notes\n");
    understockedCSV.append("Item Description,Quantity,Max Quantity,Min Quantity,Notes\n");
    overstockedCSV.append("Item Description,Quantity,Max Quantity,Min Quantity,Notes\n");

    // Fill rows for each report type
    for (Inventory item : inventoryItems) {
      String row = String.format("\"%s\",%d,%d,%d,\"%s\"\n",
        FamilyController.cleanUpCSV(item.description),
        item.quantity,
        item.maxQuantity,
        item.minQuantity,
        FamilyController.cleanUpCSV(item.notes)
      );

      if (item.stockState == null) {
        continue; // skip items with no stock state
      }

      // Append row to appropriate CSV based on Stock State
      switch (item.stockState) {
        case "Stocked":
          stockedCSV.append(row);
          break;
        case "Out of Stock":
          outOfStockCSV.append(row);
          break;
        case "Understocked":
          understockedCSV.append(row);
          break;
        case "Overstocked":
          overstockedCSV.append(row);
          break;
        default:
          continue; // Skip items with invalid Stock State
      }
    }

    // Return all the CSVs as a map
    return "Stocked Report:\n" + stockedCSV.toString() + "\n\n"
      + "Out of Stock Report:\n" + outOfStockCSV.toString() + "\n\n"
      + "Understocked Report:\n" + understockedCSV.toString() + "\n\n"
      + "Overstocked Report:\n" + overstockedCSV.toString();
  }

  /**
   * Creates an XLSX file with a separate sheet for each Stock State report
   * Uses stockStateToCSV() to get the data for each sheet
   * @throws IOException if there is an error writing the XLSX file
   */
  private void createXLSXFile() throws IOException {
    // Try to create workbook and file output stream
    try (
      XSSFWorkbook workbook = new XSSFWorkbook();
      FileOutputStream fileOut = new FileOutputStream("tmp/StockReport.xlsx")
    ) {
      // Make separate sheets for each Stock State
      XSSFSheet stockedSheet = workbook.createSheet("Stocked Items");
      XSSFSheet outOfStockSheet = workbook.createSheet("Out of Stock Items");
      XSSFSheet understockedSheet = workbook.createSheet("Understocked Items");
      XSSFSheet overstockedSheet = workbook.createSheet("Overstocked Items");

      // Get CSV data for each sheet
      String csvData = stockStateToCSV();

      // Parse CSV data and fill sheets
      String[] sections = csvData.split("\n\n"); // Split into sections for each report type
      for (String section : sections) {
          String[] lines = section.split("\n");
          String sheetName = lines[0].replace(" Report:", ""); // Get sheet name
          // Fill appropriate sheet based on section header
          switch (sheetName) {
              case "Stocked Items":
                  String[] stockedRows = sections[0].toString().split("\n");
                  for (int i = 0; i < stockedRows.length; i++) {
                      String[] cells = stockedRows[i].split(",");
                      XSSFRow row = stockedSheet.createRow(i);
                      for (int j = 0; j < cells.length; j++) {
                          row.createCell(j).setCellValue(cells[j]);
                      }
                  }
                  break;
              case "Out of Stock Items":
                  String[] outOfStockRows = sections[1].toString().split("\n");
                  for (int i = 0; i < outOfStockRows.length; i++) {
                      String[] cells = outOfStockRows[i].split(",");
                      XSSFRow row = outOfStockSheet.createRow(i);
                      for (int j = 0; j < cells.length; j++) {
                          row.createCell(j).setCellValue(cells[j]);
                      }
                  }
                  break;
              case "Understocked Items":
                  String[] understockedRows = sections[2].toString().split("\n");
                  for (int i = 0; i < understockedRows.length; i++) {
                      String[] cells = understockedRows[i].split(",");
                      XSSFRow row = understockedSheet.createRow(i);
                      for (int j = 0; j < cells.length; j++) {
                          row.createCell(j).setCellValue(cells[j]);
                      }
                  }
                  break;
              case "Overstocked Items":
                  String[] overstockedRows = sections[3].toString().split("\n");
                  for (int i = 0; i < overstockedRows.length; i++) {
                      String[] cells = overstockedRows[i].split(",");
                      XSSFRow row = overstockedSheet.createRow(i);
                      for (int j = 0; j < cells.length; j++) {
                          row.createCell(j).setCellValue(cells[j]);
                      }
                  }
                  break;
              default:
                  continue; // Skip invalid sections
          }
      }

      workbook.write(fileOut);

    } catch (IOException e) {
      throw new IOException("Failed to create or write XLSX file. Details: " + e.getMessage(), e);
    }
  }

  /**
   * Generate Stock Report XLSX file and download it to client machine or
   * save to the server's MongoDB database
   * @param ctx Javlin context containing necessary parameters
   * @param saveToDatabase Whether to save the report to the MongoDB database (true) or download it to the client machine (false)
   * @throws IOException if there is an error generating the XLSX file
   */
  public void generateStockReport(Context ctx, boolean saveToDatabase) {
    try {
      createXLSXFile();
      ctx.result("Stock report generated successfully.");
      ctx.status(HttpStatus.OK);
    } catch (IOException e) {
      ctx.result("Failed to generate stock report: " + e.getMessage());
      ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Override
  public void addRoutes(Javalin server) {
    // GET routes
    server.get(API_STOCK_REPORT, this::getReports); // All reports (only name and ID)
    server.get(API_REPORT_BY_ID, this::getReportById); // Report by ID (all fields)
    server.get(API_REPORT_BYTES_BY_ID, this::getReportBytesById); // Report bytes by ID (no name or ID returned)

    // POST routes
    server.post(API_STOCK_REPORT, this::addNewReport); // Add report

    // DELETE routes
    server.delete(API_REPORT_BY_ID, this::deleteReport); // Delete report
  }
}
