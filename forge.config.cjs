const path = require("path");

module.exports = {
  packagerConfig: {
    ignore: [
      /^\/src/,
      /^\/main/,
      /^\/preload/,
      /(.eslintrc.json)|(.eslintignore)|(.prettierignore)|(postcss.config.js)|(tailwind.config.js)|(.DS_Store)|(.gitignore)|(electron.vite.config.ts)|(forge.config.cjs)|(tsconfig.*)|(components.json)/,
    ],
    icon: path.join(__dirname, "./resources/icon.png"),
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-zip",
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "PranavSK",
          name: "review-keypoints-app",
        },
        prerelease: true,
      },
    },
  ],
};
