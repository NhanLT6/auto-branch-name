import {
  getFeatureBranchName,
  isJiraTicketPage,
  toKebabCase,
} from "./scripts/utils.js";

// Copy as Branch
chrome.contextMenus.create({
  id: "copy-as-branch",
  title: "Copy as Branch",
});

// Copy as Commit message
chrome.contextMenus.create({
  id: "copy-as-commit-message",
  title: "Copy as Commit message",
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const commandId = info.menuItemId;
  const title = isJiraTicketPage(tab?.title)
    ? (tab?.title).replace(/( - Jira)$/, "")
    : tab?.title;

  if (commandId === "copy-as-branch") {
    const branchName = getFeatureBranchName(toKebabCase(title));
    await chrome.tabs.sendMessage(tab?.id, branchName);
  }

  if (commandId === "copy-as-commit-message") {
    await chrome.tabs.sendMessage(tab?.id, title);
  }
});