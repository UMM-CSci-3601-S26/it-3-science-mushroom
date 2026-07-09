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

public class FamilySchedulingService {
  private static final int SCHEDULE_BLOCK_MINUTES = 15;
  private static final int LARGE_FAMILY_CHILDREN_THRESHOLD = 3;
  private static final int SCHEDULE_MERIDIEM_SUFFIX_LENGTH = 3;
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
    families.sort(Comparator.comparingInt(f -> f.timeAvailability.countTrue()));

    if (currentSettings == null) {
      currentSettings = new Settings.TimeAvailabilityLabels();
    }

    ScheduleWindow earlyMorning = new ScheduleWindow(subdivideTimeSlot(currentSettings.earlyMorning));
    ScheduleWindow lateMorning = new ScheduleWindow(subdivideTimeSlot(currentSettings.lateMorning));
    ScheduleWindow earlyAfternoon = new ScheduleWindow(subdivideTimeSlot(currentSettings.earlyAfternoon));
    ScheduleWindow lateAfternoon = new ScheduleWindow(subdivideTimeSlot(currentSettings.lateAfternoon));

    for (Family family : families) {
      if (family.timeAvailability.earlyMorning && assignFamilyToScheduleWindow(family, earlyMorning)) {
        continue;
      }

      if (family.timeAvailability.lateMorning && assignFamilyToScheduleWindow(family, lateMorning)) {
        continue;
      }

      if (family.timeAvailability.earlyAfternoon && assignFamilyToScheduleWindow(family, earlyAfternoon)) {
        continue;
      }

      if (family.timeAvailability.lateAfternoon && assignFamilyToScheduleWindow(family, lateAfternoon)) {
        continue;
      }

      throw new NotFoundResponse("Not all families were able to be sorted, your event capacity may be too low");
    }
    return families;
  }

  List<String> subdivideTimeSlot(String timeSlot) {
    if (timeSlot == null || timeSlot.isBlank()) {
      return List.of();
    }

    String normalized = timeSlot.trim();
    String[] rangeParts = normalized.split("\\s*-\\s*", 2);

    if (rangeParts.length != 2) {
      throw new BadRequestResponse("Time slot must be a range like 8:00-9:00 AM");
    }

    String endMeridiem = meridiem(rangeParts[1]);
    String startMeridiem = meridiem(rangeParts[0]);
    if (startMeridiem == null) {
      startMeridiem = endMeridiem;
    }

    LocalTime start = parseScheduleTime(rangeParts[0], startMeridiem);
    LocalTime end = parseScheduleTime(rangeParts[1], endMeridiem);

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
    if (family.students != null && family.students.size() > LARGE_FAMILY_CHILDREN_THRESHOLD) {
      return 2;
    }

    return 1;
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
