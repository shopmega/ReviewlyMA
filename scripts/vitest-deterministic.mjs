#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const DEFAULT_CHUNK_COUNT = 4;
const MODE = process.argv[2] ?? 'all';

function toInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
      TZ: process.env.TZ ?? 'UTC',
      ...extraEnv,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function collectTestFiles() {
  const result = spawnSync(
    'npx',
    ['vitest', 'list', '--filesOnly', '--json', '--config', 'vitest.config.ts'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      encoding: 'utf8',
      env: {
        ...process.env,
        CI: process.env.CI ?? '1',
        TZ: process.env.TZ ?? 'UTC',
      },
    }
  );

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    process.stderr.write(result.stderr ?? '');
    process.exit(result.status ?? 1);
  }

  const payload = JSON.parse(result.stdout || '[]');

  return payload
    .map((entry) => {
      const absolute = entry?.file;
      if (typeof absolute !== 'string') return null;
      return path.relative(process.cwd(), absolute).split(path.sep).join('/');
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function getChunk(files, chunkIndex, chunkCount) {
  if (chunkCount <= 0) {
    throw new Error(`chunk count must be > 0 (received ${chunkCount})`);
  }

  if (chunkIndex <= 0 || chunkIndex > chunkCount) {
    throw new Error(
      `chunk index must be between 1 and ${chunkCount} (received ${chunkIndex})`
    );
  }

  const chunkSize = Math.ceil(files.length / chunkCount);
  const start = (chunkIndex - 1) * chunkSize;
  const end = Math.min(start + chunkSize, files.length);
  return files.slice(start, end);
}

function runChunk(chunkIndex, chunkCount) {
  const files = collectTestFiles();
  const selectedFiles = getChunk(files, chunkIndex, chunkCount);

  if (selectedFiles.length === 0) {
    process.stdout.write(
      `No test files for chunk ${chunkIndex}/${chunkCount}. Skipping.\n`
    );
    return 0;
  }

  process.stdout.write(
    `Running deterministic vitest chunk ${chunkIndex}/${chunkCount} (${selectedFiles.length} files)\n`
  );

  const args = [
    'vitest',
    'run',
    '--config',
    'vitest.config.ts',
    '--no-file-parallelism',
    '--sequence.concurrent=false',
    '--sequence.shuffle=false',
    '--cache=false',
    '--no-color',
    ...selectedFiles,
  ];

  return run('npx', args);
}

function runAllChunks(chunkCount) {
  for (let chunkIndex = 1; chunkIndex <= chunkCount; chunkIndex += 1) {
    const status = runChunk(chunkIndex, chunkCount);
    if (status !== 0) {
      return status;
    }
  }
  return 0;
}

const chunkCount = toInt(process.env.VITEST_CHUNK_COUNT, DEFAULT_CHUNK_COUNT);
const chunkIndex = toInt(process.env.VITEST_CHUNK_INDEX, 1);

const exitCode =
  MODE === 'chunk' ? runChunk(chunkIndex, chunkCount) : runAllChunks(chunkCount);

process.exit(exitCode);
