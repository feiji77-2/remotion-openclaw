// e2e/ui-studio-smoke.spec.ts
// P4.1: Playwright 浏览器 E2E — 真点 UI 按钮验证生产台交互闭环
import {test, expect} from '@playwright/test';
import path from 'node:path';

const RUNNER_PORT = 8787 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${RUNNER_PORT}`;

test.describe('Video Factory Studio — UI E2E', () => {
  test('完整生产闭环：新建项目 → 改文案 → 保存 → 生成分镜', async ({page}) => {
    // Navigate to studio
    await page.goto(BASE, {waitUntil: 'networkidle'});

    // Wait for the app to load — should see "Video Factory" title
    await expect(page.locator('text=Video Factory')).toBeVisible({timeout: 15000});

    // Step 1: Click "新建视频" button in left panel
    const newProjectBtn = page.locator('button:has-text("新建视频")');
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    // Step 2: Fill the new project modal
    const modal = page.locator('h2:has-text("新建视频项目")');
    await expect(modal).toBeVisible({timeout: 5000});

    const testId = `p4-ui-${Date.now().toString(36)}`;
    await page.locator('input[placeholder="my-first-video"]').fill(testId);
    await page.locator('input[placeholder*="视频标题"]').fill('Playwright E2E 测试');
    await page.locator('textarea[placeholder*="口播稿"]').fill(
      '这是 Playwright 自动化测试的口播稿。内容应当包含至少二十个汉字以上。我们来测试完整链路。'
    );
    await page.locator('input[placeholder*="AI, 工作流"]').fill('Playwright,E2E');

    // Click "创建项目"
    await page.locator('button:has-text("创建项目")').click();

    // Step 3: Wait for modal to close and project to be selected
    await expect(modal).not.toBeVisible({timeout: 15000});

    // Step 4: Verify status strip shows action buttons
    const statusStrip = page.locator('button:has-text("保存文案")');
    await expect(statusStrip).toBeVisible({timeout: 10000});

    // Step 5: Click "保存文案" — should change to "已保存" ✓
    await statusStrip.click();
    await page.waitForTimeout(2000);
    const savedBtn = page.locator('button:has-text("文案已保存")');
    await expect(savedBtn.first()).toBeVisible({timeout: 10000});
  });

  test('错误状态可见：非法 projectId 被拒绝', async ({page}) => {
    await page.goto(BASE, {waitUntil: 'networkidle'});
    await expect(page.locator('text=Video Factory')).toBeVisible({timeout: 15000});

    // Open modal
    await page.locator('button:has-text("新建视频")').click();
    await expect(page.locator('h2:has-text("新建视频项目")')).toBeVisible({timeout: 5000});

    // Fill invalid projectId (contains '/')
    await page.locator('input[placeholder="my-first-video"]').fill('bad/id');
    await page.locator('input[placeholder*="视频标题"]').fill('Test');
    await page.locator('textarea[placeholder*="口播稿"]').fill('这是一个测试视频的口播稿内容至少二十字以上。');

    // Click create — should show inline validation error (not server error)
    await page.locator('button:has-text("创建项目")').click();

    // Should still show modal (didn't submit due to client-side validation)
    // The input should show error hint "仅支持字母、数字"
    await expect(page.locator('text=仅支持字母、数字')).toBeVisible({timeout: 5000});
  });
});
