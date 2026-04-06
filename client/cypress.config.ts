// import { defineConfig } from 'cypress';

// export default defineConfig({
//   e2e: {
//     setupNodeEvents: (on, config) => {
//       // eslint-disable-next-line @typescript-eslint/no-require-imports
//       require('./cypress/plugins/index.ts').default(on, config);
//     },
//   },
// });

import { defineConfig } from 'cypress';
import setupPlugins from './cypress/plugins/index';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    setupNodeEvents(on, config) {
      setupPlugins(on, config);
    },
    trashAssetsBeforeRuns: true,
  },
});
