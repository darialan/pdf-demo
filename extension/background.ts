import { CHANNEL } from './shared/protocol';
const extensionPage = (url?: string) =>
  Boolean(url?.startsWith(chrome.runtime.getURL('')));
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  // Opening must remain directly in the user-gesture call stack.
  void chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    !extensionPage(sender.url) ||
    sender.id !== chrome.runtime.id ||
    message?.channel !== CHANNEL ||
    message?.command !== 'connect'
  )
    return;
  void (async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    const tab = tabs[0];
    if (tab?.id === undefined || !/^https?:\/\//.test(tab.url || ''))
      throw new Error(
        '请打开普通网页，并点击浏览器工具栏中的 Web Printer 图标。',
      );
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      files: ['content.js'],
      world: 'ISOLATED',
    });
    return { ok: true, tabId: tab.id };
  })().then(respond, (error) => respond({ ok: false, error: error.message }));
  return true;
});
