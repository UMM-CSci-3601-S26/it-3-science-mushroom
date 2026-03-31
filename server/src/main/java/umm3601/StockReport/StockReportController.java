// Packages
package umm3601.StockReport;

// Static Imports
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.regex;

import java.io.IOException;
// Java Imports
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

// Org Imports
import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

// Com Imports
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
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
import umm3601.StockReport.StockReport;

// Controller
public class StockReportController implements Controller {

  private static final String API_STOCK_REPORT = "/api/stockreport";
  private static final String API_REPORT_BY_ID = "/api/stockreport/{id}";

  private final JacksonMongoCollection<StockReport> stockReportCollection;

  public StockReportController(MongoDatabase database) {
    stockReportCollection = JacksonMongoCollection.builder().build(
      database,
      "stockReport",
      StockReport.class,
      UuidRepresentation.STANDARD
    );
  }

  // GET all reports
  public void getReports(Context ctx) {
    ArrayList<StockReport> matchingReports = stockReportCollection
      .find()
      .into(new ArrayList<>());

    ctx.json(matchingReports);
    ctx.status(HttpStatus.OK);
  }

  // GET report by ID
  public void getReportById(Context ctx) {
    String id = ctx.pathParam("id");
    StockReport report = stockReportCollection.find(eq("_id", new ObjectId(id))).first();

    if (report == null) {
      throw new NotFoundResponse("No report with id " + id);
    }

    ctx.json(report);
  }

  // POST new report
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

  // DELETE report by ID
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
        "Was unable to delete Report ID"
          + id
          + "; perhaps illegal Report ID or an ID for a Report not in the system?");
    }
    ctx.status(HttpStatus.OK);
  }

  @Override
  public void addRoutes(Javalin server) {
    // GET routes
    server.get(API_STOCK_REPORT, this::getReports); // All reports
    server.get(API_REPORT_BY_ID, this::getReportById); // Report by ID

    // POST routes
    server.post(API_STOCK_REPORT, this::addNewReport); // Add report

    // DELETE routes
    server.delete(API_STOCK_REPORT, this::deleteReport); // Delete report
  }
}
