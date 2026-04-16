# Family Module Reference

This document explains the family-related files currently in the project and describes what each method is responsible for.

The files covered here are:

1. `src/main/java/umm3601/Family/FamilyController.java`
2. `src/main/java/umm3601/Family/Family.java`
3. `src/main/java/umm3601/Family/FamilyHelpSessionSaveAllRequest.java`
4. `src/main/java/umm3601/Family/FamilyChecklistUpdateRequest.java`
5. `src/test/java/umm3601/Family/FamilyControllerSpec.java`

## `FamilyController.java`

File: `server/src/main/java/umm3601/Family/FamilyController.java`

Every method listed in this section is defined in this file.

### Purpose

`FamilyController` is the main backend controller for the family feature. It exposes API routes, talks to MongoDB, normalizes family/checklist data, manages help-session workflows, updates inventory, and returns JSON or CSV responses.

### Main responsibilities

- Register family-related API routes with Javalin
- Create, read, update, and delete family records
- Filter families by query params like guardian name, first name, last name, status, and helped state
- Start and manage a family help session
- Build checklist snapshots from students and supply lists
- Match supply-list items to inventory items
- Save checklist progress and consume inventory
- Export family data as CSV
- Provide dashboard summary statistics

### Constructor

#### `FamilyController(MongoDatabase database)`

Creates Mongo-backed collections for:

- `family`
- `supplylist`
- `inventory`

It is the setup point that wires the controller to the database.

### Public endpoint methods

#### `getFamilies(Context ctx)`

Returns all families that match the query filters.

It:

- builds a Mongo filter using direct database-safe filters
- applies additional computed filters in memory
- returns the filtered family list as JSON

#### `getFamily(Context ctx)`

Returns one family by Mongo ID from the path parameter.

It:

- reads `id` from the URL
- validates that the ID is a legal Mongo `ObjectId`
- throws `BadRequestResponse` for invalid IDs
- throws `NotFoundResponse` if no family exists
- returns the family JSON on success

#### `addNewFamily(Context ctx)`

Creates a new family from the request body.

It:

- validates the incoming JSON as a `Family`
- checks that the email exists and matches `EMAIL_REGEX`
- normalizes the family before storing it
- inserts the family into Mongo
- returns the new family ID

#### `updateFamily(Context ctx)`

Updates an existing family by ID.

It:

- validates the path ID
- loads the existing family
- validates the request body
- validates the email
- normalizes the updated family
- preserves and re-derives status/helped/checklist fields in a consistent way
- writes the updated fields back to Mongo
- returns the saved family

#### `deleteFamily(Context ctx)`

Deletes a family by ID.

It:

- validates the path ID
- attempts the delete
- throws an error if the family does not exist
- returns `200 OK` when deletion succeeds

#### `updateFamilyHelped(Context ctx)`

Alias endpoint for updating helped state.

This method simply forwards the request to `updateFamilyStatus`.

#### `updateFamilyStatus(Context ctx)`

Updates a family's `status` and `helped` values.

It accepts a `FamilyStatusUpdateRequest` and supports either:

- a boolean `helped`
- a string `status`

It then:

- validates that at least one of those fields is present
- normalizes the status
- derives `helped` from the chosen status when needed
- updates Mongo
- returns the updated family

#### `updateFamilyChecklist(Context ctx)`

Replaces or updates a family's checklist with a provided checklist payload.

It:

- validates the family ID
- loads the family
- validates that the request includes a checklist
- normalizes checklist structure and IDs
- saves the checklist to Mongo
- returns the updated family

#### `getFamilyHelpSession(Context ctx)`

Returns the family currently being helped.

If the family has no saved checklist snapshot yet, this method:

- creates a snapshot checklist
- marks the family as `being_helped`
- marks `helped` as `false`
- persists that status

Then it returns the family JSON.

#### `startFamilyHelpSession(Context ctx)`

Explicitly starts a help session for a family.

It:

- loads the family
- creates a snapshot checklist if one does not exist
- sets status to `being_helped`
- sets `helped` to `false`
- saves everything
- returns the updated family

#### `saveFamilyHelpSessionChild(Context ctx)`

