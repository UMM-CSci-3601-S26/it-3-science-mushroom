/* eslint-disable @typescript-eslint/naming-convention */
import {seedAll} from '@floogulinc/cypress-mongo-seeder';
import {MongoClient} from 'mongodb';
import {createRequire} from 'module';

const projectRequire = createRequire(`${process.cwd()}/package.json`);
const bcrypt = projectRequire('bcrypt');
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

const mongoHost = process.env.MONGO_ADDR || 'localhost';
const mongoDb = process.env.MONGO_DB || 'dev';

const mongoUri = `mongodb://${mongoHost}/${mongoDb}`;
const dbSeedDir = '../database/seed';

type TestRole = 'admin' | 'staff' | 'viewer';

const roleAccountConfig: Record<TestRole, { systemRole: 'ADMIN' | 'VOLUNTEER'; jobRole: string | null }> = {
  admin: { systemRole: 'ADMIN', jobRole: null },
  staff: { systemRole: 'VOLUNTEER', jobRole: 'volunteer_base' },
  viewer: { systemRole: 'VOLUNTEER', jobRole: 'volunteer_base' }
};

async function upsertRoleLoginUsers(env: Cypress.ObjectLike) {
  const client = await MongoClient.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  try {
    const usersCollection = client.db(mongoDb).collection('users');

    for (const role of Object.keys(roleAccountConfig) as TestRole[]) {
      const roleKey = role.toUpperCase();
      const username = env[`E2E_${roleKey}_USER`];
      const password = env[`E2E_${roleKey}_PASSWORD`];

      if (!username || !password || password === 'replace-locally') {
        continue;
      }

      const passwordHash = (await bcrypt.hash(password, 12)).replace(/^\$2[by]\$/, '$2a$');
      const { systemRole, jobRole } = roleAccountConfig[role];

      await usersCollection.updateOne(
        { username },
        {
          $set: {
            username,
            passwordHash,
            fullName: `Cypress ${role}`,
            email: `${username}@test.local`,
            systemRole,
            jobRole
          }
        },
        { upsert: true }
      );
    }
  } finally {
    await client.close();
  }
}

const pluginConfig: Cypress.PluginConfig = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `_config` is the resolved Cypress config
  on('task', {
    'seed:database': async (drop = true) => {
      await seedAll(mongoUri, dbSeedDir, drop);
      await upsertRoleLoginUsers(config.env);
      return null;
    },
    'clear:downloads': () => {
      projectRequire('fs').rmSync('cypress/downloads', { recursive: true, force: true });
      return null;
    },
  });

};

export default pluginConfig;
