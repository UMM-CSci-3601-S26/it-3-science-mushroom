package umm3601.Demand;

public class DemandCalculationResult {
  private final long totalSupplyLists;
  private final long validInvIDCount;
  private final long invalidInvIDCount;
  private final long bestMatchNullCount;
  private final long schoolCount;
  private final java.util.List<String> validInvIDs;

  public DemandCalculationResult(
      long totalSupplyLists,
      long validInvIDCount,
      long invalidInvIDCount,
      long bestMatchNullCount,
      long schoolCount,
      java.util.List<String> validInvIDs
  ) {
    this.totalSupplyLists = totalSupplyLists;
    this.validInvIDCount = validInvIDCount;
    this.invalidInvIDCount = invalidInvIDCount;
    this.bestMatchNullCount = bestMatchNullCount;
    this.schoolCount = schoolCount;
    this.validInvIDs = validInvIDs;
  }

  public long getTotalSupplyLists() {
    return totalSupplyLists;
  }

  public long getValidInvIDCount() {
    return validInvIDCount;
  }

  public long getInvalidInvIDCount() {
    return invalidInvIDCount;
  }

  public long getBestMatchNullCount() {
    return bestMatchNullCount;
  }

  public long getSchoolCount() {
    return schoolCount;
  }

  public java.util.List<String> getValidInvIDs() {
    return validInvIDs;
  }
}