Saves one checklist section, usually one student's section, during a help session.

It:

- requires an existing help-session snapshot
- validates that `sectionId` and `section` are present
- finds the corresponding saved section
- prevents re-saving a section that was already saved
- normalizes the incoming section
- commits inventory changes for selected or substituted items
- marks the section as saved
- updates family status to either `being_helped` or `helped`
- persists the changes
- returns the updated family

#### `saveFamilyHelpSessionAll(Context ctx)`

Finishes a help session by saving all remaining sections.

It:

- requires an existing help-session snapshot
- optionally accepts a checklist payload and normalizes it
- loops through every unsaved section
- commits inventory changes for each one
- marks all sections saved
- sets family status to `helped`
- sets `helped` to `true`
- persists the result
- returns the updated family

#### `getDashboardStats(Context ctx)`

Builds summary statistics for the dashboard.

It counts:

- students per school
- students per grade
- total families
- total students

The result is returned as a JSON object.

#### `exportFamiliesAsCSV(Context ctx)`

Exports all families as CSV.

It:

- loads all families
- writes a CSV header row
- writes one row per family
- counts each family's number of students
- cleans values so CSV stays valid and safe
- returns the CSV as a downloadable response

#### `cleanUpCSV(String value)`

Sanitizes one value before putting it in the CSV.

It:

- converts `null` to an empty string
- removes line breaks so a row stays on one line
- prefixes suspicious formula-like values with `'`
- escapes double quotes for CSV format

#### `addRoutes(Javalin server)`

Registers all family routes with the Javalin server.

This is the method that connects URL endpoints to controller functions.

### Private helper methods for family lookup and session flow

#### `requireFamily(String id)`

Loads a family by ID and throws a clear error if the ID is invalid or the family does not exist.

It also normalizes the family before returning it so downstream logic works with a consistent shape.

#### `ensureHelpSessionExists(Family family)`

Checks that the family has a checklist snapshot representing an active help session.

If not, it throws a `BadRequestResponse`.

#### `generateChecklistSnapshot(Family family)`

Builds a fresh help-session checklist from the family's students.

It:

- creates a new checklist object
- marks it as a snapshot
- creates one section per student
- fills each section with checklist items derived from supply lists
- normalizes the final checklist

#### `buildChecklistItemsForStudent(Family.StudentInfo student, String sectionId)`

Builds all checklist items for one student by:

- finding matching supply-list entries
- converting each supply-list item into a checklist snapshot item

#### `getSupplyListsForStudent(Family.StudentInfo student)`

Finds all supply-list rows that match a student based on:

- school
- grade
- teacher, when the supply-list entry actually specifies one

It sorts the matches before returning them.

### Private helper methods for matching inventory to supply lists

#### `buildChecklistItemSnapshot(SupplyList supplyList, String itemId)`

Creates one checklist item from one supply-list row.

It:

- assigns IDs and labels
- copies item description and supply-list ID
- picks a requested quantity
- finds the best inventory match
- sets `available`, `selected`, and `matchedInventoryId`

#### `findBestInventoryMatch(SupplyList supplyList)`

Searches all inventory items and returns the best match for a supply-list row.

It only considers inventory with quantity greater than zero, then chooses the most specific matching item.

#### `inventoryMatchesSupplyList(Inventory inventory, SupplyList supplyList)`

Checks whether one inventory record satisfies one supply-list item.

It compares:

- item name
- brand
- color
- size
- type
- material
- package size

#### `inventorySpecificityScore(Inventory inventory)`

Scores an inventory record based on how many meaningful attributes it has.

The more detailed the inventory entry is, the higher the score, which makes it more likely to be selected as the best match.

#### `matchesAttribute(SupplyList.AttributeOptions options, String inventoryValue)`

Checks standard attribute rules like:

- `allOf`
- `anyOf`

If no options are provided, the attribute is treated as a match.

#### `matchesColorAttribute(SupplyList.ColorAttributeOptions options, String inventoryValue)`

Specialized version of attribute matching for colors.

It supports color `allOf` and `anyOf` behavior.

### Private helper methods for persisting checklist progress

