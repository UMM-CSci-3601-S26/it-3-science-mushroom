
package umm3601.Terms;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mongodb.client.DistinctIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

class TermsControllerSpec {

  private MongoCollection<Document> supplyListCollection;
  private MongoCollection<Document> inventoryCollection;
  private MongoDatabase db;
  private TermsController controller;
  private Context ctx;

  @SuppressWarnings("unchecked")
  @BeforeEach
  void setup() {
    db = mock(MongoDatabase.class);
    supplyListCollection = mock(MongoCollection.class);
    inventoryCollection = mock(MongoCollection.class);
    when(db.getCollection("supplylist")).thenReturn(supplyListCollection);
    when(db.getCollection("inventory")).thenReturn(inventoryCollection);
    controller = new TermsController(db);
    ctx = mock(Context.class);
  }

  /** Helper: creates a DistinctIterable mock that feeds the given values to forEach(). */
  @SuppressWarnings("unchecked")
  private DistinctIterable<String> makeIterable(List<String> values) {
    DistinctIterable<String> iterable = mock(DistinctIterable.class);
    doAnswer(inv -> {
      Consumer<String> consumer = (Consumer<String>) inv.getArgument(0);
      for (String v : values) {
        consumer.accept(v);
      }
      return null;
    }).when(iterable).forEach(any());
    return iterable;
  }

  /* Needs to be redone with new changes to setup */
  // @Test
  // void getTermsMergesAndSortsAllFields() {
  //   // Pre-create all iterables BEFORE any when() chain to avoid nested-stubbing
  //   DistinctIterable<String> slItem   = makeIterable(Arrays.asList("Crayon", "Marker"));
  //   DistinctIterable<String> slBrandA = makeIterable(Arrays.asList("Crayola", "BIC"));
  //   DistinctIterable<String> slBrandO = makeIterable(Arrays.asList("Expo"));
  //   DistinctIterable<String> slColorA = makeIterable(Arrays.asList("Red", "Blue"));
  //   DistinctIterable<String> slColorO = makeIterable(Arrays.asList("Green"));
  //   DistinctIterable<String> slSize   = makeIterable(Arrays.asList("Large"));
  //   DistinctIterable<String> slTypeA  = makeIterable(Arrays.asList("Washable"));
  //   DistinctIterable<String> slTypeO  = makeIterable(Arrays.asList("Permanent"));
  //   DistinctIterable<String> slMatA   = makeIterable(Arrays.asList("Plastic"));
  //   DistinctIterable<String> slMatO   = makeIterable(Arrays.asList("Wood"));

  //   DistinctIterable<String> invItem   = makeIterable(Arrays.asList("Pencil", "crayon"));
  //   DistinctIterable<String> invBrand  = makeIterable(Arrays.asList("BIC", "Papermate"));
  //   DistinctIterable<String> invColor  = makeIterable(Arrays.asList("Blue", "Yellow"));
  //   DistinctIterable<String> invSize   = makeIterable(Arrays.asList("Small"));
  //   DistinctIterable<String> invType   = makeIterable(Arrays.asList("Permanent", "Dry Erase"));
  //   DistinctIterable<String> invMat    = makeIterable(Arrays.asList("Metal"));

  //   when(supplyListCollection.distinct(eq("item"),          eq(String.class))).thenReturn(slItem);
  //   when(supplyListCollection.distinct(eq("brand.allOf"),   eq(String.class))).thenReturn(slBrandA);
  //   when(supplyListCollection.distinct(eq("brand.anyOf"),   eq(String.class))).thenReturn(slBrandO);
  //   when(supplyListCollection.distinct(eq("color.allOf"),   eq(String.class))).thenReturn(slColorA);
  //   when(supplyListCollection.distinct(eq("color.anyOf"),   eq(String.class))).thenReturn(slColorO);
  //   when(supplyListCollection.distinct(eq("size"),          eq(String.class))).thenReturn(slSize);
  //   when(supplyListCollection.distinct(eq("type.allOf"),    eq(String.class))).thenReturn(slTypeA);
  //   when(supplyListCollection.distinct(eq("type.anyOf"),    eq(String.class))).thenReturn(slTypeO);
  //   when(supplyListCollection.distinct(eq("material.allOf"), eq(String.class))).thenReturn(slMatA);
  //   when(supplyListCollection.distinct(eq("material.anyOf"), eq(String.class))).thenReturn(slMatO);

