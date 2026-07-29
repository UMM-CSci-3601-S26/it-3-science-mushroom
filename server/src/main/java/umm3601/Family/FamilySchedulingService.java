package umm3601.Family;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import io.javalin.http.NotFoundResponse;
import umm3601.Common.TimeSlotParser;
import umm3601.Common.TimeSlotParser.TimeRange;
import umm3601.Settings.Settings;
import umm3601.Family.Family.AvailabilityOptions;

public class FamilySchedulingService {
  private static final int SCHEDULE_BLOCK_MINUTES = 15;
  private static final int STANDARD_FAMILY_SCHEDULE_BLOCKS = 1;
  private static final int LARGE_FAMILY_SCHEDULE_BLOCKS = 2;
  private static final int EXTRA_LARGE_FAMILY_SCHEDULE_BLOCKS = 3;
  private static final int LARGE_FAMILY_CHILDREN_THRESHOLD = 3;
  private static final int EXTRA_LARGE_FAMILY_CHILDREN_THRESHOLD = 6;
  private static final int SCHEDULE_MERIDIEM_SUFFIX_LENGTH = 3;
  private static final int DEFAULT_ENGLISH_COLUMN_COUNT = 1;
  private static final int DEFAULT_SPANISH_COLUMN_COUNT = 0;
  private static final int EARLY_MORNING_AVAILABILITY_ORDER = 0;
  private static final int LATE_MORNING_AVAILABILITY_ORDER = 1;
  private static final int EARLY_AFTERNOON_AVAILABILITY_ORDER = 2;
  private static final int LATE_AFTERNOON_AVAILABILITY_ORDER = 3;
  private static final int NO_AVAILABILITY_ORDER = 4;
  private static final String ENGLISH_COLUMN_TYPE = "English";
  private static final String SPANISH_COLUMN_TYPE = "Spanish";
  private static final DateTimeFormatter SCHEDULE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("h:mm a", Locale.US);

  /**
   * Takes the list of families and goes through them one by one sorting them into the first available time slot.
   * Families with fewer preferences are prioritized. Earliest drive times are also prioritized.
   */
  public ArrayList<Family> schedulingAlgorithm(
      ArrayList<Family> families,
      Settings.TimeAvailabilityLabels currentSettings
  ) {
    return schedulingAlgorithm(families, currentSettings, null);
  }

  public ArrayList<Family> schedulingAlgorithm(
      ArrayList<Family> families,
      Settings.TimeAvailabilityLabels currentSettings,
      Settings.DefaultScheduleColumns defaultScheduleColumns
  ) {
    families.sort(Comparator
        .comparingInt((Family family) -> availability(family).countTrue())
        .thenComparing(Comparator.comparingInt(this::studentCount).reversed())
        .thenComparingInt(this::earliestAvailabilityOrder)
        .thenComparing(family -> family.guardianName == null ? "" : family.guardianName));

    if (currentSettings == null) {
      currentSettings = new Settings.TimeAvailabilityLabels();
    }

    ScheduleColumnCounts columnCounts = scheduleColumnCounts(defaultScheduleColumns);
    ScheduleOccupancy scheduleOccupancy = new ScheduleOccupancy(
        columnCounts.englishColumnCount,
        columnCounts.spanishColumnCount);

    ScheduleWindow earlyMorning = new ScheduleWindow(
        subdivideTimeSlot(currentSettings.earlyMorning, "AM"),
        scheduleOccupancy);
    ScheduleWindow lateMorning = new ScheduleWindow(
        subdivideTimeSlot(currentSettings.lateMorning, "AM"),
        scheduleOccupancy);
    ScheduleWindow earlyAfternoon = new ScheduleWindow(
        subdivideTimeSlot(currentSettings.earlyAfternoon, "PM"),
        scheduleOccupancy);
    ScheduleWindow lateAfternoon = new ScheduleWindow(
        subdivideTimeSlot(currentSettings.lateAfternoon, "PM"),
        scheduleOccupancy);

    for (Family family : families) {
      AvailabilityOptions familyAvailability = availability(family);

      if (familyAvailability.earlyMorning && assignFamilyToScheduleWindow(family, earlyMorning)) {
        continue;
      }

      if (familyAvailability.lateMorning && assignFamilyToScheduleWindow(family, lateMorning)) {
        continue;
      }

      if (familyAvailability.earlyAfternoon && assignFamilyToScheduleWindow(family, earlyAfternoon)) {
        continue;
      }

      if (familyAvailability.lateAfternoon && assignFamilyToScheduleWindow(family, lateAfternoon)) {
        continue;
      }

      throw new NotFoundResponse("Not all families were able to be sorted, your event capacity may be too low");
    }
    return families;
  }

