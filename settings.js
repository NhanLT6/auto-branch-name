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
  const { getSettings, toKebabCase } = await import('./scripts/utils.js');

  const SAMPLE_RAW = 'PROJ-123 Update onboarding checklist - Jira';
  const SAMPLE_URL = 'https://company.atlassian.net/browse/PROJ-123';

  const branchPrefixInput = document.getElementById('branchPrefix');
  const titlePrefixInput = document.getElementById('titlePrefix');
  const removeSuffixesSw = document.getElementById('removeSuffixes');
  const removeBracketsSw = document.getElementById('removeBrackets');
  const suffixChips = document.getElementById('suffixChips');
  const suffixAdd = document.getElementById('suffixAdd');
  const themeSeg = document.getElementById('themeSeg');
  const saveButton = document.getElementById('saveButton');
  const versionChip = document.getElementById('versionChip');

  const pvBranch = document.getElementById('pvBranch');
  const pvTitle = document.getElementById('pvTitle');
  const pvRich = document.getElementById('pvRich');
  const pvMarkdown = document.getElementById('pvMarkdown');

  // Mutable form state
  let suffixList = [];
  let removeSuffixes = true;
  let removeBrackets = false;
  let theme = 'system';

  // Load persisted settings (with migration handled in getSettings)
  const settings = await getSettings();
  branchPrefixInput.value = settings.branchPrefix;
  titlePrefixInput.value = settings.titlePrefix;
  suffixList = [...settings.suffixList];
  removeSuffixes = settings.removeSuffixes;
  removeBrackets = settings.removeBrackets;
  theme = settings.theme;

  setSwitch(removeSuffixesSw, removeSuffixes);
  setSwitch(removeBracketsSw, removeBrackets);
  setThemeActive(theme);
  applyTheme(theme);

  // Show the extension version from the manifest (no hardcoded number to update)
  const version = chrome.runtime?.getManifest?.().version;
  if (versionChip && version) {
    versionChip.textContent = `v${version}`;
  }

  document.getElementById('pvSrcTitle').textContent = SAMPLE_RAW;
  document.getElementById('pvSrcUrl').textContent =
    'company.atlassian.net/browse/PROJ-123';
  // The sample has no brackets, so the "Remove ticket brackets" toggle has no
  // visible effect here; it still applies to real page titles.

  renderChips();
  updatePreview();

  // Events
  branchPrefixInput.addEventListener('input', updatePreview);
  titlePrefixInput.addEventListener('input', updatePreview);

  removeSuffixesSw.addEventListener('click', () => {
    removeSuffixes = !removeSuffixes;
    setSwitch(removeSuffixesSw, removeSuffixes);
    updatePreview();
  });

  removeBracketsSw.addEventListener('click', () => {
    removeBrackets = !removeBrackets;
    setSwitch(removeBracketsSw, removeBrackets);
    updatePreview();
  });

  suffixAdd.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const value = suffixAdd.value.trim();
    if (value && !suffixList.includes(value)) {
      suffixList.push(value);
      renderChips();
      updatePreview();
    }
    suffixAdd.value = '';
  });

  themeSeg.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    theme = button.getAttribute('data-theme-val');
    setThemeActive(theme);
    applyTheme(theme);
    // Theme is a view preference; persist it immediately, not on Save.
    try {
      await chrome.storage.sync.set({ theme });
    } catch (error) {
      void error;
    }
  });

  saveButton.addEventListener('click', async () => {
    const toSave = {
      branchPrefix: branchPrefixInput.value.trim(),
      removeSuffixes,
      suffixList,
      removeBrackets,
      titlePrefix: titlePrefixInput.value.trim(),
      theme,
    };

    try {
      saveButton.disabled = true;
      saveButton.textContent = 'Saving…';
      await chrome.storage.sync.set(toSave);
      saveButton.textContent = 'Saved';
      setTimeout(() => {
        saveButton.disabled = false;
        saveButton.textContent = 'Save settings';
      }, 1600);
    } catch {
      saveButton.disabled = false;
      saveButton.textContent = 'Save settings';
    }
  });

  // Helpers
  function setSwitch(el, on) {
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', String(on));
  }

  function setThemeActive(value) {
    themeSeg.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.getAttribute('data-theme-val') === value);
    });
  }

  function renderChips() {
    suffixChips.querySelectorAll('.chipx').forEach((node) => node.remove());
    for (const suffix of suffixList) {
      const chip = document.createElement('span');
      chip.className = 'chipx';

      const label = document.createElement('span');
      label.textContent = suffix;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${suffix}`);
      remove.addEventListener('click', () => {
        suffixList = suffixList.filter((s) => s !== suffix);
        renderChips();
        updatePreview();
      });

      chip.append(label, remove);
      suffixChips.insertBefore(chip, suffixAdd);
    }
  }

  function stripSuffix(text) {
    for (const suffix of suffixList) {
      if (suffix && text.endsWith(suffix)) {
        return text.slice(0, -suffix.length);
      }
    }
    return text;
  }

  function formatSampleTitle() {
    let title = SAMPLE_RAW;
    if (removeSuffixes) {
      title = stripSuffix(title);
    }
    if (removeBrackets) {
      title = title.replace(/^(\[)(.*?)(])(\s*)/, '$2$4');
    }
    const prefix = titlePrefixInput.value.trim();
    if (prefix) {
      title = `${prefix} ${title}`;
    }
    return title.trim();
  }

  function sampleBranchName() {
    const prefix = branchPrefixInput.value.trim() || 'feature/';
    // Branch names always drop suffixes and ticket brackets.
    const cleaned = stripSuffix(SAMPLE_RAW).replace(
      /^(\[)(.*?)(])(\s*)/,
      '$2$4'
    );
    return prefix + toKebabCase(cleaned);
  }

  function updatePreview() {
    const title = formatSampleTitle();
    pvBranch.textContent = sampleBranchName();
    pvTitle.textContent = title;
    pvRich.textContent = title;
    pvMarkdown.textContent = `[${title}](${SAMPLE_URL})`;
  }
});
