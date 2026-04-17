package umm3601.Family;

public class FamilyStatusUpdateRequest {
  private Boolean helped;
  private String status;

  public Boolean getHelped() {
    return helped;
  }

  public void setHelped(Boolean helped) {
    this.helped = helped;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public boolean hasStatusUpdate() {
    return helped != null || status != null;
  }
}
