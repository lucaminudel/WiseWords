import { defineConfig } from 'cypress'
import cyclopePlugin from 'cyclope/plugin';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      // This line registers the Cyclope plugin
      cyclopePlugin(on, config);

      // This event listener will run the cleanup code once before the entire test run starts.
      on('before:run', () => {
        // Path to the 'failed' folder relative to the project root
        const failedFolderPath = path.join(config.projectRoot, 'cypress', 'failed');

        if (fs.existsSync(failedFolderPath)) {
          // Use fs.rmSync() to delete the folder recursively and forcefully
          fs.rmSync(failedFolderPath, { recursive: true, force: true });
        }
      });

      // IMPORTANT: Return the config object
      // with any changed environment variables or other configurations
      return config;      
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig: {
        configFile: './vite.config.ts'
      }
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },
})