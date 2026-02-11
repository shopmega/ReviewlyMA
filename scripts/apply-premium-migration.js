#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the SQL migration file
const migrationFile = path.join(__dirname, '..', 'supabase', 'add-premium-pricing-settings.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log('Premium pricing migration SQL:');
console.log(sql);
console.log('\nTo apply this migration manually:');
console.log('1. Connect to your Supabase database');
console.log('2. Execute the above SQL commands');
console.log('3. The migration adds premium pricing fields to the site_settings table');