/// Apply a theme choice to the page; "system" defers to prefers-color-scheme.
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') {
    root.setAttribute('data-theme', theme);
  } else {
    root.removeAttribute('data-theme');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const { getSettings, getFeatureBranchName, isJiraTicketPage } = await import(
    '../scripts/utils.js'
  );

  // Theme
  try {
    const { theme } = await getSettings();
    applyTheme(theme);
  } catch (error) {
    void error;
  }

  // Show the real branch name this page would produce, in the Branch row
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab?.title) {
      const cleanTitle = isJiraTicketPage(activeTab.title)
        ? activeTab.title.removeJiraSuffix().removeSquareBracketsInTicketNum()
        : activeTab.title;
      const branchName = await getFeatureBranchName(cleanTitle);
      const sample = document.querySelector('[data-role="branch-sample"]');
      if (sample && branchName) {
        sample.textContent = branchName;
      }
    }
  } catch (error) {
    void error;
  }

  // Action rows: copy → confirm → animate out → close
  let busy = false;
  document.querySelectorAll('.row').forEach((row) => {
    row.addEventListener('click', async () => {
      if (busy) return;
      busy = true;

      const action = row.getAttribute('data-action');
      if (action) {
        await copyFromCurrentPage(action);
      }

      row.classList.add('copied');
      setTimeout(() => {
        document.body.classList.add('closing');
        setTimeout(() => window.close(), 300);
      }, 560);
    });
  });

  // Open the settings page
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }
});

/// Copy from the popup itself, which is focused and click-activated so rich
/// writes work. Pass a string for plain text, or { html } for rich content.
async function copyToClipboard(payload) {
  try {
    if (typeof payload === 'string') {
      await navigator.clipboard.writeText(payload);
      return;
    }
    const htmlBlob = new Blob([payload.html], { type: 'text/html' });
    const plainBlob = new Blob([payload.html], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': plainBlob }),
    ]);
  } catch (error) {
    // Last-resort fallback if the async Clipboard API is unavailable
    const text = typeof payload === 'string' ? payload : payload.html;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (fallbackError) {
      void fallbackError;
    }
    document.body.removeChild(textArea);
    void error;
  }
}

/// Build the formatted value for the active tab and copy it.
async function copyFromCurrentPage(commandId) {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!activeTab?.id || !activeTab?.title) {
      return;
    }

    const { getFeatureBranchName, getFormattedTitle, isJiraTicketPage } =
      await import('../scripts/utils.js');

    if (commandId === 'copy-as-branch') {
      // Legacy branch logic to avoid breaking existing workflows
      const title = isJiraTicketPage(activeTab.title)
        ? activeTab.title.removeJiraSuffix().removeSquareBracketsInTicketNum()
        : activeTab.title;
      await copyToClipboard(await getFeatureBranchName(title));
    } else if (commandId === 'copy-as-title') {
      await copyToClipboard(await getFormattedTitle(activeTab.title));
    } else if (commandId === 'copy-as-markdown') {
      const formattedTitle = await getFormattedTitle(activeTab.title);
      await copyToClipboard(`[${formattedTitle}](${activeTab.url})`);
    } else if (
      commandId === 'copy-as-rich-text' ||
      commandId === 'copy-as-teams'
    ) {
      // Both paste as a real clickable link (text/html + text/plain fallback)
      const formattedTitle = await getFormattedTitle(activeTab.title);
      await copyToClipboard({
        html: `<a href="${activeTab.url}">${formattedTitle}</a>`,
      });
    }
  } catch (error) {
    // Silently handle errors to avoid console spam
    void error;
  }
}