  List<String> subdivideTimeSlot(String timeSlot) {
    return subdivideTimeSlot(timeSlot, null);
  }

  private List<String> subdivideTimeSlot(String timeSlot, String fallbackMeridiem) {
    if (timeSlot == null || timeSlot.isBlank()) {
      return List.of();
    }

    TimeRange range = TimeSlotParser.parseRange(timeSlot, fallbackMeridiem, "Time slot");
    List<String> blocks = new ArrayList<>();
    LocalTime currentStart = range.start();

    while (currentStart.isBefore(range.end())) {
      LocalTime currentEnd = currentStart.plusMinutes(SCHEDULE_BLOCK_MINUTES);
      if (currentEnd.isAfter(range.end())) {
        break;
      }

      blocks.add(formatScheduleBlock(currentStart, currentEnd));
      currentStart = currentEnd;
    }

    return blocks;
  }

  private AvailabilityOptions availability(Family family) {
    return family.timeAvailability == null ? new AvailabilityOptions() : family.timeAvailability;
  }

  private String formatScheduleBlock(LocalTime start, LocalTime end) {
    String startText = start.format(SCHEDULE_TIME_FORMATTER);
    String endText = end.format(SCHEDULE_TIME_FORMATTER);
    String startMeridiem = startText.substring(startText.length() - 2);
    String endMeridiem = endText.substring(endText.length() - 2);

    if (startMeridiem.equals(endMeridiem)) {
      return startText.substring(0, startText.length() - SCHEDULE_MERIDIEM_SUFFIX_LENGTH)
          + "-"
          + endText.substring(0, endText.length() - SCHEDULE_MERIDIEM_SUFFIX_LENGTH)
          + " "
          + endMeridiem;
    }

    return startText + "-" + endText;
  }
  // Return the current family language needs based on the boolean type.
  private String familyLanguageNeeds(Family family) {
    return family.needSpanishHelp ? SPANISH_COLUMN_TYPE : ENGLISH_COLUMN_TYPE;
  }

  private boolean assignFamilyToScheduleWindow(Family family, ScheduleWindow window) {
    int neededVolunteerCells = requiredScheduleBlocks(family);
    String columnType = familyLanguageNeeds(family);
    SchedulePlacement placement = window.findAvailablePlacement(columnType, neededVolunteerCells);

    if (placement == null) {
      return false;
    }

    window.reservePlacement(columnType, placement);

    family.timeSlot = combineScheduleBlocks(
        window.slots,
        placement.firstRowIndex(),
        placement.rowSpan());
    family.scheduleAssignments = scheduleAssignments(window.slots, columnType, placement);
    family.scheduleAssignment = family.scheduleAssignments.get(0);
    return true;
  }

  private ScheduleColumnCounts scheduleColumnCounts(Settings.DefaultScheduleColumns defaultScheduleColumns) {
    ScheduleColumnCounts columnCounts = new ScheduleColumnCounts();
    columnCounts.englishColumnCount = DEFAULT_ENGLISH_COLUMN_COUNT;
    columnCounts.spanishColumnCount = DEFAULT_SPANISH_COLUMN_COUNT;

    if (defaultScheduleColumns != null) {
      columnCounts.englishColumnCount = Math.max(
          DEFAULT_ENGLISH_COLUMN_COUNT,
          defaultScheduleColumns.englishFamilies);
      columnCounts.spanishColumnCount = Math.max(
          DEFAULT_SPANISH_COLUMN_COUNT,
          defaultScheduleColumns.spanishFamilies);
    }

    return columnCounts;
  }