#### `persistFamilyChecklistAndStatus(Family family)`

Writes the family's checklist, status, and helped state back to Mongo in one combined update.

#### `findSectionById(Family.FamilyChecklist checklist, String sectionId)`

Searches the checklist sections and returns the section with the requested ID, or `null` if none exists.

#### `replaceSection(Family.FamilyChecklist checklist, Family.ChecklistSection updatedSection)`

Replaces one checklist section in-place based on matching section ID.

#### `areAllSectionsSaved(Family.FamilyChecklist checklist)`

Returns `true` only if every checklist section has `saved == true`.

#### `normalizeSectionForSave(String sectionId, Family.ChecklistSection section)`

Normalizes one incoming section before it is saved.

It:

- ensures the section has an ID
- ensures title and printable title exist
- ensures the item list exists
- fills missing item IDs
- ensures requested quantity is at least `1`
- normalizes not-picked-up reason values

#### `commitSectionInventoryChanges(Family.ChecklistSection section)`

Processes inventory side effects for a saved section.

For each item it:

- validates the item
- consumes the originally matched inventory if selected
- or finds and consumes substitute inventory if a substitute barcode was used
- records substitution metadata on the checklist item

#### `validateChecklistItemForSave(Family.ChecklistItem item)`

Validates that a checklist item is logically consistent before saving.

It rejects cases like:

- selected items that were marked unavailable
- unchecked items with neither a reason nor substitution
- invalid reason values

It also auto-fills the reason `not_available_didnt_receive` for unavailable unchecked items that have no other explanation.

#### `isValidNotPickedUpReason(String reason)`

Returns `true` only if the normalized reason is one of the allowed values:

- `available_didnt_need`
- `not_available_didnt_receive`
- `substituted`

#### `normalizeReason(String reason)`

Normalizes reason strings by:

- trimming whitespace
- lowercasing
- removing apostrophes
- converting spaces and dashes to underscores

### Private helper methods for inventory lookups and normalization

#### `findInventoryByBarcode(String barcode)`

Searches inventory by either:

- `internalBarcode`
- any `externalBarcode`

It returns the first matching inventory item or `null`.

#### `consumeInventory(String internalId, int amount)`

Subtracts inventory quantity from an item identified by `internalID`.

It throws errors if:

- the internal ID is missing
- the item cannot be found
- the quantity is too low

#### `nameEquivalent(String left, String right)`

Compares two names by normalizing them first, then checking equality.

This is used to make matching more forgiving.

#### `normalizeToken(String value)`

Normalizes text used in comparisons by:

- trimming
- lowercasing
- removing punctuation and non-alphanumeric characters
- dropping a trailing plural `s` when appropriate

#### `hasText(String value)`

Returns `true` if a string is non-null and not blank.

#### `hasValue(String value)`

Returns `true` if a string contains meaningful text and is not just `"N/A"`.

### Private helper methods for family and checklist normalization

#### `normalizeFamilyForPersistence(Family family, Family existingFamily)`

Makes sure a family object is consistent before saving.

It:

- fills missing students from the existing family when appropriate
- normalizes or derives status
- synchronizes `helped` with status
- normalizes the checklist

#### `normalizeChecklist(Family.FamilyChecklist checklist, String guardianName, List<Family.StudentInfo> students)`

Makes sure a checklist has a valid structure.

It:

- creates a checklist if one is missing
- sets a default template ID
- sets a default printable title
- creates sections from students when needed
- fills missing section IDs and titles
- fills missing item IDs
- defaults requested quantity to `1`
- normalizes item reason values

#### `normalizeStatusValue(String status)`

Normalizes and validates a family status string.

Allowed values are:

- `helped`
- `not_helped`
- `being_helped`

It throws `BadRequestResponse` for invalid values.

#### `determineStatus(Family family)`

Returns the family's normalized status.

If no explicit status exists, it derives one from the boolean `helped`.

#### `isHelpedStatus(String status)`

Returns `true` only if the normalized status is `helped`.

#### `normalizeNamePart(String namePart)`

Trims and lowercases a name fragment for searching.

#### `extractGuardianFirstName(String guardianName)`

