# Ready4Learning Interface

[![Server Build Status](../../actions/workflows/server.yml/badge.svg)](../../actions/workflows/server.yml)
[![Client Build Status](../../actions/workflows/client.yaml/badge.svg)](../../actions/workflows/client.yaml)
[![End to End Build Status](../../actions/workflows/e2e.yaml/badge.svg)](../../actions/workflows/e2e.yaml)

## Table of Contents

- [Ready4Learning Interface](#ready4learning-interface)
  - [Table of Contents](#table-of-contents)
  - [Project Description](#project-description)
  - [Project Features](#project-features)
  - [Technical Documents](#technical-documents)
    - [Deployment Document](#deployment-document)
    - [Development Document](#development-document)
    - [Family Module Document](#family-module-document)
    - [Authorization Document](#authorization-document)
  - [To-Do List](#to-do-list)
  - [Customer Pamphlet](#customer-pamphlet)
  - [Contributors](#contributors)

## Project Description
The Ready4Learning interface is a system designed to improve the ease of management and quality of life for the staff, volunteers, and family participating in the drive hosted by the Office of Community Engagement (OoCE) here at the University of Minnesota Morris.

## Project Features
- Users and Login
  - A login system ensures only the individuals with proper access can utilize parts of the interface.
  - Families can log in and edit their information at any time, such as changing availability or adding a student. Families are also able to see information pertaining to them posted by staff.
  - Staff are able to choose exactly who can see and do what, giving near complete control over how users of the interface interact with the system.
  - Requests for deletion of families is also tracked, allowing staff to restore or permanently delete families.
  - Staff can also see specific users, and change their roles/delete them at any time.
  - Permissions for individual roles can also be adjusted at any point, as well as the addition or removal of roles.
- Inventory Management
  - The inventory management system allows users of the system to track the status of items, edit them at will, and link existing items to those stored in the database.
  - The barcode scanning system allows for one or more pre-existing barcodes to be linked to a single item stored in the database. The system also has the capability to generate custom barcodes for items.
  - Item adding/editing/removal can be done by manually entering its barcode, or by using a device's camera or an external handheld scanner to automatically input the barcode.
  - The Stock Reports page will automatically organize items based on their Stock State, allowing for a quick and easy view of what items are at what stock level. The reports can also be stored and/or exported as a PDF or XLSX file.
  - The main inventory page also includes filters, item counts, and changing of the level of detail of displayed items.
- Supply List
  - The Supply List page holds the required items for each teacher of each grade of each school supported by the drive.
  - Filters allow for showing specific items, such as showing only items for Kindergarten students.
  - Each item can be modified/deleted, and new items for specific teachers/grades/schools can be added.
- Families
  - Staff are able to see at a glance specific numbers of students and families for each grade and school.
  - The page also allows for manual adding/editing/deleting of individual families
  - Each individual family displays contact info, students in that family, time slot, available times, and email.
  - Filters allow for sorting by guardian name, or by whether a family was added manually or was added by a family and thus linked to a specific email.
- Point of Sale
  - The Point of Sale system allows volunteers to easily assist individual families during drive day.
  - Families can be searched by family name or status (helped, in progress, or not helped)
  - When helping a family, volunteers/staff are able to see time slot, address, and the information for each student in that family.
  - The system will show how much of a specific item is currently in the inventory, and how much will be removed by this family.
  - Items can also be subsituted for others, or simply not given at all. Substituted items are selected by barcode scanning, in the same way the inventory system handles it.
  - Sessions can also be reset at any point, should the need arise.
- Settings
  - Various settings allow for control of time availability, available schools, announcements sent to families, slots per time slot, automatic family scheduling, mass inventory item management, adjusting barcode printing settings, and finally order of the stations during drive day.
  - Settings can only be adjusted/interacted with by staff, preventing tampering by unknown individuals.

## Technical Documents

These documents explain different aspects of the application.

### [Deployment Document](DEPLOYMENT.md)

A document that explains how to set-up and manage a DigitalOcean Droplet of the application. This is the main technical document.

### [Development Document](DEVELOPMENT.md)

A document that describes the development set-up process.

### [Family Module Document](server/FAMILY_MODULE_REFERENCE.md)

A document that describes the family system.

### [Authorization Document](AUTHORIZATION_CHANGES.md)

A document that describes the authorization system.

## [To-Do List](TO-DO-LIST.md)

List of known issues and areas for improvements.

## [Customer Pamphlet](R4LPamphlet.pdf)

## Contributors

The contributors to this project can be seen [here](../../graphs/contributors).

Special thanks to these individuals for laying the groundwork for this project.

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://floogulinc.com/"><img src="https://avatars.githubusercontent.com/u/1300395?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Paul Friederichsen</b></sub></a><br /><a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=floogulinc" title="Code">💻</a> <a href="#content-floogulinc" title="Content">🖋</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=floogulinc" title="Documentation">📖</a> <a href="#ideas-floogulinc" title="Ideas, Planning, & Feedback">🤔</a> <a href="#mentoring-floogulinc" title="Mentoring">🧑‍🏫</a> <a href="#question-floogulinc" title="Answering Questions">💬</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/pulls?q=is%3Apr+reviewed-by%3Afloogulinc" title="Reviewed Pull Requests">👀</a> <a href="#security-floogulinc" title="Security">🛡️</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=floogulinc" title="Tests">⚠️</a> <a href="#a11y-floogulinc" title="Accessibility">️️️️♿️</a> <a href="#infra-floogulinc" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-floogulinc" title="Maintenance">🚧</a></td>
    <td align="center"><a href="https://github.com/helloworld12321"><img src="https://avatars.githubusercontent.com/u/56209343?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Joe Moonan Walbran</b></sub></a><br /><a href="https://github.com/UMM-CSci-3601/3601-iteration-template/issues?q=author%3Ahelloworld12321" title="Bug reports">🐛</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=helloworld12321" title="Code">💻</a> <a href="#content-helloworld12321" title="Content">🖋</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=helloworld12321" title="Documentation">📖</a> <a href="#ideas-helloworld12321" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-helloworld12321" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-helloworld12321" title="Maintenance">🚧</a> <a href="#mentoring-helloworld12321" title="Mentoring">🧑‍🏫</a> <a href="#projectManagement-helloworld12321" title="Project Management">📆</a> <a href="#question-helloworld12321" title="Answering Questions">💬</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/pulls?q=is%3Apr+reviewed-by%3Ahelloworld12321" title="Reviewed Pull Requests">👀</a> <a href="#tool-helloworld12321" title="Tools">🔧</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=helloworld12321" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/kklamberty"><img src="https://avatars.githubusercontent.com/u/2751987?v=4?s=100" width="100px;" alt=""/><br /><sub><b>K.K. Lamberty</b></sub></a><br /><a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=kklamberty" title="Code">💻</a> <a href="#content-kklamberty" title="Content">🖋</a> <a href="#design-kklamberty" title="Design">🎨</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=kklamberty" title="Documentation">📖</a> <a href="#ideas-kklamberty" title="Ideas, Planning, & Feedback">🤔</a> <a href="#mentoring-kklamberty" title="Mentoring">🧑‍🏫</a> <a href="#projectManagement-kklamberty" title="Project Management">📆</a> <a href="#question-kklamberty" title="Answering Questions">💬</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=kklamberty" title="Tests">⚠️</a> <a href="#tutorial-kklamberty" title="Tutorials">✅</a> <a href="#a11y-kklamberty" title="Accessibility">️️️️♿️</a></td>
    <td align="center"><a href="http://www.morris.umn.edu/~mcphee"><img src="https://avatars.githubusercontent.com/u/302297?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Nic McPhee</b></sub></a><br /><a href="#infra-NicMcPhee" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=NicMcPhee" title="Tests">⚠️</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/issues?q=author%3ANicMcPhee" title="Bug reports">🐛</a> <a href="#content-NicMcPhee" title="Content">🖋</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=NicMcPhee" title="Documentation">📖</a> <a href="#design-NicMcPhee" title="Design">🎨</a> <a href="#maintenance-NicMcPhee" title="Maintenance">🚧</a> <a href="#projectManagement-NicMcPhee" title="Project Management">📆</a> <a href="#question-NicMcPhee" title="Answering Questions">💬</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/pulls?q=is%3Apr+reviewed-by%3ANicMcPhee" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/UMM-CSci-3601/3601-iteration-template/commits?author=NicMcPhee" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
