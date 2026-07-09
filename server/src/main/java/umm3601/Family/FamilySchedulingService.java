package umm3601.Family;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
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
    families.sort(Comparator.comparingInt(f -> availability(f).countTrue()));

    if (currentSettings == null) {
      currentSettings = new Settings.TimeAvailabilityLabels();
    }

    ScheduleWindow earlyMorning = new ScheduleWindow(subdivideTimeSlot(currentSettings.earlyMorning, "AM"));
    ScheduleWindow lateMorning = new ScheduleWindow(subdivideTimeSlot(currentSettings.lateMorning, "AM"));
    ScheduleWindow earlyAfternoon = new ScheduleWindow(subdivideTimeSlot(currentSettings.earlyAfternoon, "PM"));
    ScheduleWindow lateAfternoon = new ScheduleWindow(subdivideTimeSlot(currentSettings.lateAfternoon, "PM"));

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

  private boolean assignFamilyToScheduleWindow(Family family, ScheduleWindow window) {
    int neededBlocks = requiredScheduleBlocks(family);

    if (window.nextSlotIndex + neededBlocks > window.slots.size()) {
      return false;
    }

    family.timeSlot = combineScheduleBlocks(window.slots, window.nextSlotIndex, neededBlocks);
    window.nextSlotIndex += neededBlocks;
    return true;
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

  private static class ScheduleWindow {
    private final List<String> slots;
    private int nextSlotIndex;

    ScheduleWindow(List<String> slots) {
      this.slots = slots;
      this.nextSlotIndex = 0;
    }
  }
}
