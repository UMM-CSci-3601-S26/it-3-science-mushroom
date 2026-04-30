package umm3601.Common;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.List;

import org.bson.conversions.Bson;
import org.junit.jupiter.api.Test;

import com.mongodb.client.model.Filters;

class MongoFiltersSpec {
  @Test
  void createsCaseInsensitiveExactFilter() {
    Bson filter = MongoFilters.caseInsensitiveExact("name", "Ada");

    assertNotNull(filter);
  }

  @Test
  void andAllHandlesEmptyAndNonEmptyFilters() {
    assertNotNull(MongoFilters.andAll(List.of()));
    assertNotNull(MongoFilters.andAll(List.of(Filters.eq("name", "Ada"))));
  }
}