Returns the first token from the guardian name after normalization.

Used for computed first-name filtering.

#### `extractGuardianLastName(String guardianName)`

Returns the last token from the guardian name after normalization.

Used for computed last-name filtering.

#### `studentInfoToDocuments(List<Family.StudentInfo> students)`

Converts student objects into Mongo `Document` objects for persistence.

#### `checklistToDocument(Family.FamilyChecklist checklist)`

Converts the nested checklist object into a Mongo `Document`.

This includes sections and items and is used before storing the checklist in Mongo.

### Private filtering helpers

#### `constructDatabaseFilter(Context ctx)`

Builds the initial MongoDB filter from query params that can be handled directly by the database.

Right now it mainly supports guardian-name regex filtering.

#### `applyComputedFilters(ArrayList<Family> families, Context ctx)`

Applies filters that are easier to compute in Java after the query returns, including:

- guardian first name
- guardian last name
- normalized family status
- helped boolean

## `Family.java`

File: `server/src/main/java/umm3601/Family/Family.java`

The fields and nested classes listed in this section are defined in this file.

### Purpose

`Family` is the main data model for family records stored in MongoDB and sent over the API.

It is mostly a plain data container with nested classes for students and checklist data.

### Top-level fields

#### `_id`

MongoDB object ID stored as a string.

#### `guardianName`

Full name of the family guardian.

#### `email`

Guardian contact email.

#### `address`

Family mailing or home address.

#### `timeSlot`

The appointment or pickup time slot.

#### `helped`

Boolean flag showing whether the family has completed the help process.

#### `status`

String status such as `helped`, `not_helped`, or `being_helped`.

#### `checklist`

Nested checklist data for help sessions and saved progress.

#### `students`

List of students in the family.

### Nested classes

#### `StudentInfo`

Represents one student belonging to a family.

Fields:

- `name`
- `grade`
- `school`
- `teacher`

#### `FamilyChecklist`

Represents the whole checklist for one family.

Fields:

- `templateId`
- `printableTitle`
- `snapshot`
- `sections`

#### `ChecklistSection`

Represents one section of the checklist, usually tied to one student.

Fields:

- `id`
- `title`
- `printableTitle`
- `saved`
- `items`

#### `ChecklistItem`

Represents one supply item in a checklist section.

Fields:

- `id`
- `label`
- `selected`
- `available`
- `itemDescription`
- `supplyListId`
- `matchedInventoryId`
- `requestedQuantity`
- `notPickedUpReason`
- `substituteItem`
- `substituteBarcode`
- `substituteDescription`
- `substituteInventoryId`
- `notes`

### Methods

`Family.java` does not define behavior methods. It is a model/data-holder class.

## `FamilyHelpSessionSaveAllRequest.java`

File: `server/src/main/java/umm3601/Family/FamilyHelpSessionSaveAllRequest.java`

Every method listed in this section is defined in this file.

### Purpose

This class is a request DTO used when the frontend submits the "save all sections" action for a family help session.

### Fields

#### `checklist`

Optional checklist payload to be saved before the controller processes unsaved sections.

### Methods

#### `getChecklist()`

Returns the checklist attached to the request.

#### `setChecklist(Family.FamilyChecklist checklist)`

Stores the checklist attached to the request.

## `FamilyChecklistUpdateRequest.java`

File: `server/src/main/java/umm3601/Family/FamilyChecklistUpdateRequest.java`

Every method listed in this section is defined in this file.

### Purpose

This class is a request DTO used when the frontend wants to update a family's checklist directly.

### Fields

#### `checklist`

The checklist payload sent by the client.

### Methods

#### `getChecklist()`

Returns the checklist from the request body.

#### `setChecklist(Family.FamilyChecklist checklist)`

Sets the checklist on the request object.

## `FamilyControllerSpec.java`

File: `server/src/test/java/umm3601/Family/FamilyControllerSpec.java`

Every test and helper method listed in this section is defined in this file.

### Purpose

`FamilyControllerSpec` is the unit and integration-style test suite for `FamilyController`.

It:

