// Package declaration
package umm3601.Common;

// Java Imports
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// IO Imports
import io.javalin.http.BadRequestResponse;

/**
 * Parses operator-entered schedule labels such as "8:00-9:00 AM" and
 * "11:30-12:30 PM".
 */
public final class TimeSlotParser {
  private static final int DEFAULT_RANGE_MINUTES = 60;
  private static final DateTimeFormatter TIME_FORMATTER =
      DateTimeFormatter.ofPattern("h:mm a", Locale.US);
  private static final Pattern MERIDIEM_PATTERN = Pattern.compile("(?i)(AM|PM)\\s*$");

  private TimeSlotParser() {
    // Utility class
  }

  public static TimeRange parseRange(String timeSlot, String fallbackMeridiem, String fieldName) {
    String[] rangeParts = timeSlot.trim().split("\\s*[-\u2013\u2014]\\s*", 2);
    String startText = rangeParts[0];
    String endText = rangeParts.length == 2 ? rangeParts[1] : null;

    String explicitStartMeridiem = meridiem(startText);
    String explicitEndMeridiem = endText == null ? null : meridiem(endText);
    List<String> startMeridiems = startMeridiemCandidates(
        explicitStartMeridiem,
        explicitEndMeridiem,
        fallbackMeridiem);

    if (startMeridiems.isEmpty()) {
      throw new BadRequestResponse(fieldName + " must include AM or PM.");
    }

    BadRequestResponse lastParseError = null;
    for (String startMeridiem : startMeridiems) {
      String endMeridiem = explicitEndMeridiem == null ? startMeridiem : explicitEndMeridiem;
      try {
        LocalTime start = parseTime(startText, startMeridiem, fieldName);
        LocalTime end = endText == null
            ? start.plusMinutes(DEFAULT_RANGE_MINUTES)
            : parseTime(endText, endMeridiem, fieldName);

        if (end.isAfter(start)) {
          return new TimeRange(start, end);
        }
      } catch (BadRequestResponse exception) {
        lastParseError = exception;
      }
    }

    if (lastParseError != null) {
      throw lastParseError;
    }
    throw new BadRequestResponse(fieldName + " end time must be after the start time.");
  }

  private static List<String> startMeridiemCandidates(
      String explicitStartMeridiem,
      String explicitEndMeridiem,
      String fallbackMeridiem
  ) {
    if (explicitStartMeridiem != null) {
      return List.of(explicitStartMeridiem);
    }

    List<String> candidates = new ArrayList<>();
    if (explicitEndMeridiem != null) {
      candidates.add(explicitEndMeridiem);
      candidates.add(oppositeMeridiem(explicitEndMeridiem));
      return candidates;
    }

    if (fallbackMeridiem != null) {
      candidates.add(fallbackMeridiem);
    }
    return candidates;
  }

  private static LocalTime parseTime(String timeText, String meridiem, String fieldName) {
    try {
      return LocalTime.parse(stripMeridiem(timeText) + " " + meridiem, TIME_FORMATTER);
    } catch (DateTimeParseException exception) {
      throw new BadRequestResponse(fieldName + " contains an invalid time.");
    }
  }

  private static String stripMeridiem(String timeText) {
    return MERIDIEM_PATTERN.matcher(timeText).replaceFirst("").trim();
  }

  private static String meridiem(String timeText) {
    Matcher matcher = MERIDIEM_PATTERN.matcher(timeText);
    return matcher.find() ? matcher.group(1).toUpperCase(Locale.US) : null;
  }

  private static String oppositeMeridiem(String meridiem) {
    return "AM".equals(meridiem) ? "PM" : "AM";
  }

  public static class TimeRange {
    private final LocalTime start;
    private final LocalTime end;

    TimeRange(LocalTime start, LocalTime end) {
      this.start = start;
      this.end = end;
    }

    public LocalTime start() {
      return start;
    }

    public LocalTime end() {
      return end;
    }
  }
}
