const toKebabCase = (str) => {
  if (!str) return '';

  return str
    .replace(/^\W+|\W+$/g, '') // Replace special chars at the beginning and end
    .replace(/[\W\s]+/g, '-') // Replace spaces with hyphens
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase to kebab-case
    .toLowerCase();
};

const isJiraTicketPage = (url) => url?.endsWith('Jira') || false;

String.prototype.removeJiraSuffix = function () {
  return this.replace(/( - Jira)$/, '');
};

String.prototype.removeSquareBracketsInTicketNum = function () {
  return this.replace(/^(\[)(.*?)(])/, '$2');
};

// Default suffixes stripped from page titles; user-editable and persisted as
// `suffixList`. These seed first run and migration from the old hardcoded set.
const DEFAULT_SUFFIXES = [
  ' - Jira',
  ' - Azure DevOps',
  ' - GitHub',
  ' - GitLab',
  ' - Linear',
  ' - Asana',
  ' - Trello',
  ' - Monday.com',
  ' - Confluence',
  ' - Notion',
  ' - ClickUp',
  ' - Google Docs',
];

/// Single source of truth for settings: applies defaults and migrates the legacy
/// `removePlatformSuffix` key to `removeSuffixes` + `suffixList`.
const getSettings = async () => {
  const s = await chrome.storage.sync.get([
    'branchPrefix',
    'removeSuffixes',
    'removePlatformSuffix',
    'suffixList',
    'removeBrackets',
    'titlePrefix',
    'theme',
  ]);

  return {
    branchPrefix: s.branchPrefix || 'feature/',
    removeSuffixes:
      s.removeSuffixes !== undefined
        ? s.removeSuffixes
        : s.removePlatformSuffix !== false, // migrate old key; default: true
    suffixList: Array.isArray(s.suffixList)
      ? s.suffixList
      : [...DEFAULT_SUFFIXES],
    removeBrackets: s.removeBrackets === true, // default: false
    titlePrefix: s.titlePrefix || '',
    theme: s.theme || 'system',
  };
};

const getFeatureBranchName = async (title) => {
  const { branchPrefix } = await getSettings();
  return branchPrefix + toKebabCase(title);
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/// Clean a raw page title: strip a known suffix and optional brackets, add prefix.
const getFormattedTitle = async (rawTitle) => {
  const { removeSuffixes, suffixList, removeBrackets, titlePrefix } =
    await getSettings();

  let title = rawTitle;

  // Strip a single trailing suffix from the user-managed list (e.g. " - Jira")
  if (removeSuffixes) {
    for (const suffix of suffixList) {
      if (suffix && title.endsWith(suffix)) {
        title = title.slice(0, -suffix.length);
        break;
      }
    }
  }

  // Remove brackets around ticket numbers
  if (removeBrackets) {
    title = title.replace(/^(\[)(.*?)(])(\s*)/, '$2$4');
  }

  // Add title prefix
  if (titlePrefix) {
    title = `${titlePrefix} ${title}`;
  }

  return title.trim();
};

export {
  toKebabCase,
  isJiraTicketPage,
  DEFAULT_SUFFIXES,
  getSettings,
  getFeatureBranchName,
  getFormattedTitle,
  escapeHtml,
};
