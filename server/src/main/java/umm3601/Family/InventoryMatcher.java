package umm3601.Family;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;

import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

public class InventoryMatcher {
  private static final int EXACT_ITEM_MATCH_SCORE = 100;
  private static final int SEARCHABLE_ITEM_MATCH_SCORE = 75;
  private static final int PARTIAL_ITEM_MATCH_SCORE = 50;
  private static final int REQUIRED_PARTIAL_ITEM_TOKEN_LENGTH = 4;
  private static final int REQUIRED_ATTRIBUTE_MATCH_SCORE = 5;
  private static final int OPTIONAL_ATTRIBUTE_MATCH_SCORE = 3;
  private static final int PACKAGE_SIZE_MATCH_SCORE = 5;

  private final JacksonMongoCollection<Inventory> inventoryCollection;

  public InventoryMatcher(MongoDatabase database) {
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );
  }

  public Inventory findBestInventoryMatch(SupplyList supplyList, int requestedQuantity) {
    ArrayList<Inventory> inventories = inventoryCollection.find().into(new ArrayList<>());
    return inventories.stream()
      .filter(inventory -> unreservedQuantity(inventory) >= requestedQuantity)
      .filter(inventory -> requiredDescriptorsMatch(inventory, supplyList))
      .filter(inventory -> inventorySimilarityScore(inventory, supplyList) > 0)
      .max(Comparator
        .comparingInt((Inventory inventory) -> inventorySimilarityScore(inventory, supplyList))
        .thenComparingInt(inventory -> -inventorySpecificityScore(inventory)))
      .orElse(null);
  }

  public Inventory findBestSubstitutionMatch(SupplyList supplyList, int requestedQuantity) {
    ArrayList<Inventory> inventories = inventoryCollection.find().into(new ArrayList<>());
    return inventories.stream()
      .filter(inventory -> unreservedQuantity(inventory) >= requestedQuantity)
      .filter(inventory -> inventorySimilarityScore(inventory, supplyList) > 0)
      .max(Comparator
        .comparingInt((Inventory inventory) -> inventorySimilarityScore(inventory, supplyList))
        .thenComparingInt(inventory -> -inventorySpecificityScore(inventory)))
      .orElse(null);
  }

  public Inventory findInventoryByBarcode(String barcode) {
    ArrayList<Inventory> inventories = inventoryCollection.find().into(new ArrayList<>());
    for (Inventory inventory : inventories) {
      if (nameEquivalent(inventory.internalBarcode, barcode)) {
        return inventory;
      }
      if (inventory.externalBarcode != null && inventory.externalBarcode.stream()
        .anyMatch(code -> nameEquivalent(code, barcode))) {
        return inventory;
      }
    }
    return null;
  }

  public int unreservedQuantity(Inventory inventory) {
    return Math.max(0, inventory.quantity - inventory.reservedQuantity);
  }

  public boolean supplyListMatchesStudent(SupplyList supplyList, Family.StudentInfo student) {
    if (!nameEquivalent(supplyList.school, student.school)) {
      return false;
    }
    if (!gradeEquivalent(supplyList.grade, student.grade)) {
      return false;
    }
    return !hasValue(supplyList.teacher) || nameEquivalent(supplyList.teacher, student.teacher);
  }

  public int inventorySimilarityScore(Inventory inventory, SupplyList supplyList) {
    int itemScore = itemSimilarityScore(inventory, supplyList);
    if (itemScore == 0) {
      return 0;
    }

    int score = itemScore;
    score += attributeSimilarityScore(supplyList.brand, inventory.brand);
    score += colorSimilarityScore(supplyList.color, inventory.color);
    score += attributeSimilarityScore(supplyList.size, inventory.size);
    score += attributeSimilarityScore(supplyList.type, inventory.type);
    score += attributeSimilarityScore(supplyList.material, inventory.material);
    score += packageSizeSimilarityScore(supplyList, inventory);
    return score;
  }

  public int itemSimilarityScore(Inventory inventory, SupplyList supplyList) {
    if (supplyList.item == null || supplyList.item.isEmpty()) {
      return 0;
    }

    String inventoryName = normalizeToken(inventory.item);
    List<String> searchableTokens = searchableInventoryItemTokens(inventory);
    int bestScore = 0;

    for (String requestedItem : supplyList.item) {
      String requestedName = normalizeToken(requestedItem);
      if (requestedName.isBlank()) {
        continue;
      }
      if (requestedName.equals(inventoryName)) {
        bestScore = Math.max(bestScore, EXACT_ITEM_MATCH_SCORE);
        continue;
      }
      if (searchableTokens.contains(requestedName)) {
        bestScore = Math.max(bestScore, SEARCHABLE_ITEM_MATCH_SCORE);
        continue;
      }

      for (String requestedToken : tokenParts(requestedItem)) {
        if (requestedToken.length() >= REQUIRED_PARTIAL_ITEM_TOKEN_LENGTH
            && searchableTokens.contains(requestedToken)) {
          bestScore = Math.max(bestScore, PARTIAL_ITEM_MATCH_SCORE);
        }
      }
    }

    return bestScore;
  }

  public int attributeSimilarityScore(SupplyList.AttributeOptions options, String inventoryValue) {
    if (options == null) {
      return 0;
    }
    if (hasText(options.allOf) && nameEquivalent(options.allOf, inventoryValue)) {
      return REQUIRED_ATTRIBUTE_MATCH_SCORE;
    }
    if (options.anyOf != null && options.anyOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue))) {
      return OPTIONAL_ATTRIBUTE_MATCH_SCORE;
    }
    return 0;
  }

  public int colorSimilarityScore(SupplyList.ColorAttributeOptions options, String inventoryValue) {
    if (options == null) {
      return 0;
    }
    if (options.allOf != null && options.allOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue))) {
      return REQUIRED_ATTRIBUTE_MATCH_SCORE;
    }
    if (options.anyOf != null && options.anyOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue))) {
      return OPTIONAL_ATTRIBUTE_MATCH_SCORE;
    }
    return 0;
  }

  public int packageSizeSimilarityScore(SupplyList supplyList, Inventory inventory) {
    if (supplyList.packageSize == null || supplyList.packageSize <= 0) {
      return 0;
    }
    return Objects.equals(supplyList.packageSize, inventory.packageSize) ? PACKAGE_SIZE_MATCH_SCORE : 0;
  }

  private boolean requiredDescriptorsMatch(Inventory inventory, SupplyList supplyList) {
    if (!requiredItemMatches(inventory, supplyList)) {
      return false;
    }
    if (!requiredAttributeMatches(supplyList.brand, inventory.brand)) {
      return false;
    }
    if (!requiredColorMatches(supplyList.color, inventory.color)) {
      return false;
    }
    if (!requiredAttributeMatches(supplyList.size, inventory.size)) {
      return false;
    }
    if (!requiredAttributeMatches(supplyList.type, inventory.type)) {
      return false;
    }
    if (!requiredAttributeMatches(supplyList.material, inventory.material)) {
      return false;
    }
    if (supplyList.packageSize != null && supplyList.packageSize > 0) {
      return Objects.equals(supplyList.packageSize, inventory.packageSize);
    }
    return true;
  }

  private boolean requiredItemMatches(Inventory inventory, SupplyList supplyList) {
    if (supplyList.item == null || supplyList.item.isEmpty()) {
      return false;
    }

    List<String> searchableTokens = searchableInventoryIdentityTokens(inventory);
    for (String requestedItem : supplyList.item) {
      if (nameEquivalent(requestedItem, inventory.item)) {
        return true;
      }

      List<String> requestedTokens = tokenParts(requestedItem);
      if (!requestedTokens.isEmpty()
          && requestedTokens.stream().allMatch(searchableTokens::contains)) {
        return true;
      }
    }

    return false;
  }

  private boolean requiredAttributeMatches(
      SupplyList.AttributeOptions options,
      String inventoryValue
  ) {
    if (options == null) {
      return true;
    }
    if (hasText(options.allOf)) {
      return descriptorMatches(options.allOf, inventoryValue);
    }
    if (options.anyOf != null && !options.anyOf.isEmpty()) {
      return options.anyOf.stream()
        .anyMatch(option -> descriptorMatches(option, inventoryValue));
    }
    return true;
  }

  private boolean requiredColorMatches(
      SupplyList.ColorAttributeOptions options,
      String inventoryValue
  ) {
    if (options == null) {
      return true;
    }
    if (options.allOf != null && !options.allOf.isEmpty()) {
      return options.allOf.stream()
        .anyMatch(option -> descriptorMatches(option, inventoryValue));
    }
    if (options.anyOf != null && !options.anyOf.isEmpty()) {
      return options.anyOf.stream()
        .anyMatch(option -> descriptorMatches(option, inventoryValue));
    }
    return true;
  }

  private boolean descriptorMatches(String requestedValue, String inventoryValue) {
    return nameEquivalent(requestedValue, inventoryValue);
  }

  public boolean inventoryMatchesSupplyList(Inventory inventory, SupplyList supplyList) {
    if (supplyList.item == null || supplyList.item.isEmpty()) {
      return false;
    }

    boolean itemMatch = supplyList.item.stream().anyMatch(item -> nameEquivalent(item, inventory.item));
    if (!itemMatch) {
      return false;
    }

    if (!matchesAttribute(supplyList.brand, inventory.brand)) {
      return false;
    }
    if (!matchesColorAttribute(supplyList.color, inventory.color)) {
      return false;
    }
    if (!matchesAttribute(supplyList.size, inventory.size)) {
      return false;
    }
    if (!matchesAttribute(supplyList.type, inventory.type)) {
      return false;
    }
    if (!matchesAttribute(supplyList.material, inventory.material)) {
      return false;
    }
    if (supplyList.packageSize != null && supplyList.packageSize > 0 && inventory.packageSize > 0
      && !Objects.equals(supplyList.packageSize, inventory.packageSize)) {
      return false;
    }

    return true;
  }

  public int inventorySpecificityScore(Inventory inventory) {
    int score = 0;
    if (hasValue(inventory.brand)) {
      score++;
    }
    if (hasValue(inventory.color)) {
      score++;
    }
    if (hasValue(inventory.size)) {
      score++;
    }
    if (hasValue(inventory.type)) {
      score++;
    }
    if (hasValue(inventory.material)) {
      score++;
    }
    if (inventory.packageSize > 1) {
      score++;
    }
    return score;
  }

  public boolean nameEquivalent(String left, String right) {
    String leftToken = normalizeToken(left);
    String rightToken = normalizeToken(right);
    String strictLeftToken = normalizeTokenWithoutPluralFold(left);
    String strictRightToken = normalizeTokenWithoutPluralFold(right);
    return leftToken.equals(rightToken)
      || strictLeftToken.equals(acronymToken(right))
      || strictRightToken.equals(acronymToken(left));
  }

  public boolean hasValue(String value) {
    return hasText(value) && !"n/a".equalsIgnoreCase(value.trim());
  }

  private List<String> searchableInventoryItemTokens(Inventory inventory) {
    List<String> tokens = new ArrayList<>();
    tokens.add(normalizeToken(inventory.item));
    tokens.addAll(tokenParts(inventory.item));
    tokens.addAll(tokenParts(inventory.description));
    return tokens.stream()
      .filter(token -> !token.isBlank())
      .distinct()
      .toList();
  }

  private List<String> searchableInventoryIdentityTokens(Inventory inventory) {
    List<String> tokens = new ArrayList<>();
    tokens.add(normalizeToken(inventory.item));
    tokens.addAll(tokenParts(inventory.item));
    tokens.addAll(tokenParts(inventory.brand));
    tokens.addAll(tokenParts(inventory.color));
    tokens.addAll(tokenParts(inventory.size));
    tokens.addAll(tokenParts(inventory.type));
    tokens.addAll(tokenParts(inventory.material));
    return tokens.stream()
      .filter(token -> !token.isBlank())
      .distinct()
      .toList();
  }

  private boolean matchesAttribute(SupplyList.AttributeOptions options, String inventoryValue) {
    if (options == null) {
      return true;
    }
    if (hasText(options.allOf) && !nameEquivalent(options.allOf, inventoryValue)) {
      return false;
    }
    if (options.anyOf != null && !options.anyOf.isEmpty()) {
      return options.anyOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue));
    }
    return true;
  }

  private boolean matchesColorAttribute(SupplyList.ColorAttributeOptions options, String inventoryValue) {
    if (options == null) {
      return true;
    }
    if (options.allOf != null && !options.allOf.isEmpty()) {
      boolean allOfMatch = options.allOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue));
      if (!allOfMatch) {
        return false;
      }
    }
    if (options.anyOf != null && !options.anyOf.isEmpty()) {
      return options.anyOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue));
    }
    return true;
  }

  private boolean gradeEquivalent(String left, String right) {
    String leftGrade = normalizeGradeToken(left);
    String rightGrade = normalizeGradeToken(right);
    return leftGrade.equals(rightGrade)
      || "highschool".equals(leftGrade) && isHighSchoolGrade(rightGrade)
      || "highschool".equals(rightGrade) && isHighSchoolGrade(leftGrade)
      || "middleschool".equals(leftGrade) && isMiddleSchoolGrade(rightGrade)
      || "middleschool".equals(rightGrade) && isMiddleSchoolGrade(leftGrade)
      || "elementary".equals(leftGrade) && isElementaryGrade(rightGrade)
      || "elementary".equals(rightGrade) && isElementaryGrade(leftGrade);
  }

  private String normalizeToken(String value) {
    String normalized = normalizeTokenWithoutPluralFold(value);
    if (normalized.endsWith("s") && normalized.length() > 1) {
      return normalized.substring(0, normalized.length() - 1);
    }
    return normalized;
  }

  private String normalizeTokenWithoutPluralFold(String value) {
    if (value == null) {
      return "";
    }
    return value.trim().toLowerCase(Locale.US).replaceAll("[^a-z0-9]+", "");
  }

  private List<String> tokenParts(String value) {
    if (value == null) {
      return List.of();
    }
    String[] parts = value.trim().toLowerCase(Locale.US).split("[^a-z0-9]+");
    List<String> tokens = new ArrayList<>();
    for (String part : parts) {
      String normalized = normalizeToken(part);
      if (!normalized.isBlank()) {
        tokens.add(normalized);
      }
    }
    return tokens;
  }

  private String normalizeGradeToken(String value) {
    String normalized = normalizeToken(value);
    if ("kindergarten".equals(normalized)) {
      return "k";
    }
    if ("prekindergarten".equals(normalized) || "prekindergarden".equals(normalized)) {
      return "prek";
    }
    String withoutGradeWord = normalized.replace("grade", "");
    return withoutGradeWord.replaceAll("(\\d+)(st|nd|rd|th)$", "$1");
  }

  private boolean isHighSchoolGrade(String grade) {
    return "9".equals(grade) || "10".equals(grade) || "11".equals(grade) || "12".equals(grade);
  }

  private boolean isMiddleSchoolGrade(String grade) {
    return "6".equals(grade) || "7".equals(grade) || "8".equals(grade);
  }

  private boolean isElementaryGrade(String grade) {
    return "prek".equals(grade) || "k".equals(grade)
      || "1".equals(grade) || "2".equals(grade) || "3".equals(grade) || "4".equals(grade) || "5".equals(grade);
  }

  private String acronymToken(String value) {
    if (value == null) {
      return "";
    }
    String[] parts = value.trim().toLowerCase(Locale.US).split("[^a-z0-9]+");
    StringBuilder acronym = new StringBuilder();
    for (String part : parts) {
      if (!part.isBlank()) {
        acronym.append(part.charAt(0));
      }
    }
    return acronym.length() > 1 ? acronym.toString() : "";
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
