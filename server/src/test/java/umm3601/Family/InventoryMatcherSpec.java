package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

@SuppressWarnings({ "MagicNumber", "checkstyle:MethodLength" })
class InventoryMatcherSpec {
  private InventoryMatcher inventoryMatcher;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");

    mongoClient = MongoClients.create(
      MongoClientSettings.builder()
        .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
        .build());
    db = mongoClient.getDatabase("test");
  }

  @AfterAll
  static void teardown() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() {
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      new Document()
        .append("item", "Backpack")
        .append("description", "Student Backpack")
        .append("quantity", 3)
        .append("internalID", "ID-10000")
        .append("internalBarcode", "ITEM-10000")
        .append("externalBarcode", List.of("EXT-10000")),
      new Document()
        .append("item", "Notebook")
        .append("description", "Wide Ruled Notebook")
        .append("quantity", 4)
        .append("internalID", "ID-10001")
        .append("internalBarcode", "ITEM-10001")
        .append("externalBarcode", List.of("SUB-10001"))));

    inventoryMatcher = new InventoryMatcher(db);
  }

  @Test
  void inventoryMatchingHelpersCoverBranchyCases() {
    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Notebook");
    supplyList.brand = new SupplyList.AttributeOptions();
    supplyList.brand.allOf = "Five Star";
    supplyList.color = new SupplyList.ColorAttributeOptions();
    supplyList.color.anyOf = List.of("Blue", "Black");
    supplyList.size = new SupplyList.AttributeOptions();
    supplyList.size.anyOf = List.of("Wide");
    supplyList.type = new SupplyList.AttributeOptions();
    supplyList.type.allOf = "Ruled";
    supplyList.material = new SupplyList.AttributeOptions();
    supplyList.material.anyOf = List.of("Paper");
    supplyList.packageSize = 1;

    Inventory inventory = new Inventory();
    inventory.item = "Notebook";
    inventory.brand = "Five Star";
    inventory.color = "Blue";
    inventory.size = "Wide";
    inventory.type = "Ruled";
    inventory.material = "Paper";
    inventory.packageSize = 1;

    assertTrue(inventoryMatcher.inventoryMatchesSupplyList(inventory, supplyList));
    assertTrue(inventoryMatcher.inventorySpecificityScore(inventory) > 0);
  }

  @Test
  void findInventoryByBarcodeMatchesExternalBarcodeAndReturnsNullWhenMissing() {
    Inventory found = inventoryMatcher.findInventoryByBarcode("SUB-10001");
    assertNotNull(found);
    assertEquals("ID-10001", found.internalID);

    assertNull(inventoryMatcher.findInventoryByBarcode("MISSING-BARCODE"));
  }

  @Test
  void findBestInventoryMatchUsesOnlyUnreservedStock() {
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Pencil", 5, 5, "RESERVED-PENCIL"),
      inventoryDoc("Pencil", 1, 0, "AVAILABLE-PENCIL")));

    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Pencil");

    Inventory match = inventoryMatcher.findBestInventoryMatch(supplyList, 1);

    assertNotNull(match);
    assertEquals("AVAILABLE-PENCIL", match.internalID);
  }

  @Test
  void findBestInventoryMatchPrefersSimpleInventoryForBroadRequest() {
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Pencil", "Pencil", 4, 0, "PLAIN-PENCIL"),
      new Document()
        .append("item", "Pencil")
        .append("description", "Yellow pencil")
        .append("quantity", 30)
        .append("reservedQuantity", 0)
        .append("color", "Yellow")
        .append("internalID", "YELLOW-PENCIL")
        .append("internalBarcode", "YELLOW-PENCIL"),
      new Document()
        .append("item", "Pencil")
        .append("description", "Number 2 black Ticonderoga unsharpened pencil")
        .append("quantity", 100)
        .append("reservedQuantity", 0)
        .append("brand", "Ticonderoga")
        .append("color", "Black")
        .append("type", "Number 2")
        .append("material", "Wood")
        .append("internalID", "SPECIFIC-PENCIL")
        .append("internalBarcode", "SPECIFIC-PENCIL")));

    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Pencil");

    Inventory match = inventoryMatcher.findBestInventoryMatch(supplyList, 1);

    assertNotNull(match);
    assertEquals("PLAIN-PENCIL", match.internalID);
  }

  @Test
  void findBestInventoryMatchPrefersMatchingSizeDescriptor() {
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      new Document()
        .append("item", "Eraser")
        .append("description", "Pencil Topper Eraser")
        .append("quantity", 37)
        .append("reservedQuantity", 0)
        .append("type", "Pencil Topper")
        .append("internalID", "PENCIL-TOPPER-ERASER")
        .append("internalBarcode", "PENCIL-TOPPER-ERASER"),
      new Document()
        .append("item", "Eraser")
        .append("description", "Large Eraser")
        .append("quantity", 1)
        .append("reservedQuantity", 0)
        .append("size", "Large")
        .append("internalID", "LARGE-ERASER")
        .append("internalBarcode", "LARGE-ERASER")));

    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Eraser");
    supplyList.size = new SupplyList.AttributeOptions();
    supplyList.size.allOf = "Large";

    Inventory match = inventoryMatcher.findBestInventoryMatch(supplyList, 1);

    assertNotNull(match);
    assertEquals("LARGE-ERASER", match.internalID);
  }

  @Test
  void inventoryMatchCoversNegativeBranches() {
    SupplyList emptyItems = new SupplyList();
    emptyItems.item = null;

    Inventory inventory = new Inventory();
    inventory.item = "Notebook";
    inventory.brand = "Acme";
    inventory.color = "Blue";
    inventory.size = "Wide";
    inventory.type = "Ruled";
    inventory.material = "Paper";
    inventory.packageSize = 2;

    assertFalse(inventoryMatcher.inventoryMatchesSupplyList(inventory, emptyItems));

    SupplyList mismatchedBrand = new SupplyList();
    mismatchedBrand.item = List.of("Notebook");
    mismatchedBrand.brand = new SupplyList.AttributeOptions();
    mismatchedBrand.brand.allOf = "Other";
    assertFalse(inventoryMatcher.inventoryMatchesSupplyList(inventory, mismatchedBrand));

    SupplyList mismatchedPackage = new SupplyList();
    mismatchedPackage.item = List.of("Notebook");
    mismatchedPackage.packageSize = 1;
    assertFalse(inventoryMatcher.inventoryMatchesSupplyList(inventory, mismatchedPackage));

    SupplyList mismatchedColor = new SupplyList();
    mismatchedColor.item = List.of("Notebook");
    mismatchedColor.color = new SupplyList.ColorAttributeOptions();
    mismatchedColor.color.allOf = List.of("Red");
    assertFalse(inventoryMatcher.inventoryMatchesSupplyList(inventory, mismatchedColor));

    SupplyList mismatchedSize = new SupplyList();
    mismatchedSize.item = List.of("Notebook");
    mismatchedSize.size = new SupplyList.AttributeOptions();
    mismatchedSize.size.allOf = "Narrow";
    assertFalse(inventoryMatcher.inventoryMatchesSupplyList(inventory, mismatchedSize));

    SupplyList mismatchedType = new SupplyList();
    mismatchedType.item = List.of("Notebook");
    mismatchedType.type = new SupplyList.AttributeOptions();
    mismatchedType.type.allOf = "Composition";
    assertFalse(inventoryMatcher.inventoryMatchesSupplyList(inventory, mismatchedType));

    SupplyList mismatchedMaterial = new SupplyList();
    mismatchedMaterial.item = List.of("Notebook");
    mismatchedMaterial.material = new SupplyList.AttributeOptions();
    mismatchedMaterial.material.allOf = "Plastic";
    assertFalse(inventoryMatcher.inventoryMatchesSupplyList(inventory, mismatchedMaterial));

    SupplyList exactMatch = new SupplyList();
    exactMatch.item = List.of("Notebook");
    exactMatch.brand = new SupplyList.AttributeOptions();
    exactMatch.brand.allOf = "Acme";
    exactMatch.color = new SupplyList.ColorAttributeOptions();
    exactMatch.color.allOf = List.of("Blue");
    exactMatch.size = new SupplyList.AttributeOptions();
    exactMatch.size.allOf = "Wide";
    exactMatch.type = new SupplyList.AttributeOptions();
    exactMatch.type.allOf = "Ruled";
    exactMatch.material = new SupplyList.AttributeOptions();
    exactMatch.material.allOf = "Paper";
    exactMatch.packageSize = 2;
    assertTrue(inventoryMatcher.inventoryMatchesSupplyList(inventory, exactMatch));
  }

  @Test
  void attributeHelpersCoverNullAndMismatchBranches() throws Exception {
    assertTrue(invokeMatchesAttribute(null, "Blue"));

    SupplyList.AttributeOptions anyOf = new SupplyList.AttributeOptions();
    anyOf.anyOf = List.of("Blue", "Black");
    assertTrue(invokeMatchesAttribute(anyOf, "Blue"));
    assertFalse(invokeMatchesAttribute(anyOf, "Red"));

    SupplyList.AttributeOptions allOfMismatch = new SupplyList.AttributeOptions();
    allOfMismatch.allOf = "Wide";
    assertFalse(invokeMatchesAttribute(allOfMismatch, "Narrow"));

    SupplyList.ColorAttributeOptions colorAllOf = new SupplyList.ColorAttributeOptions();
    colorAllOf.allOf = List.of("Blue");
    assertFalse(invokeMatchesColorAttribute(colorAllOf, "Red"));

    SupplyList.ColorAttributeOptions colorAnyOf = new SupplyList.ColorAttributeOptions();
    colorAnyOf.anyOf = List.of("Black", "Red");
    assertTrue(invokeMatchesColorAttribute(colorAnyOf, "Red"));
    assertFalse(invokeMatchesColorAttribute(colorAnyOf, "Green"));
  }

  @Test
  void similarityHelpersCoverScoreBranches() {
    Inventory inventory = new Inventory();
    inventory.item = "Yellow Pencil";
    inventory.description = "Plastic writing pencil";
    inventory.brand = "Ticonderoga";
    inventory.color = "Yellow";
    inventory.material = "Wood";

    SupplyList exactItemSupplyList = new SupplyList();
    exactItemSupplyList.item = List.of("Yellow Pencil");
    assertEquals(100, inventoryMatcher.itemSimilarityScore(inventory, exactItemSupplyList));

    SupplyList searchableItemSupplyList = new SupplyList();
    searchableItemSupplyList.item = List.of("Plastic");
    assertEquals(75, inventoryMatcher.itemSimilarityScore(inventory, searchableItemSupplyList));

    SupplyList partialItemSupplyList = new SupplyList();
    partialItemSupplyList.item = List.of("Classroom Pencil");
    assertEquals(50, inventoryMatcher.itemSimilarityScore(inventory, partialItemSupplyList));

    SupplyList blankItemSupplyList = new SupplyList();
    blankItemSupplyList.item = List.of(" ");
    assertEquals(0, inventoryMatcher.itemSimilarityScore(inventory, blankItemSupplyList));

    SupplyList emptyItemSupplyList = new SupplyList();
    emptyItemSupplyList.item = List.of();
    assertEquals(0, inventoryMatcher.itemSimilarityScore(inventory, emptyItemSupplyList));

    SupplyList nullItemSupplyList = new SupplyList();
    nullItemSupplyList.item = null;
    assertEquals(0, inventoryMatcher.itemSimilarityScore(inventory, nullItemSupplyList));

    SupplyList shortPartialItemSupplyList = new SupplyList();
    shortPartialItemSupplyList.item = List.of("No 2");
    assertEquals(0, inventoryMatcher.itemSimilarityScore(inventory, shortPartialItemSupplyList));

    SupplyList.AttributeOptions requiredBrand = new SupplyList.AttributeOptions();
    requiredBrand.allOf = "Ticonderoga";
    assertEquals(5, inventoryMatcher.attributeSimilarityScore(requiredBrand, inventory.brand));

    SupplyList.AttributeOptions requiredBrandMiss = new SupplyList.AttributeOptions();
    requiredBrandMiss.allOf = "Crayola";
    assertEquals(0, inventoryMatcher.attributeSimilarityScore(requiredBrandMiss, inventory.brand));

    SupplyList.AttributeOptions optionalBrand = new SupplyList.AttributeOptions();
    optionalBrand.anyOf = List.of("Crayola", "Ticonderoga");
    assertEquals(3, inventoryMatcher.attributeSimilarityScore(optionalBrand, inventory.brand));

    SupplyList.AttributeOptions missingBrand = new SupplyList.AttributeOptions();
    missingBrand.allOf = "";
    missingBrand.anyOf = List.of("Crayola");
    assertEquals(0, inventoryMatcher.attributeSimilarityScore(missingBrand, inventory.brand));
    assertEquals(0, inventoryMatcher.attributeSimilarityScore(null, inventory.brand));

    SupplyList.ColorAttributeOptions requiredColor = new SupplyList.ColorAttributeOptions();
    requiredColor.allOf = List.of("Yellow");
    assertEquals(5, inventoryMatcher.colorSimilarityScore(requiredColor, inventory.color));

    SupplyList.ColorAttributeOptions requiredColorMiss = new SupplyList.ColorAttributeOptions();
    requiredColorMiss.allOf = List.of("Blue");
    assertEquals(0, inventoryMatcher.colorSimilarityScore(requiredColorMiss, inventory.color));

    SupplyList.ColorAttributeOptions optionalColor = new SupplyList.ColorAttributeOptions();
    optionalColor.anyOf = List.of("Blue", "Yellow");
    assertEquals(3, inventoryMatcher.colorSimilarityScore(optionalColor, inventory.color));

    SupplyList.ColorAttributeOptions missingColor = new SupplyList.ColorAttributeOptions();
    missingColor.allOf = List.of("Blue");
    missingColor.anyOf = List.of("Red");
    assertEquals(0, inventoryMatcher.colorSimilarityScore(missingColor, inventory.color));
    assertEquals(0, inventoryMatcher.colorSimilarityScore(null, inventory.color));
  }

  @Test
  void inventorySpecificityScoreCoversSparseAndPackageBranches() {
    Inventory sparseInventory = new Inventory();
    sparseInventory.brand = "N/A";
    sparseInventory.color = null;
    sparseInventory.size = "";
    sparseInventory.type = " ";
    sparseInventory.material = "N/A";
    sparseInventory.packageSize = 1;
    assertEquals(0, inventoryMatcher.inventorySpecificityScore(sparseInventory));

    Inventory bulkInventory = new Inventory();
    bulkInventory.brand = "N/A";
    bulkInventory.color = null;
    bulkInventory.size = "";
    bulkInventory.type = " ";
    bulkInventory.material = "N/A";
    bulkInventory.packageSize = 2;
    assertEquals(1, inventoryMatcher.inventorySpecificityScore(bulkInventory));
  }

  @Test
  void normalizeTokenFoldsPluralAndHandlesNull() throws Exception {
    assertEquals("notebook", invokeNormalizeToken(" Notebooks "));
    assertEquals("", invokeNormalizeToken(null));
  }

  private boolean invokeMatchesAttribute(SupplyList.AttributeOptions options, String inventoryValue) throws Exception {
    return invokePrivate("matchesAttribute",
      new Class<?>[] {SupplyList.AttributeOptions.class, String.class}, options, inventoryValue);
  }

  private boolean invokeMatchesColorAttribute(SupplyList.ColorAttributeOptions options, String inventoryValue)
      throws Exception {
    return invokePrivate("matchesColorAttribute",
      new Class<?>[] {SupplyList.ColorAttributeOptions.class, String.class}, options, inventoryValue);
  }

  private String invokeNormalizeToken(String value) throws Exception {
    return invokePrivate("normalizeToken", new Class<?>[] {String.class}, (Object) value);
  }

  private Document inventoryDoc(String item, int quantity, int reservedQuantity, String internalId) {
    return inventoryDoc(item, item, quantity, reservedQuantity, internalId);
  }

  private Document inventoryDoc(String item, String description, int quantity,
    int reservedQuantity, String internalId) {
    return new Document()
      .append("item", item)
      .append("description", description)
      .append("quantity", quantity)
      .append("reservedQuantity", reservedQuantity)
      .append("internalID", internalId)
      .append("internalBarcode", internalId);
  }

  @SuppressWarnings("unchecked")
  private <T> T invokePrivate(String methodName, Class<?>[] parameterTypes, Object... args) throws Exception {
    Method method = InventoryMatcher.class.getDeclaredMethod(methodName, parameterTypes);
    method.setAccessible(true);

    try {
      return (T) method.invoke(inventoryMatcher, args);
    } catch (InvocationTargetException exception) {
      if (exception.getCause() instanceof Exception) {
        throw (Exception) exception.getCause();
      }
      throw exception;
    }
  }
}
