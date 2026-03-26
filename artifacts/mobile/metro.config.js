const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const localPath = path.resolve(workspaceRoot, ".local");
const localExcludePattern = new RegExp(
  `^${localPath.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}[/\\\\].*$`
);
const existingBlockList = config.resolver.blockList || [];
const blockListArray = Array.isArray(existingBlockList)
  ? existingBlockList
  : [existingBlockList];
config.resolver.blockList = [...blockListArray, localExcludePattern];

module.exports = config;
