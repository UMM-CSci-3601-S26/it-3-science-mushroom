// Packages
package umm3601.StockReport;

// Static Imports
import static com.mongodb.client.model.Filters.eq;

import java.io.IOException;
// Java Imports
import java.util.ArrayList;
import java.util.Map;

// Org Imports
import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

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

// Controller
public class StockReportController implements Controller {

  private static final String API_STOCK_REPORT = "/api/stockreport";
  private static final String API_REPORT_BY_ID = "/api/stockreport/{id}";
  private static final String API_REPORT_BYTES_BY_ID = "/api/stockreport/{id}/bytes";

  private final JacksonMongoCollection<StockReport> stockReportCollection;

  public StockReportController(MongoDatabase database) {
    stockReportCollection = JacksonMongoCollection.builder().build(
      database,
      "stockReport",
      StockReport.class,
      UuidRepresentation.STANDARD
    );
  }

  /**
   * Get all reports in the system. Only returns the report name and ID, not the PDF bytes.
   * @param ctx the Javalin context containing the report
   */
  public void getReports(Context ctx) {
    ArrayList<StockReport> matchingReports = stockReportCollection
      .find()
      .projection(Projections.include("reportName", "_id")) // Only get report name and ID
      .into(new ArrayList<>());

    ctx.json(matchingReports);
    ctx.status(HttpStatus.OK);
  }

  /**
   * Get a single report by its ID. Returns the report name, ID, and PDF bytes.
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
   * Get the raw PDF bytes of a report by its ID. Returns only the PDF bytes with the correct content type.
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
      .projection(Projections.include("stockReportPDF"))  // Only get the PDF bytes
      .first();

    if (report == null) {
      throw new NotFoundResponse("No report with id " + id);
    }

    // Return the raw PDF bytes with correct content type
    ctx.contentType("application/pdf");
    ctx.result(report.stockReportPDF);
    ctx.status(HttpStatus.OK);
  }

  /**
   * Add a new report to the system.
   * @param ctx the Javalin context containing the report
   * @throws BadRequestResponse if the uploaded file is missing or cannot be read, or if the report name is missing
   */
  public void addNewReport(Context ctx) {
    byte[] fileBytes;
    UploadedFile uploadedFile = ctx.uploadedFile("uploadedPDF");
    if (uploadedFile != null) {
      try {
        fileBytes = uploadedFile.content().readAllBytes();
      } catch (IOException e) {
        throw new BadRequestResponse("Failed to read uploaded file: " + e.getMessage());
      }
    } else {
      throw new BadRequestResponse("No file uploaded with key 'uploadedPDF'");
    }

    String reportName = ctx.formParam("reportName");
    if (reportName == null || reportName.isEmpty()) {
      throw new BadRequestResponse("Report name is required");
    }

    StockReport newReport = new StockReport();

    newReport.reportName = reportName;
    newReport.stockReportPDF = fileBytes;

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