  private int requiredScheduleBlocks(Family family) {
    int studentCount = studentCount(family);

    if (studentCount > EXTRA_LARGE_FAMILY_CHILDREN_THRESHOLD) {
      return EXTRA_LARGE_FAMILY_SCHEDULE_BLOCKS;
    }

    if (studentCount > LARGE_FAMILY_CHILDREN_THRESHOLD) {
      return LARGE_FAMILY_SCHEDULE_BLOCKS;
    }

    return STANDARD_FAMILY_SCHEDULE_BLOCKS;
  }

  private List<Family.ScheduleAssignment> scheduleAssignments(
      List<String> slots,
      String columnType,
      SchedulePlacement placement
  ) {
    List<Family.ScheduleAssignment> scheduleAssignments = new ArrayList<>();

    for (SchedulePlacementCell cell : placement.cells) {
      Family.ScheduleAssignment assignment = new Family.ScheduleAssignment();
      assignment.timeSlot = slots.get(cell.rowIndex);
      assignment.columnType = columnType;
      assignment.columnIndex = cell.columnIndex;
      scheduleAssignments.add(assignment);
    }

    return scheduleAssignments;
  }

  private int studentCount(Family family) {
    return family.students == null ? 0 : family.students.size();
  }

  private int earliestAvailabilityOrder(Family family) {
    AvailabilityOptions familyAvailability = availability(family);

    if (familyAvailability.earlyMorning) {
      return EARLY_MORNING_AVAILABILITY_ORDER;
    }
    if (familyAvailability.lateMorning) {
      return LATE_MORNING_AVAILABILITY_ORDER;
    }
    if (familyAvailability.earlyAfternoon) {
      return EARLY_AFTERNOON_AVAILABILITY_ORDER;
    }
    if (familyAvailability.lateAfternoon) {
      return LATE_AFTERNOON_AVAILABILITY_ORDER;
    }

    return NO_AVAILABILITY_ORDER;
  }

  private String combineScheduleBlocks(List<String> slots, int startIndex, int neededBlocks) {
    if (neededBlocks == 1) {
      return slots.get(startIndex);
    }

    String firstBlock = slots.get(startIndex);
    String lastBlock = slots.get(startIndex + neededBlocks - 1);

    String start = firstBlock.split("-", 2)[0].trim();
    String end = lastBlock.split("-", 2)[1].trim();
    return start + "-" + end;
  }

  private static final class ScheduleColumnCounts {
    private int englishColumnCount;
    private int spanishColumnCount;
  }

  private static class SchedulePlacement {
    private final List<SchedulePlacementCell> cells;

    SchedulePlacement(List<SchedulePlacementCell> cells) {
      this.cells = cells;
    }

    private int firstRowIndex() {
      return cells.stream()
          .mapToInt(cell -> cell.rowIndex)
          .min()
          .orElse(0);
    }

    private int rowSpan() {
      int firstRowIndex = firstRowIndex();
      int lastRowIndex = cells.stream()
          .mapToInt(cell -> cell.rowIndex)
          .max()
          .orElse(firstRowIndex);

      return lastRowIndex - firstRowIndex + 1;
    }
  }

  private static class SchedulePlacementCell {
    private final int rowIndex;
    private final int columnIndex;

    SchedulePlacementCell(int rowIndex, int columnIndex) {
      this.rowIndex = rowIndex;
      this.columnIndex = columnIndex;
    }
  }

  private static class ScheduleWindow {
    private final List<String> slots;
    private final ScheduleOccupancy scheduleOccupancy;

    ScheduleWindow(List<String> slots, ScheduleOccupancy scheduleOccupancy) {
      this.slots = slots;
      this.scheduleOccupancy = scheduleOccupancy;
    }

    private SchedulePlacement findAvailablePlacement(String columnType, int neededVolunteerCells) {
      return scheduleOccupancy.findAvailablePlacement(slots, columnType, neededVolunteerCells);
    }

    private void reservePlacement(String columnType, SchedulePlacement placement) {
      scheduleOccupancy.reservePlacement(slots, columnType, placement);
    }
  }

