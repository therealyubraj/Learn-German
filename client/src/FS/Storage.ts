import type { IStorageProvider } from "./IStorageProvider";
import { OPFS } from "./OPFS";

export const storage: IStorageProvider = new OPFS();
