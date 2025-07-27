import { defineConfig } from 'cypress'
import cyclopePlugin from 'cyclope/plugin';


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