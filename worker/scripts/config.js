#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// ========== 1. 更新 wrangler.jsonc ==========
const envVars = {
    D1_DATABASE_ID: process.env.D1_DATABASE_ID,
    MAX_FILE_SIZE_BYTES: process.env.MAX_FILE_SIZE_BYTES,
    ADMIN: process.env.ADMIN,
};

const wranglerConfigPath = join(__dirname, '..', 'wrangler.jsonc');

const wranglerContent = readFileSync(wranglerConfigPath, 'utf-8');
const wranglerConfig = JSON.parse(wranglerContent);

if (wranglerConfig.vars) {
    ['D1_DATABASE_ID', 'MAX_FILE_SIZE_BYTES', 'ADMIN']
        .forEach(key => {
            if (envVars[key]) wranglerConfig.vars[key] = envVars[key];
        });
}

if (wranglerConfig.d1_databases?.[0]?.database_id && envVars.D1_DATABASE_ID) {
    wranglerConfig.d1_databases[0].database_id = envVars.D1_DATABASE_ID;
}

if (wranglerConfig.vars?.MAX_FILE_SIZE_BYTES && envVars.MAX_FILE_SIZE_BYTES) {
    wranglerConfig.vars.MAX_FILE_SIZE_BYTES = envVars.MAX_FILE_SIZE_BYTES;
}

if (wranglerConfig.vars?.ADMIN && envVars.ADMIN) {
    wranglerConfig.vars.ADMIN = envVars.ADMIN;
}

writeFileSync(wranglerConfigPath, JSON.stringify(wranglerConfig, null, '\t'), 'utf-8');
console.log('✓ 更新 wrangler.jsonc');

// ========== 2. 注入构建信息到 config/index.ts ==========
const appConfigPath = join(__dirname, '../src/config/index.ts');

// 获取构建时间
const buildTime = new Date().toISOString();

// 获取 commit ID
let commitId = 'unknown';
try {
    commitId = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch (e) {
    console.warn('⚠ 无法获取 git commit ID');
}

// 获取 GitHub 仓库地址
let githubRepo = 'unknown';
try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    githubRepo = remoteUrl
        .replace(/^git@github\.com:/, 'https://github.com/')
        .replace(/\.git$/, '');
} catch (e) {
    console.warn('⚠ 无法获取 GitHub 仓库地址');
}

// 读取并更新 config/index.ts
let appConfigContent = readFileSync(appConfigPath, 'utf-8');
appConfigContent = appConfigContent
    .replace(/BUILD_TIME: ["'].*["']/, `BUILD_TIME: "${buildTime}"`)
    .replace(/COMMIT_ID: ["'].*["']/, `COMMIT_ID: "${commitId}"`)
    .replace(/GITHUB_REPO: ["'].*["']/, `GITHUB_REPO: "${githubRepo}"`);


writeFileSync(appConfigPath, appConfigContent, 'utf-8');
console.log('✓ 注入构建信息到 config/index.ts');
