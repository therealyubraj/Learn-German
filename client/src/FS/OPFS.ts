import { computeChecksum } from "../hash";
import type { WordList, WordStatsMap } from "../types";
import { IStorageProvider } from "./IStorageProvider";

const WORDS_DIR = "wordlists";
const STATS_DIR = "stats";

export class OPFS extends IStorageProvider {
  private async getWordsDirHandle(): Promise<FileSystemDirectoryHandle> {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      throw new Error("OPFS API is not supported in this browser environment.");
    }

    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(WORDS_DIR, { create: true });
  }

  private async getStatsDirHandle(): Promise<FileSystemDirectoryHandle> {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      throw new Error("OPFS API is not supported in this browser environment.");
    }

    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(STATS_DIR, { create: true });
  }

  async addNewList(wordList: WordList): Promise<void> {
    const jsonStr = JSON.stringify(wordList);
    const filename = wordList.id;

    try {
      const dirHandle = await this.getWordsDirHandle();
      const fileHandle = await dirHandle.getFileHandle(`${filename}.json`, {
        create: true,
      });
      const writable = await fileHandle.createWritable();

      console.log("Writing to file");
      console.log(jsonStr);
      await writable.write(jsonStr);
      await writable.close();

      console.log(`Successfully saved new list: ${filename}.json`);
    } catch (error) {
      console.error("Failed to save list to OPFS:", error);
      throw new Error("Could not save the list to local storage.");
    }
  }

  async getAllListChecksums(): Promise<Array<string>> {
    const checksums: string[] = [];

    try {
      const dirHandle = await this.getWordsDirHandle();

      //@ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file" && entry.name.endsWith(".json")) {
          const file = await entry.getFile();
          const content = await file.text();
          const wordList: WordList = JSON.parse(content);
          checksums.push(wordList.checksum);
        }
      }

      console.log(`Found ${checksums.length} existing lists.`);
      return checksums;
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundError") {
        return [];
      }
      console.error("Failed to read lists from OPFS:", error);
      return [];
    }
  }

  async getAllLists(): Promise<Array<WordList>> {
    const lists: WordList[] = [];

    try {
      const dirHandle = await this.getWordsDirHandle();

      //@ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file" && entry.name.endsWith(".json")) {
          const file = await entry.getFile();
          const content = await file.text();
          const wordList: WordList = JSON.parse(content);
          lists.push(wordList);
        }
      }

      console.log(`Found ${lists.length} existing lists.`);
      return lists;
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundError") {
        return [];
      }
      console.error("Failed to read lists from OPFS:", error);
      return [];
    }
  }

  async getListById(id: string): Promise<WordList | null> {
    try {
      const dirHandle = await this.getWordsDirHandle();
      const fileHandle = await dirHandle.getFileHandle(`${id}.json`);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundError") {
        return null;
      }
      console.error(`Failed to read list with id "${id}" from OPFS:`, error);
      return null;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(path, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      console.error(`Failed to write file "${path}" to OPFS:`, error);
      throw error;
    }
  }

  async readFile(path: string): Promise<string | null> {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(path);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        return null;
      }
      console.error(`Failed to read file "${path}" from OPFS:`, error);
      throw error;
    }
  }

  async saveStats(checksum: string, stats: WordStatsMap): Promise<void> {
    const jsonStr = JSON.stringify(stats);
    try {
      const dirHandle = await this.getStatsDirHandle();
      const fileHandle = await dirHandle.getFileHandle(`${checksum}.json`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
    } catch (error) {
      console.error(`Failed to save stats for checksum "${checksum}" to OPFS:`, error);
      throw new Error("Could not save the stats to local storage.");
    }
  }

  async loadStats(checksum: string): Promise<WordStatsMap | null> {
    try {
      const dirHandle = await this.getStatsDirHandle();
      const fileHandle = await dirHandle.getFileHandle(`${checksum}.json`);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundError") {
        return null;
      }
      console.error(`Failed to read stats for checksum "${checksum}" from OPFS:`, error);
      return null;
    }
  }
}
