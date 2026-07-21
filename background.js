import {
  getFeatureBranchName,
  getFormattedTitle,
  isJiraTicketPage,
} from './scripts/utils.js';

// Import the String prototype extensions - these are added when utils.js is imported
import './scripts/utils.js';

const CONTEXT_MENU_ITEMS = [
  { id: 'copy-as-branch', title: 'Copy as Branch' },
  { id: 'copy-as-title', title: 'Copy as Title' },
  { id: 'copy-as-rich-text', title: 'Copy as Rich text' },
  { id: 'copy-as-markdown', title: 'Copy as Markdown' },
  { id: 'copy-as-teams', title: 'Copy as Teams' },
];

// Create menus on install only; at the worker's top level this re-runs on every
// wake and throws "duplicate id" errors. Menus persist across restarts.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const item of CONTEXT_MENU_ITEMS) {
      chrome.contextMenus.create(item);
    }
  });
});

/// Send a message to the tab; on failure, inject the content script and retry.
async function sendMessageToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['scripts/content.js'],
    });

    // Give the content script a moment to initialize
    await new Promise((resolve) => setTimeout(resolve, 200));
    await chrome.tabs.sendMessage(tabId, message);
  }
}

/// Run a copy command from the context menu or a keyboard shortcut.
async function handleAction(commandId, tab) {
  try {
    if (!tab?.id || !tab?.title) {
      console.error('Invalid tab information');
      return;
    }

    if (commandId === 'copy-as-branch') {
      // For branch names, use the legacy logic to avoid breaking existing workflows
      const title = isJiraTicketPage(tab.title)
        ? tab.title.removeJiraSuffix().removeSquareBracketsInTicketNum()
        : tab.title;
      const branchName = await getFeatureBranchName(title);
      await sendMessageToTab(tab.id, branchName);
    }

    if (commandId === 'copy-as-title') {
      const formattedTitle = await getFormattedTitle(tab.title);
      await sendMessageToTab(tab.id, formattedTitle);
    }

    if (commandId === 'copy-as-rich-text') {
      const formattedTitle = await getFormattedTitle(tab.title);
      const message = `<a href="${tab.url}">${formattedTitle}</a>`;
      await sendMessageToTab(tab.id, {
        action: 'copy-as-rich-text',
        data: message,
      });
    }

    if (commandId === 'copy-as-markdown') {
      const formattedTitle = await getFormattedTitle(tab.title);
      const markdown = `[${formattedTitle}](${tab.url})`;
      await sendMessageToTab(tab.id, markdown);
    }

    if (commandId === 'copy-as-teams') {
      const formattedTitle = await getFormattedTitle(tab.title);
      const htmlMessage = `<a href="${tab.url}">${formattedTitle}</a>`;
      await sendMessageToTab(tab.id, {
        action: 'copy-as-teams',
        data: htmlMessage,
      });
    }
  } catch (error) {
    // Silently handle errors to avoid console spam
    void error;
  }
}

// Listener for context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const commandId = info.menuItemId;
    await handleAction(commandId, tab);
  } catch (error) {
    // Silently handle errors to avoid console spam
    void error;
  }
});

// Listener for keyboard command events
chrome.commands.onCommand.addListener(async (commandId) => {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (activeTab) {
      await handleAction(commandId, activeTab);
    }
  } catch (error) {
    // Silently handle errors to avoid console spam
    void error;
  }
});
