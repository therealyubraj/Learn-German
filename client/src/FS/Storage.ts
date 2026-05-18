import type { IStorageProvider } from "./IStorageProvider";
import { OPFS } from "./OPFS";

export const opfsStorage = new OPFS();
export const storage: IStorageProvider = opfsStorage;
