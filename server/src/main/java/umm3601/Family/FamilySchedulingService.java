package umm3601.Family;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;
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
  private static final int DEFAULT_SCHEDULE_WINDOW_MINUTES = 60;
  private static final int DEFAULT_ENGLISH_COLUMN_COUNT = 1;
  private static final int DEFAULT_SPANISH_COLUMN_COUNT = 0;
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
    families.sort(Comparator.comparingInt(f -> availability(f).countTrue()));

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

    String normalized = timeSlot.trim();
    String[] rangeParts = normalized.split("\\s*[-\u2013\u2014]\\s*", 2);

    String endMeridiem = rangeParts.length == 2 ? meridiem(rangeParts[1]) : null;
    String startMeridiem = meridiem(rangeParts[0]);
    if (startMeridiem == null) {
      startMeridiem = endMeridiem == null ? fallbackMeridiem : endMeridiem;
    }
    if (endMeridiem == null) {
      endMeridiem = startMeridiem;
    }

    LocalTime start = parseScheduleTime(rangeParts[0], startMeridiem);
    LocalTime end = rangeParts.length == 2
        ? parseScheduleTime(rangeParts[1], endMeridiem)
        : start.plusMinutes(DEFAULT_SCHEDULE_WINDOW_MINUTES);

    if (!end.isAfter(start)) {
      throw new BadRequestResponse("Time slot end must be after the start time");
    }

    List<String> blocks = new ArrayList<>();
    LocalTime currentStart = start;

    while (currentStart.isBefore(end)) {
      LocalTime currentEnd = currentStart.plusMinutes(SCHEDULE_BLOCK_MINUTES);
      if (currentEnd.isAfter(end)) {
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

  private LocalTime parseScheduleTime(String timeText, String meridiem) {
    if (meridiem == null) {
      throw new BadRequestResponse("Time slot must include AM or PM");
    }

    String cleanedTime = timeText
        .replaceAll("(?i)\\b(AM|PM)\\b", "")
        .trim();

    try {
      return LocalTime.parse(cleanedTime + " " + meridiem, SCHEDULE_TIME_FORMATTER);
    } catch (DateTimeParseException exception) {
      throw new BadRequestResponse("Time slot contains an invalid time");
    }
  }

  private String meridiem(String timeText) {
    java.util.regex.Matcher matcher = Pattern.compile("(?i)\\b(AM|PM)\\b").matcher(timeText);
    String result = null;
    while (matcher.find()) {
      result = matcher.group(1).toUpperCase(Locale.US);
    }
    return result;
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
    int neededBlocks = requiredScheduleBlocks(family);
    String columnType = familyLanguageNeeds(family);
    SchedulePlacement placement = window.findAvailablePlacement(columnType, neededBlocks);

    if (placement == null) {
      return false;
    }

    window.reservePlacement(columnType, placement, neededBlocks);

    family.scheduleAssignment = new Family.ScheduleAssignment();
    family.timeSlot = combineScheduleBlocks(window.slots, placement.rowIndex, neededBlocks);
    family.scheduleAssignment.timeSlot = family.timeSlot;
    family.scheduleAssignment.columnType = columnType;
    family.scheduleAssignment.columnIndex = placement.columnIndex;
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
    int studentCount = family.students == null ? 0 : family.students.size();

    if (studentCount > EXTRA_LARGE_FAMILY_CHILDREN_THRESHOLD) {
      return EXTRA_LARGE_FAMILY_SCHEDULE_BLOCKS;
    }

    if (studentCount > LARGE_FAMILY_CHILDREN_THRESHOLD) {
      return LARGE_FAMILY_SCHEDULE_BLOCKS;
    }

    return STANDARD_FAMILY_SCHEDULE_BLOCKS;
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
    private final int rowIndex;
    private final int columnIndex;

    SchedulePlacement(int rowIndex, int columnIndex) {
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

    private SchedulePlacement findAvailablePlacement(String columnType, int neededBlocks) {
      return scheduleOccupancy.findAvailablePlacement(slots, columnType, neededBlocks);
    }

    private void reservePlacement(String columnType, SchedulePlacement placement, int neededBlocks) {
      scheduleOccupancy.reservePlacement(slots, columnType, placement, neededBlocks);
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

    private SchedulePlacement findAvailablePlacement(List<String> slots, String columnType, int neededBlocks) {
      int columnCount = columnCount(columnType);

      for (int rowIndex = 0; rowIndex + neededBlocks <= slots.size(); rowIndex++) {
        for (int columnIndex = 1; columnIndex <= columnCount; columnIndex++) {
          if (isColumnOpenForBlocks(slots, columnType, rowIndex, columnIndex, neededBlocks)) {
            return new SchedulePlacement(rowIndex, columnIndex);
          }
        }
      }

      return null;
    }

    private void reservePlacement(
        List<String> slots,
        String columnType,
        SchedulePlacement placement,
        int neededBlocks
    ) {
      Map<String, Set<Integer>> occupiedColumns = occupiedColumns(columnType);

      for (int rowIndex = placement.rowIndex; rowIndex < placement.rowIndex + neededBlocks; rowIndex++) {
        occupiedColumns
            .computeIfAbsent(slots.get(rowIndex), ignored -> new HashSet<>())
            .add(placement.columnIndex);
      }
    }

    private boolean isColumnOpenForBlocks(
        List<String> slots,
        String columnType,
        int startRowIndex,
        int columnIndex,
        int neededBlocks
    ) {
      Map<String, Set<Integer>> occupiedColumns = occupiedColumns(columnType);

      for (int rowIndex = startRowIndex; rowIndex < startRowIndex + neededBlocks; rowIndex++) {
        if (occupiedColumns.getOrDefault(slots.get(rowIndex), Set.of()).contains(columnIndex)) {
          return false;
        }
      }

      return true;
    }

    private int columnCount(String columnType) {
      return SPANISH_COLUMN_TYPE.equals(columnType) ? spanishColumnCount : englishColumnCount;
    }

    private Map<String, Set<Integer>> occupiedColumns(String columnType) {
      return SPANISH_COLUMN_TYPE.equals(columnType) ? spanishOccupiedColumns : englishOccupiedColumns;
    }
  }
}
