/// Copy HTML as real rich content (text/html) with a text/plain fallback, so it
/// pastes as a clickable link. Used for both "Rich text" and "Teams".
const copyHtmlToClipboard = async (htmlContent) => {
  try {
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const plainBlob = new Blob([htmlContent], { type: 'text/plain' });

    const clipboardItem = new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': plainBlob,
    });

    await navigator.clipboard.write([clipboardItem]);
  } catch {
    // Fallback to writing the markup as plain text if rich write is unavailable
    await copyTextToClipboard(htmlContent);
  }
};

/// Copy plain text, falling back to a hidden textarea + execCommand.
const copyTextToClipboard = async (text) => {
  // Ensure the document is focused for the clipboard API
  try {
    window.focus();
    document.body.focus();
  } catch (focusError) {
    // Ignore focus errors
    void focusError;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Try execCommand fallback
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (fallbackError) {
      // Silently handle final fallback failure
      void fallbackError;
    }
  }
};

chrome.runtime.onMessage.addListener(async (message) => {
  try {
    if (
      message &&
      typeof message === 'object' &&
      message.action === 'copy-as-rich-text'
    ) {
      if (!message.data) {
        return;
      }

      // Copy as real rich text so it pastes as a clickable link
      await copyHtmlToClipboard(message.data);
      return;
    }

    if (
      message &&
      typeof message === 'object' &&
      message.action === 'copy-as-teams'
    ) {
      if (!message.data) {
        return;
      }

      // Use simplified HTML format for Teams compatibility
      await copyHtmlToClipboard(message.data);
      return;
    }

    if (typeof message === 'string') {
      await copyTextToClipboard(message);
    }
  } catch (error) {
    // Silently handle errors to avoid console spam
    void error;
  }

  // Keep the message channel open for a response
  return true;
});
