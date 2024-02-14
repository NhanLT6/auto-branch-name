const copyTextToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    console.log("Copied:", text);
  });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  copyTextToClipboard(message);
});
