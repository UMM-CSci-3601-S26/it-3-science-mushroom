
package umm3601.Terms;

import java.util.List;

/**
 * Represents the shared vocabulary collected from both the supplylist
 * and inventory collections. Returned by GET /api/terms and used to
 * drive autocomplete on the add-item forms.
 */
@SuppressWarnings({"VisibilityModifier"})
public class Terms {
  public List<String> item;
  public List<String> brand;
  public List<String> color;
  public List<String> size;
  public List<String> type;
  public List<String> material;
}