  private static class ScheduleOccupancy {
    private final int englishColumnCount;
    private final int spanishColumnCount;
    private final Map<String, Set<Integer>> englishOccupiedColumns;
    private final Map<String, Set<Integer>> spanishOccupiedColumns;

    ScheduleOccupancy(int englishColumnCount, int spanishColumnCount) {
      this.englishColumnCount = englishColumnCount;
      this.spanishColumnCount = spanishColumnCount;
      this.englishOccupiedColumns = new HashMap<>();
      this.spanishOccupiedColumns = new HashMap<>();
    }

    private SchedulePlacement findAvailablePlacement(List<String> slots, String columnType, int neededVolunteerCells) {
      int columnCount = columnCount(columnType);

      for (int startRowIndex = 0; startRowIndex < slots.size(); startRowIndex++) {
        SchedulePlacement sameRowPlacement = findSameRowPlacement(
            slots,
            columnType,
            startRowIndex,
            neededVolunteerCells,
            columnCount);
        if (sameRowPlacement != null) {
          return sameRowPlacement;
        }

        SchedulePlacement sameColumnPlacement = findSameColumnPlacement(
            slots,
            columnType,
            startRowIndex,
            neededVolunteerCells,
            columnCount);
        if (sameColumnPlacement != null) {
          return sameColumnPlacement;
        }
      }

      return null;
    }

    private SchedulePlacement findSameRowPlacement(
        List<String> slots,
        String columnType,
        int rowIndex,
        int neededVolunteerCells,
        int columnCount
    ) {
      for (int startColumnIndex = 1; startColumnIndex <= columnCount; startColumnIndex++) {
        List<SchedulePlacementCell> cells = new ArrayList<>();

        for (int columnOffset = 0; columnOffset < neededVolunteerCells; columnOffset++) {
          int columnIndex = startColumnIndex + columnOffset;

          if (columnIndex > columnCount
              || !isColumnOpen(slots.get(rowIndex), columnType, columnIndex)) {
            cells.clear();
            break;
          }

          cells.add(new SchedulePlacementCell(rowIndex, columnIndex));
        }

        if (cells.size() == neededVolunteerCells) {
          return new SchedulePlacement(cells);
        }
      }

      return null;
    }

    private SchedulePlacement findSameColumnPlacement(
        List<String> slots,
        String columnType,
        int startRowIndex,
        int neededVolunteerCells,
        int columnCount
    ) {
      for (int columnIndex = 1; columnIndex <= columnCount; columnIndex++) {
        List<SchedulePlacementCell> cells = new ArrayList<>();

        for (int rowOffset = 0; rowOffset < neededVolunteerCells; rowOffset++) {
          int rowIndex = startRowIndex + rowOffset;

          if (rowIndex >= slots.size()
              || !isColumnOpen(slots.get(rowIndex), columnType, columnIndex)) {
            cells.clear();
            break;
          }

          cells.add(new SchedulePlacementCell(rowIndex, columnIndex));
        }

        if (cells.size() == neededVolunteerCells) {
          return new SchedulePlacement(cells);
        }
      }

      return null;
    }

    private void reservePlacement(
        List<String> slots,
        String columnType,
        SchedulePlacement placement
    ) {
      Map<String, Set<Integer>> occupiedColumns = occupiedColumns(columnType);

      for (SchedulePlacementCell cell : placement.cells) {
        occupiedColumns
            .computeIfAbsent(slots.get(cell.rowIndex), ignored -> new HashSet<>())
            .add(cell.columnIndex);
      }
    }

    private boolean isColumnOpen(String slot, String columnType, int columnIndex) {
      return !occupiedColumns(columnType).getOrDefault(slot, Set.of()).contains(columnIndex);
    }

    private int columnCount(String columnType) {
      return SPANISH_COLUMN_TYPE.equals(columnType) ? spanishColumnCount : englishColumnCount;
    }

    private Map<String, Set<Integer>> occupiedColumns(String columnType) {
      return SPANISH_COLUMN_TYPE.equals(columnType) ? spanishOccupiedColumns : englishOccupiedColumns;
    }
  }
}
