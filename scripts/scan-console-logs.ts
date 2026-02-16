#!/usr/bin/env tsx
/**
 * Console Log Cleanup Script
 * Finds all console.log and console.error statements in production code
 * and provides a report with file locations and recommended replacements
 */

import * as fs from 'fs';
import * as path from 'path';

interface ConsoleStatement {
    file: string;
    line: number;
    type: 'log' | 'error' | 'warn' | 'info';
    content: string;
    context: string; // surrounding code
}

const EXCLUDED_DIRS = [
    'node_modules',
    '.next',
    '.git',
    'scripts', // Scripts are allowed to have console logs
    '__tests__',
    'tests',
    'test',
    '.agent',
];

const EXCLUDED_FILES = [
    'logger.ts', // Logger can use console internally
    'rsc-error-handler.ts', // Error handler wraps console
];

const consoleStatements: ConsoleStatement[] = [];

function shouldProcess(filePath: string): boolean {
    // Only process .ts and .tsx files
    if (!/\.(ts|tsx)$/.test(filePath)) return false;

    // Skip excluded directories
    for (const dir of EXCLUDED_DIRS) {
        if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) {
            return false;
        }
    }

    // Skip excluded files
    const fileName = path.basename(filePath);
    if (EXCLUDED_FILES.includes(fileName)) {
        return false;
    }

    return true;
}

function extractContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    return lines.slice(start, end).join('\n');
}

function scanFile(filePath: string) {
    if (!shouldProcess(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Match console statements
        const consoleMatch = trimmed.match(/console\.(log|error|warn|info)\s*\(/);

        if (consoleMatch) {
            const type = consoleMatch[1] as 'log' | 'error' | 'warn' | 'info';

            consoleStatements.push({
                file: filePath,
                line: index + 1,
                type,
                content: trimmed,
                context: extractContext(lines, index),
            });
        }
    });
}

function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip excluded directories
            if (EXCLUDED_DIRS.includes(entry.name)) continue;
            scanDirectory(fullPath);
        } else if (entry.isFile()) {
            scanFile(fullPath);
        }
    }
}

function generateReport() {
    console.log('==========================================');
    console.log('🧹 CONSOLE STATEMENT CLEANUP REPORT');
    console.log('==========================================\n');

    const byType = {
        log: consoleStatements.filter(s => s.type === 'log'),
        error: consoleStatements.filter(s => s.type === 'error'),
        warn: consoleStatements.filter(s => s.type === 'warn'),
        info: consoleStatements.filter(s => s.type === 'info'),
    };

    console.log('📊 Summary:');
    console.log(`  console.log:   ${byType.log.length} instances`);
    console.log(`  console.error: ${byType.error.length} instances`);
    console.log(`  console.warn:  ${byType.warn.length} instances`);
    console.log(`  console.info:  ${byType.info.length} instances`);
    console.log(`  TOTAL:         ${consoleStatements.length} instances\n`);

    // Group by file
    const byFile = new Map<string, ConsoleStatement[]>();
    consoleStatements.forEach(stmt => {
        if (!byFile.has(stmt.file)) {
            byFile.set(stmt.file, []);
        }
        byFile.get(stmt.file)!.push(stmt);
    });

    // Sort files by count (most console statements first)
    const sortedFiles = Array.from(byFile.entries())
        .sort((a, b) => b[1].length - a[1].length);

    console.log('📁 Files with most console statements:\n');
    sortedFiles.slice(0, 10).forEach(([file, statements], index) => {
        const relativePath = file.replace(process.cwd(), '.');
        console.log(`${index + 1}. ${relativePath} (${statements.length} instances)`);
        statements.forEach(stmt => {
            console.log(`   Line ${stmt.line}: console.${stmt.type}()`);
        });
        console.log('');
    });

    console.log('\n==========================================');
    console.log('🔧 RECOMMENDED FIXES');
    console.log('==========================================\n');

    console.log('For console.log statements:');
    console.log('  - Remove if debugging code');
    console.log('  - Use logger.info() for important events');
    console.log('  - Wrap with if (process.env.NODE_ENV === "development") for dev-only logs\n');

    console.log('For console.error statements:');
    console.log('  - Replace with logger.error() for proper structured logging');
    console.log('  - Include error context (error.message, error.stack, etc.)\n');

    console.log('Example replacements:');
    console.log('  // Before');
    console.log('  console.log("User logged in:", userId);');
    console.log('');
    console.log('  // After');
    console.log('  import { logger } from "@/lib/logger";');
    console.log('  logger.info("User logged in", { userId });\n');

    console.log('  // Before');
    console.log('  console.error("Database error:", error);');
    console.log('');
    console.log('  // After');
    console.log('  logger.error("Database error", {');
    console.log('    error: error.message,');
    console.log('    stack: error.stack,');
    console.log('    code: error.code');
    console.log('  });\n');

    console.log('==========================================');
    console.log('📋 PRIORITY CLEANUP ORDER');
    console.log('==========================================\n');

    sortedFiles.slice(0, 5).forEach(([file, statements], index) => {
        const relativePath = file.replace(process.cwd(), '.');
        const priority = index < 3 ? 'HIGH' : 'MEDIUM';
        console.log(`${index + 1}. [${priority}] ${relativePath}`);
        console.log(`   Lines to clean: ${statements.map(s => s.line).join(', ')}`);
        console.log('');
    });

    console.log('\nTotal files to clean:', byFile.size);
    console.log('Total statements to clean:', consoleStatements.length);
    console.log('\nEstimated time: 3-4 hours\n');
}

function exportToJson() {
    const outputPath = path.join(process.cwd(), 'console-cleanup-report.json');

    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: consoleStatements.length,
            byType: {
                log: consoleStatements.filter(s => s.type === 'log').length,
                error: consoleStatements.filter(s => s.type === 'error').length,
                warn: consoleStatements.filter(s => s.type === 'warn').length,
                info: consoleStatements.filter(s => s.type === 'info').length,
            },
        },
        statements: consoleStatements.map(stmt => ({
            ...stmt,
            file: stmt.file.replace(process.cwd(), '.'),
        })),
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report exported to: ${outputPath}`);
}

// Main execution
try {
    const srcDir = path.join(process.cwd(), 'src');

    console.log('🔍 Scanning src directory for console statements...\n');
    scanDirectory(srcDir);

    generateReport();
    exportToJson();

    console.log('\n✅ Scan complete!\n');
} catch (error) {
    console.error('❌ Error during scan:', error);
    process.exit(1);
}
