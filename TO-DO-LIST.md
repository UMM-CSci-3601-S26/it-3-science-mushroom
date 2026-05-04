
# To-Do List

- [To-Do List](#to-do-list)
  - [Known Issues](#known-issues)
  - [Areas to Improve](#areas-to-improve)

## Known Issues

- Families
  - When on the second page of the families paginator, searching for a family will leave you with a blank page. You stay on the second page of the paginator instead of refreshing back to the first automatically.
  - When filtering families by link status, the card layout changes from when there were no filters.
  - The edit family button is placed in the top left of each family card instead of the top right.
  - The toggle button exists on the Families page with volunteer permissions when it should disappear entirely so that no information can be exported or added.

- Dialog
  - Family and Point of Sale pages use a browser dialog to confirm deletion rather than the angular dialog system that is used in Inventory Management and Stock Report.

- Point of Sale
  - Point of Sale page visual accents such as filter borders, search bars, checkboxes, and substitute buttons don't appear in dark mode. Dark mode support is needed.

- Inventory Management
  - Inventory Management settings for deleting and resetting the quantities of items don't work on a deployed droplet. This applies to both the filtered and non-filtered item settings. (API Routes are blocked)

- PDF Generation
  - Family PDF boxes don't properly fit long strings such as in the Accommodations box or the Students per School box.
  - The timeslot field on the family pdf doesn't update until the Families page is refreshed.
  - Stock reports use the wrong time format in its naming scheme: currently uses HH:MM instead of HH-MM.

- Authorization
  - Requesting to delete a family results in one to three delete requests every time you open the site after being in a different tab.

## Areas to Improve

- Testing
  - Cypress testing for Point of Sale and Settings pages.
  - Improved test coverage (~100%) for both front-end and back-end.

- Visual Elements
  - Global dark mode support.
  - Homepage with relevant information to users based on their role.

- Filters
  - Global filter debounce to reduce server traffic.
  - Stock Report filters (stock state and general inventory).

- Families
  - Ability to link guardian accounts to manually added families
  - Adjust family scheduling to be for individual time slots of a certain length within the time availability options.

- Misc Improvements
  - Checklist view and/or download page separate from the Point of Sale page.
  - Link Supply list and inventory so that only items from supply lists can be added to the inventory.
  - Password recovery for all users.
