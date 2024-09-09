import path from 'path';
import OperationFile from './operation_file';
import fs from 'fs';
import { LocalCache } from 'request_chain/node';
const store_path = path.join(OperationFile.STORE_PATH, 'ConfigCache.json');

class Store {
  public readonly CURRENT_PATH = 'CURRENT_PATH';
  public readonly FILE_HISTORY = 'FILE_HISTORY';
  public readonly ALITOKEN = 'ALITOKEN';
  public store: Record<string, any> = {};

  constructor() {
    this.read();
  }

  read() {
    try {
      this.store = JSON.parse(fs.readFileSync(store_path, 'utf-8'));
    } catch (error) {
      this.store = {};
    }
  }

  wirte() {
    fs.writeFileSync(store_path, JSON.stringify(this.store), 'utf-8');
  }

  get<T = any>(key: string) {
    return this.store[key] as T;
  }

  set(key: string, value: any) {
    if (value === this.store[key]) {
      return;
    }
    this.store[key] = value;
    this.wirte();
  }
}

const ConfigCache = new Store();
const HttpCache = new LocalCache(
  path.join(OperationFile.STORE_PATH, 'HttpCache.json'),
);

export { ConfigCache, HttpCache };
