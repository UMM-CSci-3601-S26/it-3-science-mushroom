package umm3601.Common;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mongojack.JacksonMongoCollection;

class BaseRepositorySpec {
  private JacksonMongoCollection<String> collection;
  private TestRepository repository;

  @SuppressWarnings("unchecked")
  @BeforeEach
  void setup() {
    collection = mock(JacksonMongoCollection.class);
    repository = new TestRepository(collection);
  }

  @Test
  void replaceAllDeletesAndOnlyInsertsWhenThereAreItems() {
    repository.replaceAllPublic(List.of());
    verify(collection).deleteMany(any(Document.class));

    repository.replaceAllPublic(List.of("one"));
    verify(collection).insertMany(List.of("one"));
  }

  private static class TestRepository extends BaseRepository<String> {
    TestRepository(JacksonMongoCollection<String> collection) {
      super(collection);
    }

    void replaceAllPublic(List<String> items) {
      replaceAll(items);
    }
  }
}
