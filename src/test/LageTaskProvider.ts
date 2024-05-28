import * as vscode from "vscode";

export class LageTaskProvider implements vscode.TaskProvider {
  private lageTasksPromise: Promise<vscode.Task[]> | undefined;
  private readonly lageConfigFilePath: string;
  private readonly useWorkspaceLageBinary: boolean;
  private readonly additionalLageArgs: ReadonlyArray<string>;

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

    this.lageConfigFilePath = lageConfigFilePath;
    this.useWorkspaceLageBinary = useWorkspaceLageBinary;
    this.additionalLageArgs = additionalLageArgs;
  }

  public resolveTask(
    task: vscode.Task,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Task> {
    return undefined;
  }

  public provideTasks(): Promise<vscode.Task[]> | undefined {
    if (!this.lageTasksPromise) {
      this.lageTasksPromise = this.getLageTasks();
    }
    return this.lageTasksPromise;
  }

  private async getLageTasks(): Promise<vscode.Task[]> {
    const lageConfig = await import(this.lageConfigFilePath);
    const lageTargetNames = Object.keys(lageConfig.pipeline)
      .map((pipelineKey) => {
        const [packageOrTargetName, targetNameOrUndefined] = pipelineKey.split("#");
        
        return targetNameOrUndefined ?? packageOrTargetName;
      });
    // TODO: better inference for `npmClient`, e.g. look for files such as `yarn.lock` to determine.
    const npmClient = lageConfig.npmClient || "npm";
    // TODO: infer binary path instead of using `lage` package.json script, e.g. by using `yarn bin lage`.
    const lageTargetRunner = this.useWorkspaceLageBinary
      ? `${npmClient} run`
      : `lage`;
    const additionalLageArgsString = this.additionalLageArgs.join(" ");

    return lageTargetNames.map(
      (targetName) =>
        new vscode.Task(
          {
            type: "lage",
          },
          vscode.TaskScope.Workspace,
          targetName,
          "lage",
          new vscode.ShellExecution(
            `${lageTargetRunner} ${additionalLageArgsString} ${targetName}`
          )
        )
    );
  }
}
