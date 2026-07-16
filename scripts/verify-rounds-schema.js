#!/usr/bin/env node
/**
 * Verify opportunity_rounds migration (PR1).
 * Usage: node scripts/verify-rounds-schema.js
 * Requires backend/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const REQUIRED_ROUND_COLUMNS = [
    'id',
    'opportunity_id',
    'user_id',
    'round_number',
    'round_type',
    'scheduled_date',
    'scheduled_time',
    'result',
    'notes',
    'created_at',
    'updated_at',
];

const REQUIRED_OPPORTUNITY_COLUMNS = ['current_round_number', 'rejected_round_number', 'applied_on'];

async function verifyTableReadable(table) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
        throw new Error(`${table}: ${error.message} (${error.code || 'unknown'})`);
    }
    console.log(`OK  Table "${table}" exists and is readable`);
}

async function verifyColumns(table, columns) {
    const { data, error } = await supabase.from(table).select(columns.join(',')).limit(1);
    if (error) {
        throw new Error(`${table} columns [${columns.join(', ')}]: ${error.message}`);
    }
    console.log(`OK  ${table} columns: ${columns.join(', ')}`);
    return data;
}

async function main() {
    console.log('Verifying interview rounds schema without writing data...\n');

    await verifyTableReadable('opportunity_rounds');
    await verifyColumns('opportunity_rounds', REQUIRED_ROUND_COLUMNS);
    await verifyColumns('opportunities', REQUIRED_OPPORTUNITY_COLUMNS);

    console.log('\nAll read-only rounds schema checks passed.');
}

main().catch((err) => {
    console.error('\nFAIL:', err.message);
    process.exit(1);
});
