#!/usr/bin/env node
/**
 * Architecture guardrails for FutureStack PRs.
 * Fails on security/architecture violations; warns on slop patterns (v1).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

const SUPABASE_FROM_ALLOWLIST = new Set([
    'src/lib/supabase.ts',
    'src/lib/supabase.js',
    'src/views/StatusBoard.jsx',
    'src/pages/StatusBoard.jsx',
]);

// Catches supabase.from(, supabase?.from(, supabase . from(, etc.
const SUPABASE_FROM_PATTERN = /\bsupabase\s*(?:\?\.)?\s*\.?\s*from\s*\(/i;

function walkDir(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(full, files);
        } else {
            files.push(full);
        }
    }
    return files;
}

function relPath(file) {
    return path.relative(ROOT, file).replace(/\\/g, '/');
}

function gitDiff(baseRef, targetPath) {
    const refs = [baseRef, 'HEAD~1', ''];
    for (const ref of refs) {
        try {
            const cmd = ref
                ? `git diff ${ref} --unified=0 -- ${targetPath}`
                : `git diff --unified=0 -- ${targetPath}`;
            return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        } catch {
            // try next ref
        }
    }
    return '';
}

function scanFrontendSrc() {
    const srcDir = path.join(ROOT, 'src');
    const allFiles = walkDir(srcDir);

    for (const file of allFiles) {
        const basename = path.basename(file);
        if (basename === '.env' || basename.startsWith('.env.')) {
            errors.push(`${relPath(file)}: .env files must not live in src/`);
        }
    }

    const codeFiles = allFiles.filter((f) => /\.(js|jsx|ts|tsx)$/.test(f));

    for (const file of codeFiles) {
        const rel = relPath(file);
        const content = fs.readFileSync(file, 'utf8');

        if (/service_role/i.test(content)) {
            errors.push(`${rel}: references service_role in frontend source`);
        }

        if (content.includes('SUPABASE_SERVICE_ROLE')) {
            errors.push(`${rel}: SUPABASE_SERVICE_ROLE must not appear in frontend`);
        }

        if (SUPABASE_FROM_PATTERN.test(content) && !SUPABASE_FROM_ALLOWLIST.has(rel)) {
            errors.push(
                `${rel}: direct supabase.from() — use the Express API (allowed only in ${[...SUPABASE_FROM_ALLOWLIST].join(', ')})`
            );
        }
    }
}

function scanNewConsoleLogInRoutes() {
    const diff = gitDiff('origin/main', 'backend/src/routes/');
    const added = diff
        .split('\n')
        .filter((line) => line.startsWith('+') && !line.startsWith('+++'));

    for (const line of added) {
        if (line.includes('console.log')) {
            warnings.push(
                `New console.log in backend routes (use structured logging or remove before merge): ${line.trim()}`
            );
        }
    }
}

function scanNewDependencies() {
    const manifests = ['package.json', 'backend/package.json'];

    for (const manifest of manifests) {
        const full = path.join(ROOT, manifest);
        let baseContent = '';
        try {
            baseContent = execSync(`git show origin/main:${manifest}`, {
                cwd: ROOT,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        } catch {
            continue;
        }

        const current = JSON.parse(fs.readFileSync(full, 'utf8'));
        const base = JSON.parse(baseContent);
        const currentDeps = {
            ...(current.dependencies || {}),
            ...(current.devDependencies || {}),
        };
        const baseDeps = {
            ...(base.dependencies || {}),
            ...(base.devDependencies || {}),
        };

        for (const name of Object.keys(currentDeps)) {
            if (!baseDeps[name]) {
                warnings.push(
                    `${manifest}: new dependency "${name}" — add the dependencies-approval label if intentional`
                );
            }
        }
    }
}

scanFrontendSrc();
scanNewConsoleLogInRoutes();
scanNewDependencies();

console.log('Architecture check\n');

if (warnings.length) {
    console.log('Warnings:');
    warnings.forEach((w) => console.log(`  ⚠ ${w}`));
    console.log('');
}

if (errors.length) {
    console.error('Errors:');
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    console.error(`\n${errors.length} error(s) — fix before merging.`);
    process.exit(1);
}

console.log('✓ No architecture violations found.');
if (warnings.length) {
    console.log(`  (${warnings.length} warning(s) — informational in v1)`);
}
process.exit(0);
