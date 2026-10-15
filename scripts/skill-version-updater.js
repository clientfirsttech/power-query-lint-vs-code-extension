// standard-version custom updater: keeps the `version:` frontmatter field of a SKILL.md in sync with package.json.
const VERSION_PATTERN = /^(version:[ \t]*)(\S+)/m;

module.exports.readVersion = function (contents) {
  const match = VERSION_PATTERN.exec(contents);
  if (!match) {
    throw new Error('No `version:` field found in skill frontmatter');
  }
  return match[2];
};

module.exports.writeVersion = function (contents, version) {
  return contents.replace(VERSION_PATTERN, `$1${version}`);
};
