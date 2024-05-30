import { readFile } from "fs/promises";
import { type ConfigOptions as LageConfig } from "lage";

export async function readLageConfigFile(lageConfigFilePath: string): Promise<Pick<LageConfig, "pipeline" | "npmClient">> {
  const fileContent = await readFile(lageConfigFilePath, { encoding: 'utf8' });
  
  // TODO: make this type `unknown` and then narrow the type with validation logic
  const unValidatedLageConfig = eval(fileContent);
  
  if ("pipeline" in unValidatedLageConfig && "npmClient" in unValidatedLageConfig) {
    return unValidatedLageConfig;
  }

  throw new Error("lage config is invalid"); 
}

