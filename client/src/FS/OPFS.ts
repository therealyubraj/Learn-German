import { IStorageProvider, LSResponse } from "./IStorageProvider";

export class OPFS extends IStorageProvider {
  private async getFileHandle(
    path: string,
    options: { create?: boolean } = {}
  ): Promise<FileSystemFileHandle | null> {
    try {
      if (!navigator.storage.getDirectory) {
        console.error("OPFS is not supported in this browser.");
        return null;
      }
      const root = await navigator.storage.getDirectory();
      const pathSegments = path.split("/").filter((p) => p);
      const fileName = pathSegments.pop();

      if (!fileName) {
        console.error("Invalid path provided. No filename.");
        return null;
      }

      let currentDir = root;
      for (const segment of pathSegments) {
        currentDir = await currentDir.getDirectoryHandle(segment, options);
      }

      return await currentDir.getFileHandle(fileName, options);
    } catch (error) {
      if ((error as DOMException).name !== "NotFoundError") {
        console.error(`[OPFS] Error accessing handle for ${path}:`, error);
      }
      return null;
    }
  }

  private async getDirectoryHandle(
    path: string,
    options: { create?: boolean } = {}
  ): Promise<FileSystemDirectoryHandle | null> {
    try {
      if (!navigator.storage.getDirectory) {
        console.error("OPFS is not supported in this browser.");
        return null;
      }
      const root = await navigator.storage.getDirectory();
      const pathSegments = path.split("/").filter((p) => p);

      let currentDir = root;
      for (const segment of pathSegments) {
        currentDir = await currentDir.getDirectoryHandle(segment, options);
      }
      return currentDir;
    } catch (error) {
      if ((error as DOMException).name !== "NotFoundError") {
        console.error(
          `[OPFS] Error accessing directory handle for ${path}:`,
          error
        );
      }
      return null;
    }
  }

  async ls(path: string): Promise<LSResponse> {
    const result: LSResponse = [];
    try {
      const dirHandle = await this.getDirectoryHandle(path);
      if (!dirHandle) {
        return result;
      }

      for await (const [name, handle] of (dirHandle as any).entries()) {
        result.push({
          name,
          type: handle.kind === "file" ? "file" : "dir",
        });
      }
    } catch (error) {
      console.error(`[OPFS] Error listing directory ${path}:`, error);
    }
    return result;
  }

  async readFile(path: string): Promise<string> {
    try {
      const fileHandle = await this.getFileHandle(path);
      if (!fileHandle) {
        throw new Error(`No such file. ${path}`);
      }
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (error) {
      throw error;
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const pathSegments = path.split("/").filter((p) => p);
      const fileName = pathSegments.pop();

      if (!fileName) {
        console.error("Invalid path provided. No filename.");
        return false;
      }

      const dirPath = pathSegments.join("/");
      const dirHandle = await this.getDirectoryHandle(dirPath);
      if (!dirHandle) {
        return false;
      }

      await dirHandle.removeEntry(fileName);
      return true;
    } catch (error) {
      console.error(`[OPFS] Error deleting file ${path}:`, error);
      return false;
    }
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    try {
      const fileHandle = await this.getFileHandle(path, { create: true });
      if (!fileHandle) {
        return false;
      }
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (error) {
      console.error(`[OPFS] Error writing file ${path}:`, error);
      return false;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const handle = await this.getFileHandle(path);
      return handle !== null;
    } catch (error) {
      console.error(`[OPFS] Error checking existence of ${path}:`, error);
      return false;
    }
  }
}
