package umm3601.Demand;

public class DemandCalculationResult {
  private final long totalSupplyLists;
  private final long validInvIDCount;
  private final long invalidInvIDCount;
  private final long bestMatchNullCount;
  private final long schoolCount;

  public DemandCalculationResult(
      long totalSupplyLists,
      long validInvIDCount,
      long invalidInvIDCount,
      long bestMatchNullCount,
      long schoolCount
  ) {
    this.totalSupplyLists = totalSupplyLists;
    this.validInvIDCount = validInvIDCount;
    this.invalidInvIDCount = invalidInvIDCount;
    this.bestMatchNullCount = bestMatchNullCount;
    this.schoolCount = schoolCount;
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
}
