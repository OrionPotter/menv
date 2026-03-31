import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, parse } from "node:path";

export async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  if (!existsSync(filePath)) {
    return undefined;
  }

  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function ensureDirForFile(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function backupFile(filePath: string): Promise<string | undefined> {
  if (!existsSync(filePath)) {
    return undefined;
  }

  const backupPath = `${filePath}.bak`;
  await copyFile(filePath, backupPath);
  return backupPath;
}

export async function restoreBackupFile(filePath: string): Promise<string | undefined> {
  const backupPath = `${filePath}.bak`;
  if (!existsSync(backupPath)) {
    return undefined;
  }

  await rename(backupPath, filePath);
  return backupPath;
}

export function findUp(fileName: string, startDir: string): string | undefined {
  let current = startDir;

  while (true) {
    const candidate = join(current, fileName);
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(current);
    if (parent === current || current === parse(current).root) {
      return undefined;
    }

    current = parent;
  }
}
