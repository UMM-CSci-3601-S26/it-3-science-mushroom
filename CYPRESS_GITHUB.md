# Cypress Documentation <!-- omit in toc -->

## Why is this important?

Originally cypress could run on its own with its default configuration. However, now that we have role-based permissions and additional safeguards for our software, cypress now needs valid test credentials to access and test protected functionality while preserving application wide security model.

We want to ensure that we keep the user data safe by taking steps to prevent exploits through the tools we use.

## How is this done?

Instead of hardcoding login variables and holding that information in the database, we will be using environment variables.

There are two important locations where these must reside:

- Client Root -> `Cypress.env.json`
- Github Actions -> `Settings > Secrets and Variables > Actions`
  
> Local development uses `Cypress.env.json`, while CI/CD workflows use GitHub Actions secrets
> 
Having these files that only persist on the local machine and Github's secrets, allows us to not post credentials on the github repository itself, reducing the risk of credential exposure

> It is important that `Cypress.env.json` is in `.gitignore`

# Configuring GitHub Actions Secrets

For Github Secrets its fairly simple process.

- Step 1: Access the repository that you would like to add these secrets.
- Step 2: Click on the `settings` tab at the very top. The same area where "code", "issues", "Pull Requests", and many other options reside.
- Step 3: Once in settings, on the left hand side you will see many options, we want to look for `Secrets and Variables`. It should have a dropdown menu that you can click on.
- Step 4: Click on `Secrets and Variables` to have the menu drop down.
- Step 5: Click the option `Actions`.
- Step 6: Create new `Repository Secret`.

# Notes about adding new secrets

When adding the secrets to Github actions, you *can* make it whatever name you would like it to be, but for the purpose of Cypress, it is important that there is a `CYPRESS_` prefix.

In this case, the secrets are named as follows:

- `CYPRESS_E2E_{role}_USER` and `CYPRESS_E2E_{role}_PASSWORD`

> Replace {role} with your desired role if your adding more roles

# How to expose the secret

- For Cypress: `Cypress.env('E2E_{role}_USER')` and `Cypress.env('E2E_{Role}_PASSWORD')`
- For normal use: `process.env.CYPRESS_E2E_{role}_USER` and
`process.env.CYPRESS_E2E_{Role}_USER`

> Replace {role} with your desired role

# How the secrets are processed

How the credentials flow through the application:

### 1. GitHub Repository Secret:
```text
Name: CYPRESS_E2E_ADMIN_USER
Value: AdminUser@Example.com

Name: CYPRESS_E2E_ADMIN_PASSWORD
Value: <example-password>
```
### 2. GitHub Actions:

The Secret is exposed as an environment variable 
during the workflow run
``` yaml
env:
  CYPRESS_E2E_ADMIN_USER: ${{ secrets.CYPRESS_E2E_ADMIN_USER }}
  CYPRESS_E2E_ADMIN_PASSWORD: ${{ secrets.CYPRESS_E2E_ADMIN_PASSWORD }}
```
### 3. Cypress Environment Variable

Since the environment variable has the prefix `CYPRESS_`, cypress automatically exposes it with `Cypress.env()`

```ts
const username = Cypress.env('E2E_ADMIN_USER');
const password = Cypress.env('E2E_ADMIN_PASSWORD');
```
> Notice how there is no `CYPRESS_`.
> Cypress will strip the prefix from the variable. 

Result:

```ts
const username = 'AdminUser@Example.com'
const password = '<example-password>'
```

### 4. Test usage
```ts
  cy.login(
    Cypress.env('E2E_ADMIN_USER'),
    Cypress.env('E2E_ADMIN_PASSWORD')
  )
```

> There are more examples for usage [here](client/cypress/e2e/role-login-example.cy.ts)

## Local Development Example

Create a `Cypress.env.json` file in the client root:

```json
{
  "E2E_ADMIN_USER: "AdminUser@Example.com""
  "E2E_ADMIN_PASSWORD: "<example-password>""
}
```
> Do not commit this file. Ensure that its listed in `gitignore`.
