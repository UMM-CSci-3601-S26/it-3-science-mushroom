package umm3601.Family;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.mongojack.JacksonMongoCollection;

import umm3601.SupplyList.SupplyList;

/**
 * Builds current, non-snapshot family checklist previews from student data.
 *
 * Snapshot checklists still belong to the POS/help-session flow in FamilyController.
 */
public class FamilyChecklistGenerator {
  private static final String TEMPLATE_ID = "family-checklist-v1";

  private final JacksonMongoCollection<SupplyList> supplyListCollection;

  public FamilyChecklistGenerator(JacksonMongoCollection<SupplyList> supplyListCollection) {
    this.supplyListCollection = supplyListCollection;
  }

  public Family.FamilyChecklist generateCurrentFamilyChecklist(Family family) {
    Family.FamilyChecklist checklist = new Family.FamilyChecklist();
    checklist.templateId = TEMPLATE_ID;
    checklist.printableTitle = family == null || !hasText(family.guardianName)
      ? "Family Checklist"
      : family.guardianName + " Checklist";
    checklist.snapshot = false;
    checklist.sections = new ArrayList<>();

    if (family == null || family.students == null) {
      return checklist;
    }

    int studentIndex = 1;
    for (Family.StudentInfo student : family.students) {
      Family.ChecklistSection section = new Family.ChecklistSection();
      section.id = "student-" + studentIndex;
      section.title = student != null && hasText(student.name)
        ? student.name
        : "Student " + studentIndex;
      section.printableTitle = section.title;
      section.saved = false;
      section.items = buildCurrentChecklistItemsForStudent(student, section.id);
      checklist.sections.add(section);
      studentIndex++;
    }

    return checklist;
  }

  public List<SupplyList> getSupplyListsForStudent(Family.StudentInfo student) {
    if (student == null) {
      return List.of();
    }

    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    ArrayList<SupplyList> matching = new ArrayList<>();

    for (SupplyList supplyList : allSupplyLists) {
      if (!nameEquivalent(supplyList.school, student.school)) {
        continue;
      }
      if (!gradeEquivalent(supplyList.grade, student.grade)) {
        continue;
      }
      if (hasValue(supplyList.teacher) && !nameEquivalent(supplyList.teacher, student.teacher)) {
        continue;
      }
      matching.add(supplyList);
    }

    matching.sort(Comparator.comparing(supplyList -> supplyList.toString().toLowerCase(Locale.US)));
    return matching;
  }

  private List<Family.ChecklistItem> buildCurrentChecklistItemsForStudent(
    Family.StudentInfo student,
    String sectionId
  ) {
    List<Family.ChecklistItem> checklistItems = new ArrayList<>();
    List<SupplyList> supplyLists = getSupplyListsForStudent(student);

    int itemIndex = 1;
    for (SupplyList supplyList : supplyLists) {
      Family.ChecklistItem item = new Family.ChecklistItem();
      item.id = sectionId + "-item-" + itemIndex;
      item.label = supplyList.toString();
      item.itemDescription = supplyList.toString();
      item.supplyListId = supplyList._id;
      item.requestedQuantity = supplyList.quantity == null || supplyList.quantity <= 0
        ? 1
        : supplyList.quantity;
      checklistItems.add(item);
      itemIndex++;
    }

    return checklistItems;
  }

  private boolean nameEquivalent(String left, String right) {
    String leftToken = normalizeToken(left);
    String rightToken = normalizeToken(right);
    String strictLeftToken = normalizeTokenWithoutPluralFold(left);
    String strictRightToken = normalizeTokenWithoutPluralFold(right);
    return leftToken.equals(rightToken)
      || strictLeftToken.equals(acronymToken(right))
      || strictRightToken.equals(acronymToken(left));
  }

  private boolean gradeEquivalent(String left, String right) {
    String leftGrade = normalizeGradeToken(left);
    String rightGrade = normalizeGradeToken(right);
    return leftGrade.equals(rightGrade)
      || "highschool".equals(leftGrade) && isHighSchoolGrade(rightGrade)
      || "highschool".equals(rightGrade) && isHighSchoolGrade(leftGrade)
      || "middleschool".equals(leftGrade) && isMiddleSchoolGrade(rightGrade)
      || "middleschool".equals(rightGrade) && isMiddleSchoolGrade(leftGrade)
      || "elementary".equals(leftGrade) && isElementaryGrade(rightGrade)
      || "elementary".equals(rightGrade) && isElementaryGrade(leftGrade);
  }

  private String normalizeToken(String value) {
    String normalized = normalizeTokenWithoutPluralFold(value);
    if (normalized.endsWith("s") && normalized.length() > 1) {
      return normalized.substring(0, normalized.length() - 1);
    }
    return normalized;
  }

  private String normalizeTokenWithoutPluralFold(String value) {
    if (value == null) {
      return "";
    }
    return value.trim().toLowerCase(Locale.US).replaceAll("[^a-z0-9]+", "");
  }

  private String normalizeGradeToken(String value) {
    String normalized = normalizeToken(value);
    if ("kindergarten".equals(normalized)) {
      return "k";
    }
    if ("prekindergarten".equals(normalized) || "prekindergarden".equals(normalized)) {
      return "prek";
    }
    String withoutGradeWord = normalized.replace("grade", "");
    return withoutGradeWord.replaceAll("(\\d+)(st|nd|rd|th)$", "$1");
  }

  private boolean isHighSchoolGrade(String grade) {
    return "9".equals(grade) || "10".equals(grade) || "11".equals(grade) || "12".equals(grade);
  }

  private boolean isMiddleSchoolGrade(String grade) {
    return "6".equals(grade) || "7".equals(grade) || "8".equals(grade);
  }

  private boolean isElementaryGrade(String grade) {
    return "prek".equals(grade) || "k".equals(grade)
      || "1".equals(grade) || "2".equals(grade) || "3".equals(grade)
      || "4".equals(grade) || "5".equals(grade);
  }

  private String acronymToken(String value) {
    if (value == null) {
      return "";
    }
    String[] parts = value.trim().toLowerCase(Locale.US).split("[^a-z0-9]+");
    StringBuilder acronym = new StringBuilder();
    for (String part : parts) {
      if (!part.isBlank()) {
        acronym.append(part.charAt(0));
      }
    }
    return acronym.length() > 1 ? acronym.toString() : "";
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private boolean hasValue(String value) {
    return hasText(value) && !"n/a".equalsIgnoreCase(value.trim());
  }
}
