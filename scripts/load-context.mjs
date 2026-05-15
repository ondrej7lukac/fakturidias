#!/usr/bin/env node
/**
 * Load and validate PRODUCT.md and DESIGN.md context for impeccable
 *
 * Usage: node scripts/load-context.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadContext() {
  const contextDir = projectRoot;
  const productPath = path.join(contextDir, 'PRODUCT.md');
  const designPath = path.join(contextDir, 'DESIGN.md');

  const result = {
    status: 'success',
    contextDir,
    files: {
      product: {
        path: productPath,
        exists: fs.existsSync(productPath),
        size: fs.existsSync(productPath) ? fs.statSync(productPath).size : 0,
      },
      design: {
        path: designPath,
        exists: fs.existsSync(designPath),
        size: fs.existsSync(designPath) ? fs.statSync(designPath).size : 0,
      },
    },
  };

  // Validate PRODUCT.md
  if (!result.files.product.exists) {
    result.status = 'error';
    result.error = 'PRODUCT.md not found at: ' + productPath;
  } else if (result.files.product.size < 200) {
    result.status = 'warning';
    result.warning =
      'PRODUCT.md is too small (< 200 bytes). May be placeholder.';
  }

  // Validate DESIGN.md
  if (!result.files.design.exists) {
    result.warning =
      (result.warning || '') + ' DESIGN.md not found at: ' + designPath;
    if (result.status === 'success') result.status = 'warning';
  }

  // Content validation
  if (result.files.product.exists) {
    const content = fs.readFileSync(productPath, 'utf-8');
    result.files.product.hasTodo = content.includes('[TODO]');
    result.files.product.lines = content.split('\n').length;
    result.files.product.hasRegister = content.includes('Register');
    result.files.product.hasUsers = content.includes('Users');
  }

  if (result.files.design.exists) {
    const content = fs.readFileSync(designPath, 'utf-8');
    result.files.design.hasTodo = content.includes('[TODO]');
    result.files.design.lines = content.split('\n').length;
    result.files.design.hasColors = content.includes('Color');
    result.files.design.hasTypography = content.includes('Typogra');
  }

  return result;
}

// Run validation
const context = loadContext();

// Pretty print result
console.log(JSON.stringify(context, null, 2));

// Exit with appropriate code
if (context.status === 'error') {
  process.exit(1);
} else if (context.status === 'warning') {
  process.exit(0); // Still succeeds, but with warning
}