- seeds test data into Mongo
- mocks Javalin `Context`
- verifies route registration
- tests normal endpoint behavior
- tests validation and failure paths
- uses reflection to test many private helper methods

### Test lifecycle and helper methods

#### `setupAll()`

Creates the shared Mongo client and gets the `test` database used for the spec.

#### `teardown()`

Drops the test database and closes the Mongo client after all tests finish.

#### `setupEach()`

Resets collections before each test, inserts seed families, seed supply-list rows, seed inventory rows, and creates a fresh `FamilyController`.

#### `startHelpSessionAndGetFamily()`

Convenience helper used by tests to start a help session, capture the returned family, and clear mock invocations afterward.

#### `invokePrivate(String methodName, Class<?>[] parameterTypes, Object... args)`

Reflection helper that calls private methods on `FamilyController` so the tests can verify complex helper logic directly.

### Route and basic read tests

#### `addsRoutes()`

Verifies that the controller registers GET, POST, PATCH, and DELETE routes with Javalin.

#### `canGetAllFamilies()`

Checks that `getFamilies` returns every family when there are no filters.

#### `canGetFamilyWithString()`

Checks guardian-name string filtering.

#### `canFilterByGuardianLastName()`

Verifies computed filtering by guardian last name.

#### `canFilterByGuardianFirstName()`

Verifies computed filtering by guardian first name.

#### `canFilterFamiliesByStatus()`

Verifies filtering by normalized family status.

#### `canFilterFamiliesByHelpedBoolean()`

Verifies filtering by the boolean helped query parameter.

#### `getFamilyWithExistentId()`

Checks that fetching a valid family ID returns the expected family.

#### `getFamilyWithBadId()`

Checks that invalid Mongo IDs produce `BadRequestResponse`.

#### `getFamiliesWithNonexistentId()`

Checks that a valid but missing family ID produces `NotFoundResponse`.

### Create and update tests

#### `addNewFamily()`

Checks that a valid family can be created and stored with default normalized status.

#### `addInvalidEmail()`

Checks that invalid email format is rejected.

#### `addNullEmail()`

Checks that missing email is rejected.

#### `updateFamily()`

Checks that an existing family can be updated and returned.

#### `updateFamilyWithBadId()`

Checks update failure for an invalid ID.

#### `updateFamiliesWithNonexistentId()`

Checks update failure for a missing ID.

#### `updateFamilyStatusMarksFamilyHelped()`

Checks that a status payload of `helped` updates both status and helped fields correctly.

#### `updateFamilyHelpedSupportsBooleanPayload()`

Checks that a boolean helped payload is supported.

#### `updateFamilyStatusRejectsMissingPayload()`

Checks that status updates require either `status` or `helped`.

#### `updateFamilyChecklistPersistsChecklist()`

Checks that checklist updates are normalized and stored.

### Help-session tests

#### `startFamilyHelpSessionBuildsSnapshotChecklist()`

Checks that starting a session creates a snapshot checklist and marks the family as being helped.

#### `getFamilyHelpSessionCreatesSnapshotIfMissing()`

Checks that fetching a session lazily creates the snapshot if it does not already exist.

#### `getFamilyHelpSessionUsesExistingSnapshotWhenAlreadyStarted()`

Checks that an existing help-session snapshot is reused instead of rebuilt.

#### `startFamilyHelpSessionReusesExistingSnapshot()`

Checks that starting again does not replace an already existing snapshot.

#### `saveFamilyHelpSessionChildConsumesInventoryAndKeepsSessionOpen()`

Checks that saving one child section consumes inventory and keeps the family in progress if not all sections are saved yet.

#### `saveFamilyHelpSessionChildSupportsSubstitutionBarcode()`

Checks that a substitute barcode can be used and that substitution metadata is stored.

#### `saveFamilyHelpSessionAllSupportsProvidedChecklistPayload()`

Checks that the "save all" endpoint can accept a checklist payload and finish the session.

#### `saveFamilyHelpSessionChildRequiresExistingSnapshot()`

Checks that child saving is rejected unless a help session has started.

#### `saveFamilyHelpSessionChildRejectsUnknownSection()`

Checks that saving a non-existent section fails.

