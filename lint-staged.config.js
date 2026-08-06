// Skip files that ESLint ignores by default (e.g. dotfolders like
// `.rnstorybook/`). lint-staged passes explicit paths, so without this filter
// those files trigger "File ignored by default" warnings and fail
// `--max-warnings 0`, even though the CI `eslint .` run skips them silently.
module.exports = {
  '*.{ts,tsx}': (files) => {
    const lintable = files.filter((file) => !file.includes('.rnstorybook'));
    return lintable.length
      ? [`eslint --max-warnings 0 ${lintable.join(' ')}`]
      : [];
  },
};
