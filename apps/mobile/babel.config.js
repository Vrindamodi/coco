module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // zustand's devtools middleware reads `import.meta.env.MODE`, which
          // Metro's classic web output cannot parse — the web bundle dies with
          // "Cannot use 'import.meta' outside a module" before the app mounts.
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
        },
      ],
    ],
  };
};
