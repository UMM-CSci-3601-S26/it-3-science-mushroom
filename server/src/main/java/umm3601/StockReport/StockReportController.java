// Packages
package umm3601.StockReport;

// Static Imports
import static com.mongodb.client.model.Filters.eq;

// Java Imports
import java.util.ArrayList;
import java.util.Map;
import java.io.IOException;
import java.io.ByteArrayOutputStream;

// Org Imports
import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;
import org.apache.poi.ss.usermodel.Workbook;
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

@SuppressWarnings({ "MagicNumber" })
public class StockReportController implements Controller {

  private static final String API_STOCK_REPORT = "/api/stockreport";
  private static final String API_REPORT_BY_ID = "/api/stockreport/{id}";
  private static final String API_REPORT_BYTES_BY_ID = "/api/stockreport/{id}/bytes";
  private static final String API_GENERATE_REPORT = "/api/stockreport/generate";
  private static final String API_GENERATE_REPORT_AND_SAVE = "/api/stockreport/generate-and-save";

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

    // Separate StringBuilders for each Stock State report type
    StringBuilder stockedCSV = new StringBuilder();
    StringBuilder outOfStockCSV = new StringBuilder();
    StringBuilder understockedCSV = new StringBuilder();
    StringBuilder overstockedCSV = new StringBuilder();

    // Sheet Headers
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
        // Note! If description includes Inventory Item property names (e.g: brand, size, etc)
        // and they're separated by commas, it will put them in separate cells
        // Fixing would require extra logic for something that is ultimately very minor
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

