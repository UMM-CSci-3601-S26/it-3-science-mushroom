package umm3601.Family;

public class FamilyHelpSessionSaveChildRequest {
  private String sectionId;
  private Family.ChecklistSection section;

  public String getSectionId() {
    return sectionId;
  }

  public void setSectionId(String sectionId) {
    this.sectionId = sectionId;
  }

  public Family.ChecklistSection getSection() {
    return section;
  }

  public void setSection(Family.ChecklistSection section) {
    this.section = section;
  }
}
