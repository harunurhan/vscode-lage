import * as vscode from "vscode";
import { unique } from "./utils";
import { readLageConfigFile } from "./Lage";

interface LageTaskDefinition extends vscode.TaskDefinition {
  type: "lage";
  npmClient: string;
}

function isLageTaskDefinition(
  taskDefinition: vscode.TaskDefinition
): taskDefinition is LageTaskDefinition {
  return taskDefinition.type === "lage";
}

export class LageTaskProvider implements vscode.TaskProvider {
  private lageTasksPromise: Promise<vscode.Task[]> | undefined;
  private readonly lageConfigFilePath: string;
  private readonly useWorkspaceLageBinary: boolean;
  private readonly additionalLageArgs: ReadonlyArray<string>;
  private readonly configFileWatcher: vscode.FileSystemWatcher;

  constructor(
    lageConfigFilePath: string,
    useWorkspaceLageBinary: boolean,
    additionalLageArgs: string[]
  ) {
    const fileWatcher =
      vscode.workspace.createFileSystemWatcher(lageConfigFilePath);
    fileWatcher.onDidChange(() => (this.lageTasksPromise = undefined));
    fileWatcher.onDidCreate(() => (this.lageTasksPromise = undefined));
    fileWatcher.onDidDelete(() => (this.lageTasksPromise = undefined));

    this.configFileWatcher = fileWatcher;

    this.lageConfigFilePath = lageConfigFilePath;
    this.useWorkspaceLageBinary = useWorkspaceLageBinary;
    this.additionalLageArgs = additionalLageArgs;
  }

  public dispose(): void {
    this.configFileWatcher.dispose();
  }

  public resolveTask(
    task: vscode.Task,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Task> {
    if (isLageTaskDefinition(task.definition)) {
      return new vscode.Task(
        task.definition,
        task.scope ?? vscode.TaskScope.Workspace,
        task.name,
        "lage",
        this.getLageTaskExecution(task.name, task.definition.npmClient)
      );
    }

    console.log("task definition", task);
    return undefined;
  }

  public provideTasks(): Promise<vscode.Task[]> | undefined {
    if (!this.lageTasksPromise) {
      this.lageTasksPromise = this.getLageTasks();
    }
    return this.lageTasksPromise;
  }

  private async getLageTasks(): Promise<vscode.Task[]> {
    const lageConfig = await readLageConfigFile(this.lageConfigFilePath);
    const lageTargetNames = unique(
      Object.keys(lageConfig.pipeline).map((pipelineKey) => {
        const [packageOrTargetName, targetNameOrUndefined] =
          pipelineKey.split("#");

        return targetNameOrUndefined ?? packageOrTargetName;
      })
    );

    const npmClient = lageConfig.npmClient;

    return lageTargetNames.map(
      (targetName) =>
        new vscode.Task(
          {
            type: "lage",
            npmClient,
          },
          vscode.TaskScope.Workspace,
          targetName,
          "lage",
          this.getLageTaskExecution(targetName, npmClient)
        )
    );
  }

  private getLageTaskExecution(
    targetName: string,
    configuredNpmClient: string
  ): vscode.ShellExecution {
    // TODO: better inference for fallback `npmClient`, e.g. look for files such as `yarn.lock` to determine.
    const npmClient = configuredNpmClient || "npm";
    // TODO: infer binary path instead of using `lage` package.json script, e.g. by using `yarn bin lage`.
    const lageTargetRunner = this.useWorkspaceLageBinary
      ? `${npmClient} run lage`
      : `lage`;
    const additionalLageArgsString = this.additionalLageArgs.join(" ");

    return new vscode.ShellExecution(
      `${lageTargetRunner} ${additionalLageArgsString} ${targetName}`
    );
  }
}