#### `saveFamilyHelpSessionChildRejectsAlreadySavedSection()`

Checks that a section cannot be saved twice.

#### `saveFamilyHelpSessionChildRejectsSelectedUnavailableItem()`

Checks that unavailable items cannot be saved as selected.

#### `saveFamilyHelpSessionChildRejectsUnknownSubstituteBarcode()`

Checks that an invalid substitute barcode fails with a not-found error.

### Delete, dashboard, and CSV tests

#### `deleteFoundFamily()`

Checks that deleting a valid family succeeds.

#### `deleteFamilyNotFound()`

Checks that deleting a missing family returns not found.

#### `deleteFamilyInvalidId()`

Checks that deleting with an invalid ID returns bad request.

#### `getDashboardStats()`

Checks that dashboard totals and grouped counts are returned.

#### `dashboardSkipsFamiliesWithNullStudents()`

Checks that families with `null` students do not break dashboard counting.

#### `exportFamiliesAsCSVProducesCorrectCSV()`

Checks that CSV export includes the right header and rows.

#### `exportFamiliesAsCSVCleansCSV()`

Checks CSV cleanup behavior including formula protection, quote escaping, and line-break cleanup.

#### `exportFamiliesAsCSVWithNoFamilies()`

Checks that CSV export still returns only the header when no families exist.

#### `cleanUpCSVHandlesNullValues()`

Checks that `cleanUpCSV` converts `null` to an empty string.

#### `exportFamiliesAsCSVHandlesNullStudents()`

Checks that CSV export treats families with `null` students as having zero students.

### Private helper coverage tests

#### `privateMatchingHelpersCoverBranchyCases()`

Checks positive matching behavior for inventory-to-supply-list comparison and specificity scoring.

#### `privateLookupAndConsumeHelpersCoverErrorBranches()`

Checks barcode lookup plus inventory-consumption failure cases.

#### `privateReasonHelpersNormalizeAndValidate()`

Checks reason normalization and allowed-value validation.

#### `privateFindInventoryByBarcodeReturnsNullWhenMissing()`

Checks that barcode lookup returns `null` when nothing matches.

#### `updateFamilyChecklistRejectsMissingChecklistPayload()`

Checks checklist update validation for missing payloads.

#### `saveFamilyHelpSessionChildRejectsMissingSectionPayload()`

Checks child-session save validation for missing section data.

#### `saveFamilyHelpSessionAllRequiresExistingSnapshot()`

Checks that "save all" requires a previously started snapshot session.

#### `privateInventoryMatchCoversNegativeBranches()`

Checks mismatch cases for item names, brand, and package size.

#### `privateAttributeHelpersCoverNullAndMismatchBranches()`

Checks null, matching, and mismatching behavior for attribute helper methods.

#### `privateValidateChecklistItemCoversAdditionalBranches()`

Checks extra validation branches such as invalid reasons and auto-defaulted unavailable reasons.

#### `privateNormalizeHelpersCoverDefaultBranches()`

Checks default normalization behavior for section IDs, item IDs, status normalization, and token normalization.

#### `privateConsumeInventoryRejectsLowQuantity()`

Checks that over-consuming inventory is rejected.

#### `privateInventorySpecificityScoreCoversFalseBranches()`

Checks that weak or placeholder inventory data does not contribute to specificity score.

#### `privateGetSupplyListsForStudentCoversTeacherMismatchAndNoMatches()`

Checks supply-list filtering when school or teacher does not match.

#### `privateBuildChecklistItemSnapshotCoversUnavailableFallbackBranch()`

Checks that an unavailable item snapshot is created correctly when no usable inventory exists.

#### `privateRequireFamilyCoversErrorBranches()`

Checks both invalid-ID and missing-family failure paths for `requireFamily`.

## Practical summary

If you want a quick way to think about these files:

- `FamilyController.java` is the behavior and API layer
- `Family.java` is the family data model
- `FamilyChecklistUpdateRequest.java` and `FamilyHelpSessionSaveAllRequest.java` are request wrappers for checklist payloads
- `FamilyControllerSpec.java` is the verification suite that proves the controller and helper logic work
