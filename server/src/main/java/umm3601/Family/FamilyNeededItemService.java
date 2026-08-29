package umm3601.Family;

import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static umm3601.Family.ChecklistItemRules.isNeededButNotAcquiredReason;
import static umm3601.Family.ChecklistItemRules.isServedToFamily;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.ReplaceOptions;

public class FamilyNeededItemService {
  private final JacksonMongoCollection<NeededItemLog> neededItemLogCollection;

  public FamilyNeededItemService(MongoDatabase database) {
    this(JacksonMongoCollection.builder().build(
      database,
      "neededItemLog",
      NeededItemLog.class,
      UuidRepresentation.STANDARD));
  }

  FamilyNeededItemService(JacksonMongoCollection<NeededItemLog> neededItemLogCollection) {
    this.neededItemLogCollection = neededItemLogCollection;
  }

  public List<NeededItem> recordNeededButNotAcquiredItems(Family family) {
    List<NeededItem> neededItems = neededButNotAcquiredItemsFor(family);
    for (NeededItem neededItem : neededItems) {
      NeededItemLog log = NeededItemLog.from(neededItem, Instant.now().toString());
      neededItemLogCollection.replaceOne(logFilter(log), log, new ReplaceOptions().upsert(true));
    }
    return neededItems;
  }

  public List<NeededItem> removeNeededButNotAcquiredItemLogs(Family family) {
    List<NeededItem> neededItems = neededButNotAcquiredItemsFor(family);
    for (NeededItem neededItem : neededItems) {
      neededItemLogCollection.deleteOne(logFilter(NeededItemLog.from(neededItem, null)));
    }
    return neededItems;
  }

  public List<NeededItemLog> getNeededItemLogs() {
    return neededItemLogCollection.find().into(new ArrayList<>());
  }

  private List<NeededItem> neededButNotAcquiredItemsFor(Family family) {
    List<NeededItem> neededItems = new ArrayList<>();
    if (family == null || family.checklist == null || family.checklist.sections == null) {
      return neededItems;
    }

    for (Family.ChecklistSection section : family.checklist.sections) {
      if (section.items == null) {
        continue;
      }

      for (Family.ChecklistItem item : section.items) {
        if (isNeededButNotAcquired(item)) {
          neededItems.add(new NeededItem(family, section, item));
        }
      }
    }

    return neededItems;
  }

  private boolean isNeededButNotAcquired(Family.ChecklistItem item) {
    return item != null
      && !isServedToFamily(item)
      && isNeededButNotAcquiredReason(item.notPickedUpReason);
  }

  private Bson logFilter(NeededItemLog log) {
    return and(
      eq("familyId", log.familyId),
      eq("sectionId", log.sectionId),
      eq("itemId", log.itemId));
  }

  public static class NeededItem {
    private final String familyId;
    private final String guardianName;
    private final String sectionId;
    private final String sectionTitle;
    private final String itemId;
    private final String label;
    private final Integer requestedQuantity;
    private final String reason;

    NeededItem(Family family, Family.ChecklistSection section, Family.ChecklistItem item) {
      familyId = family._id;
      guardianName = family.guardianName;
      sectionId = section.id;
      sectionTitle = section.printableTitle != null ? section.printableTitle : section.title;
      itemId = item.id;
      label = item.label != null ? item.label : item.itemDescription;
      requestedQuantity = item.requestedQuantity;
      reason = item.notPickedUpReason;
    }

    public String getFamilyId() {
      return familyId;
    }

    public String getGuardianName() {
      return guardianName;
    }

    public String getSectionId() {
      return sectionId;
    }

    public String getSectionTitle() {
      return sectionTitle;
    }

    public String getItemId() {
      return itemId;
    }

    public String getLabel() {
      return label;
    }

    public Integer getRequestedQuantity() {
      return requestedQuantity;
    }

    public String getReason() {
      return reason;
    }
  }
}