    // Return all the CSVs as one string with section headers and spacing between sections
    return "Stocked Report:\n" + stockedCSV.toString() + "\n\n"
      + "Out of Stock Report:\n" + outOfStockCSV.toString() + "\n\n"
      + "Understocked Report:\n" + understockedCSV.toString() + "\n\n"
      + "Overstocked Report:\n" + overstockedCSV.toString();
  }

  /**
   * Helper method to convert an XSSFWorkbook to a byte array
   * @param workbook the XSSFWorkbook to convert
   * @return a byte array containing the XLSX file data
   * @throws IOException if there is an error writing the workbook to the byte array output stream
   */
  protected byte[] convertWorkbookToByteArray(Workbook workbook) throws IOException {
    try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
        // Write the workbook content to the output stream
        workbook.write(bos);

        // Return the byte array
        return bos.toByteArray();
    } finally {
        // Close the workbook to prevent memory leaks
        workbook.close();
    }
}

  /**
   * Creates an XLSX file with a separate sheet for each Stock State report
   * Uses stockStateToCSV() to get the data for each sheet
   * @returns byte array containing the XLSX file data
   * @throws IOException if there is an error writing the XLSX file
   */
  protected byte[] createXLSXFile() throws IOException {
    // Try to create workbook and file output stream
    try (
      XSSFWorkbook workbook = new XSSFWorkbook();
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

      // All Stock State sections follow this path:
      // Fill Stocked Items sheet
      if (sections.length > 0) {
          String[] stockedRows = sections[0].split("\n"); // Split into rows
          for (int i = 1; i < stockedRows.length; i++) {  // Skip header row
              if (stockedRows[i].trim().isEmpty()) {
                continue;
              } // Skip empty rows
              String[] cells = stockedRows[i].split(","); // Split into cells
              XSSFRow row = stockedSheet.createRow(i - 1); // Create row (i-1 because of header)
              for (int j = 0; j < cells.length; j++) { // Fill cells in row
                row.createCell(j).setCellValue(FamilyController.cleanUpCSV(cells[j])); // Clean CSV and set cell value
              }
          }
      }

      // Fill Out of Stock Items sheet
      if (sections.length > 1) {
          String[] outOfStockRows = sections[1].split("\n");
          for (int i = 1; i < outOfStockRows.length; i++) {
              if (outOfStockRows[i].trim().isEmpty()) {
                continue;
              }
              String[] cells = outOfStockRows[i].split(",");
              XSSFRow row = outOfStockSheet.createRow(i - 1);
              for (int j = 0; j < cells.length; j++) {
                  row.createCell(j).setCellValue(FamilyController.cleanUpCSV(cells[j]));
              }
          }
      }

      // Fill Understocked Items sheet
      if (sections.length > 2) {
          String[] understockedRows = sections[2].split("\n");
          for (int i = 1; i < understockedRows.length; i++) {
              if (understockedRows[i].trim().isEmpty()) {
                continue;
              }
              String[] cells = understockedRows[i].split(",");
              XSSFRow row = understockedSheet.createRow(i - 1);
              for (int j = 0; j < cells.length; j++) {
                  row.createCell(j).setCellValue(FamilyController.cleanUpCSV(cells[j]));
              }
          }
      }

      // Fill Overstocked Items sheet
      if (sections.length > 3) {
          String[] overstockedRows = sections[3].split("\n");
          for (int i = 1; i < overstockedRows.length; i++) {
              if (overstockedRows[i].trim().isEmpty()) {
                continue;
              }
              String[] cells = overstockedRows[i].split(",");
              XSSFRow row = overstockedSheet.createRow(i - 1);
              for (int j = 0; j < cells.length; j++) {
                  row.createCell(j).setCellValue(FamilyController.cleanUpCSV(cells[j]));
              }
          }
      }

      return convertWorkbookToByteArray(workbook);

    } catch (IOException e) {
      throw new IOException("Failed to create or write XLSX file. Details: " + e.getMessage(), e);
    }
  }

  /**
   * Uses createXLSXFile() to generate an XLSX file of the current Stock Report
   * @param ctx Javlin context containing necessary parameters
   * @param saveToDatabase Whether to save the report to the MongoDB database (true)
   *  or download it to the client machine (false)
   * @throws IOException if there is an error generating the XLSX file
   */
  public void generateStockReport(Context ctx, boolean saveToDatabase) {
    String timestamp = java.time.LocalDateTime.now()
    .format(java.time.format.DateTimeFormatter
      .ofPattern("yyyy-MM-dd_HH:mm"));

    try {
      byte[] workbookBytes = createXLSXFile();

      // Save to database
      if (saveToDatabase) {
        // Convert workbook to byte array and save to MongoDB
        StockReport newReport = new StockReport();
        newReport.reportName = "Stock Report - " + timestamp;
        newReport.reportType = "XLSX";
        newReport.stockReportData = workbookBytes;

        stockReportCollection.insertOne(newReport);
        ctx.status(HttpStatus.CREATED);
      } else { // Download to client
        // Set response headers for CSV download
        ctx.contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        ctx.header("Content-Disposition", "attachment; filename=Stock_Report_" + timestamp + ".xlsx");
        ctx.status(HttpStatus.OK);
        ctx.result(workbookBytes);
      }

    } catch (IOException e) {
      throw new BadRequestResponse("Failed to generate stock report: " + e.getMessage());
    }
  }

  @Override
  public void addRoutes(Javalin server) {
    // GET routes
    // Generate report and download to client
    server.get(API_GENERATE_REPORT, ctx -> generateStockReport(ctx, false));
    // Generate report and save to database
    server.get(API_GENERATE_REPORT_AND_SAVE, ctx -> generateStockReport(ctx, true));
    server.get(API_STOCK_REPORT, this::getReports); // All reports (only name and ID)
    server.get(API_REPORT_BY_ID, this::getReportById); // Report by ID (all fields)
    server.get(API_REPORT_BYTES_BY_ID, this::getReportBytesById); // Report bytes by ID (no name or ID returned)

    // POST routes
    server.post(API_STOCK_REPORT, this::addNewReport); // Add report

    // DELETE routes
    server.delete(API_REPORT_BY_ID, this::deleteReport); // Delete report
  }
}
