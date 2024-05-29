import * as vscode from "vscode";
import * as path from "path";

import { LageTaskProvider } from "./LageTaskProvider";

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("lage");
  const workspaceRoot =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  const lageConfigFilePathFromConfig = config.get("configFilePath");
  const defaultLageConfigFilePath = workspaceRoot
    ? path.join(workspaceRoot, "lage.config.js")
    : undefined;
  const lageConfigFilePath =
    typeof lageConfigFilePathFromConfig === "string"
      ? lageConfigFilePathFromConfig
      : defaultLageConfigFilePath;

  if (!lageConfigFilePath) {
    return;
  }

  const lageTaskProvider = new LageTaskProvider(
    lageConfigFilePath,
    config.get("useWorkspaceLageBinary") ?? false,
    config.get("additionalLageArgs") ?? [],
  );

  const lageTaskProviderRegistration = vscode.tasks.registerTaskProvider(
    "lage",
    lageTaskProvider,
  );

  context.subscriptions.push(lageTaskProvider, lageTaskProviderRegistration);
}

export function deactivate() {}
