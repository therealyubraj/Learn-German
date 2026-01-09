export type LSResponse = Array<{
  name: string;
  type: "file" | "dir";
}>;
export abstract class IStorageProvider {
  abstract readFile(path: string): Promise<string>;
  abstract writeFile(path: string, content: string): Promise<boolean>;
  abstract ls(path: string): Promise<LSResponse>;
  abstract deleteFile(path: string): Promise<boolean>;
  abstract exists(path: string): Promise<boolean>;
}
