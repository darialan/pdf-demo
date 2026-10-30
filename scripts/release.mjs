#!/usr/bin/env node
/**
 * 一键自动化发布脚本 (NPM One-Click Release Script)
 * 用法:
 *   npm run release          # 默认自增补丁版本 (1.0.0 -> 1.0.1) 并发布
 *   npm run release:minor    # 自增次版本 (1.0.0 -> 1.1.0) 并发布
 *   npm run release:major    # 自增主版本 (1.0.0 -> 2.0.0) 并发布
 *   node scripts/release.mjs 1.0.2  # 指定具体版本号并发布
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function step(title) {
  console.log(`\n${colors.bold}${colors.cyan}==>${colors.reset} ${colors.bold}${title}${colors.reset}`);
}

function success(msg) {
  console.log(`${colors.green}✔ ${msg}${colors.reset}`);
}

function warn(msg) {
  console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
}

function fail(msg) {
  console.error(`\n${colors.bold}${colors.red}✖ 错误: ${msg}${colors.reset}\n`);
  process.exit(1);
}

function run(cmd, opts = {}) {
  console.log(`${colors.dim}$ ${cmd}${colors.reset}`);
  return execSync(cmd, { cwd: rootDir, stdio: 'inherit', ...opts });
}

function runCapture(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

async function main() {
  console.log(`${colors.bold}${colors.magenta}`);
  console.log('╔═════════════════════════════════════════════════════════╗');
  console.log('║       WebPDF Printer (@darialan/web-pdf-printer)        ║');
  console.log('║               一键快速发布到 NPM 官方源                 ║');
  console.log('╚═════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // 1. 读取当前 package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;
  const pkgName = pkg.name;

  console.log(`包名: ${colors.bold}${pkgName}${colors.reset}`);
  console.log(`当前版本: ${colors.bold}${colors.yellow}v${currentVersion}${colors.reset}`);

  // 2. 检查 Git 仓库状态
  step('1. 检查 Git 工作区状态');
  const gitStatus = runCapture('git status --porcelain');
  if (gitStatus && gitStatus.length > 0) {
    warn('检测到本地有未提交的改动：');
    console.log(colors.dim + gitStatus + colors.reset);
    fail('为了保证发布版本追溯性，请先将代码提交（git commit）后再执行发版！');
  }
  success('Git 工作区干净整洁');

  // 3. 检查 NPM Registry 源
  step('2. 检查 NPM Registry 源配置');
  const currentRegistry = runCapture('npm config get registry');
  const officialRegistry = 'https://registry.npmjs.org/';
  if (!currentRegistry || !currentRegistry.includes('registry.npmjs.org')) {
    warn(`当前 npm 源为镜像源: ${currentRegistry}`);
    console.log(`正在自动临时切换到官方发布源: ${officialRegistry}...`);
    run(`npm config set registry ${officialRegistry}`);
  }
  success(`已就绪官方源: ${officialRegistry}`);

  // 4. 检查 NPM 登录态
  step('3. 检查 NPM 登录身份');
  const whoami = runCapture('npm whoami');
  if (!whoami) {
    fail(
      '当前未登录 NPM 官方账号！\n' +
      '请在终端运行：\n' +
      '  npm login\n' +
      '完成登录验证后，重新执行当前发布命令即可。'
    );
  }
  success(`当前登录用户: ${colors.bold}${whoami}${colors.reset}`);

  // 5. 决定要发布的版本号
  step('4. 计算目标版本号');
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--dry');
  const filteredArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const rawArg = filteredArgs[0] || 'patch';
  const validTypes = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];
  let bumpTypeOrVersion = rawArg;

  if (isDryRun) {
    warn('【DRY-RUN 演练模式】本次仅进行模拟测试与打包演练，不会修改代码版本号、不会推送 Git，亦不会真正发布到 NPM。');
  }

  // 预演版本号
  let nextVersion = '';
  if (validTypes.includes(rawArg)) {
    // 解析当前语义版本
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    if (rawArg === 'patch') nextVersion = `${major}.${minor}.${patch + 1}`;
    else if (rawArg === 'minor') nextVersion = `${major}.${minor + 1}.0`;
    else if (rawArg === 'major') nextVersion = `${major + 1}.0.0`;
  } else {
    nextVersion = rawArg.replace(/^v/, '');
  }

  console.log(`发版策略: ${colors.cyan}${rawArg}${colors.reset}`);
  console.log(`版本变更: ${colors.yellow}v${currentVersion}${colors.reset} -> ${colors.bold}${colors.green}v${nextVersion || '(根据规则生成)'}${colors.reset}`);

  // 6. 自动化回归测试
  step('5. 运行全量单元测试 (Test Suite)');
  try {
    run('npm run test:once');
  } catch {
    fail('单元测试未通过！发版已紧急终止，请排查单测后再试。');
  }
  success('全量单元测试 100% 通过');

  // 7. 纯净编译打包
  step('6. 编译核心库产物 (Build Library)');
  try {
    run('npm run build:lib');
  } catch {
    fail('核心库打包构建失败！发版已终止。');
  }
  success('构建产物 dist/ 生成完毕 (ESM + CJS + .d.ts)');

  if (isDryRun) {
    step('7. 模拟发布演练 (npm publish --dry-run)');
    run('npm publish --access public --dry-run');
    console.log(`\n${colors.bold}${colors.green}✔ DRY-RUN 演练全部通过！各项检查完全合格，随时可执行正常发版。${colors.reset}\n`);
    return;
  }

  // 8. 提升 package.json 版本并生成 Git Tag
  step('7. 升级版本号并打 Git 标签');
  run(`npm version ${bumpTypeOrVersion} -m "chore(release): v%s"`);
  const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const finalVersion = updatedPkg.version;
  success(`已生成版本提交并打 Tag: v${finalVersion}`);

  // 9. 正式发布到 NPM
  step('8. 推送并发布到 NPM 官方仓库');
  const otpArg = process.argv.find(arg => arg.startsWith('--otp'));
  const publishCmd = `npm publish --access public${otpArg ? ` ${otpArg}` : ''}`;
  try {
    run(publishCmd);
  } catch {
    fail(
      '发布到 NPM 失败！\n' +
      '常见原因：\n' +
      '  1. NPM 强制要求 2FA 双重身份验证：\n' +
      '     👉 方案 A (推荐一劳永逸)：在 npmjs.com 后台创建勾选了「Bypass 2FA for publish」的 Granular Access Token 并配置到 ~/.npmrc\n' +
      '     👉 方案 B (单次输入)：从手机 Authenticator 查看 6 位动态验证码，运行 npm run release -- --otp=123456\n' +
      '  2. 权限问题：请确认你当前登录的账号是否拥有 @darialan 命名空间的所有权或权限。'
    );
  }
  success(`已成功发布 @darialan/web-pdf-printer@${finalVersion} 到 NPM！`);

  // 10. 推送 Git Commit 和 Tag 到远程仓库
  step('9. 同步推送 Git 提交与 Tag 到 GitHub');
  try {
    run('git push && git push --tags');
    success('Git 提交与 Tag 已同步推送到 GitHub');
  } catch (err) {
    warn('Git 远程推送遇到网络波动，可稍后手动运行: git push && git push --tags');
  }

  // 11. 完成摘要
  console.log(`\n${colors.bold}${colors.green}🎉 恭喜！版本 v${finalVersion} 发布圆满成功！${colors.reset}\n`);
  console.log(`📦 NPM 主页:  ${colors.cyan}https://www.npmjs.com/package/${pkgName}${colors.reset}`);
  console.log(`🐙 GitHub 源码: ${colors.cyan}https://github.com/darialan/web-pdf-printer${colors.reset}`);
  console.log(`\n你可以通过如下命令立即在其他项目中安装体验：`);
  console.log(`  ${colors.bold}npm install ${pkgName}@latest${colors.reset}\n`);
}

main().catch(err => {
  fail(err?.message || String(err));
});
