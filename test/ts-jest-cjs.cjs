const { pathToFileURL } = require('node:url');
const tsJest = require('ts-jest').default;

const transformer = tsJest.createTransformer({
  tsconfig: {
    allowJs: true,
    module: 'commonjs',
    moduleResolution: 'node',
    resolvePackageJsonExports: false,
  },
});

module.exports = {
  ...transformer,
  process(sourceText, sourcePath, options) {
    let normalized = sourceText.replace(
      /const\s+require\s*=\s*createRequire\(import\.meta\.url\);?/g,
      '',
    );
    if (normalized.includes('import.meta.url')) {
      normalized = normalized.replace(
        /import\.meta\.url/g,
        JSON.stringify(pathToFileURL(sourcePath).href),
      );
    }
    return transformer.process(normalized, sourcePath, options);
  },
};