  //   when(inventoryCollection.distinct(eq("item"),     eq(String.class))).thenReturn(invItem);
  //   when(inventoryCollection.distinct(eq("brand"),    eq(String.class))).thenReturn(invBrand);
  //   when(inventoryCollection.distinct(eq("color"),    eq(String.class))).thenReturn(invColor);
  //   when(inventoryCollection.distinct(eq("size"),     eq(String.class))).thenReturn(invSize);
  //   when(inventoryCollection.distinct(eq("type"),     eq(String.class))).thenReturn(invType);
  //   when(inventoryCollection.distinct(eq("material"), eq(String.class))).thenReturn(invMat);

  //   doAnswer(inv -> {
  //     Terms terms = inv.getArgument(0);
  //     assertEquals(Arrays.asList("Crayon", "Marker", "Pencil"), terms.item);
  //     assertEquals(Arrays.asList("BIC", "Crayola", "Expo", "Papermate"), terms.brand);
  //     assertEquals(Arrays.asList("Blue", "Green", "Red", "Yellow"), terms.color);
  //     assertEquals(Arrays.asList("Large", "Small"), terms.size);
  //     assertEquals(Arrays.asList("Dry Erase", "Permanent", "Washable"), terms.type);
  //     assertEquals(Arrays.asList("Metal", "Plastic", "Wood"), terms.material);
  //     return null;
  //   }).when(ctx).json(any(Terms.class));

  //   controller.getTerms(ctx);
  //   verify(ctx).json(any(Terms.class));
  //   verify(ctx).status(eq(HttpStatus.OK));
  // }

  @Test
  void getTermsStripsBlanksAndNulls() {
    // Pre-create iterables BEFORE any when() chain
    DistinctIterable<String> empty = makeIterable(new ArrayList<>());
    DistinctIterable<String> withBlanks = makeIterable(Arrays.asList("", null, "  ", "Crayon"));

    // Default: all distinct() calls return empty iterable to avoid NPE
    when(supplyListCollection.distinct(any(String.class), eq(String.class))).thenReturn(empty);
    when(inventoryCollection.distinct(any(String.class), eq(String.class))).thenReturn(empty);

    // Override supplyList "item" to include blanks/nulls (registered after the default, so it wins)
    when(supplyListCollection.distinct(eq("item"), eq(String.class))).thenReturn(withBlanks);

    doAnswer(inv -> {
      Terms terms = inv.getArgument(0);
      assertEquals(List.of("Crayon"), terms.item);
      return null;
    }).when(ctx).json(any(Terms.class));

    controller.getTerms(ctx);
    verify(ctx).json(any(Terms.class));
    verify(ctx).status(eq(HttpStatus.OK));
  }

  @Test
  void singularizeHandlesBasicCases() {
    assertEquals("box", controller.singularize("boxes"));
    assertEquals("battery", controller.singularize("batteries"));
    assertEquals("brush", controller.singularize("brushes"));
    assertEquals("class", controller.singularize("classes"));
    assertEquals("glass", controller.singularize("glasses"));
    assertEquals("bus", controller.singularize("buses"));
    assertEquals("dress", controller.singularize("dresses"));
    assertEquals("blue", controller.singularize("blue"));
    assertEquals("crayon", controller.singularize("crayon"));
  }

  @Test
  void singularizeHandlesNullAndEmpty() {
    assertEquals(null, controller.singularize(null));
    assertEquals("", controller.singularize(""));
  }

  @Test
  void singularizeDoesNotMangleShortWords() {
    assertEquals("is", controller.singularize("is"));
    assertEquals("as", controller.singularize("as"));
    assertEquals("us", controller.singularize("us"));
  }

  @Test
  void singularizeDoesNotMangleWordsEndingWithss() {
    assertEquals("class", controller.singularize("class"));
    assertEquals("glass", controller.singularize("glass"));
    assertEquals("kiss", controller.singularize("kiss"));
  }
}
