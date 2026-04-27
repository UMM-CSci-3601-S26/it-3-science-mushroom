package umm3601.settings;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

public class SettingSpec {

  @Test
  void canCreateSettingsWithSchoolListAndTimeAvailability() {
    Settings settings = new Settings();
    settings._id = "app-settings";

    Settings.SchoolInfo schoolInfo = new Settings.SchoolInfo();
    schoolInfo.name = "Morris Area High School";
    schoolInfo.abbreviation = "MAHS";
    settings.schools = List.of(schoolInfo);

    Settings.TimeAvailabilityLabels labels = new Settings.TimeAvailabilityLabels();
    labels.earlyMorning = "8:30 AM - 10:30 AM";
    labels.lateMorning = "10:30 AM - 12:30 AM";
    labels.earlyAfternoon = "1:00 PM - 3:00 PM";
    labels.lateAfternoon = "3:00 PM - 5:00 PM";
    settings.timeAvailability = labels;

    assertEquals("app-settings", settings._id);
    assertEquals(1, settings.schools.size());
    assertEquals("Morris Area High School", settings.schools.get(0).name);
    assertEquals("MAHS", settings.schools.get(0).abbreviation);
    assertEquals("8:30 AM - 10:30 AM", settings.timeAvailability.earlyMorning);
    assertEquals("10:30 AM - 12:30 AM", settings.timeAvailability.lateMorning);
    assertEquals("1:00 PM - 3:00 PM", settings.timeAvailability.earlyAfternoon);
    assertEquals("3:00 PM - 5:00 PM", settings.timeAvailability.lateAfternoon);
    assertEquals(25, settings.barcodePrintWarningLimit);
  }

  @Test
  void schoolInfoStoresValues() {
    Settings.SchoolInfo info = new Settings.SchoolInfo();
    info.name = "Morris Area High School";
    info.abbreviation = "MAHS";

    assertEquals("Morris Area High School", info.name);
    assertEquals("MAHS", info.abbreviation);
  }

}

