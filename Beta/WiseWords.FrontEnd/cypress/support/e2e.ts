// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

import 'cyclope'; // Import the main cyclope module for type definitions and commands
import { savePageIfTestFailed } from 'cyclope';

// This hook will run after each test
afterEach(() => {
    // By default, it saves the page only in non-interactive (cypress run) mode.
    // You can add { saveInteractive: true } if you want it to save in cypress open mode too,
    // but it's usually less critical there as you can inspect the DOM live.
    savePageIfTestFailed();
  });
