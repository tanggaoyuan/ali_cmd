"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpCache = exports.ConfigCache = void 0;
const path_1 = __importDefault(require("path"));
const operation_file_1 = __importDefault(require("./operation_file"));
const fs_1 = __importDefault(require("fs"));
const node_1 = require("request_chain/node");
const store_path = path_1.default.join(operation_file_1.default.STORE_PATH, 'ConfigCache.json');
class Store {
    constructor() {
        this.CURRENT_PATH = 'CURRENT_PATH';
        this.FILE_HISTORY = 'FILE_HISTORY';
        this.ALITOKEN = 'ALITOKEN';
        this.store = {};
        this.read();
    }
    read() {
        try {
            this.store = JSON.parse(fs_1.default.readFileSync(store_path, 'utf-8'));
        }
        catch (error) {
            this.store = {};
        }
    }
    wirte() {
        fs_1.default.writeFileSync(store_path, JSON.stringify(this.store), 'utf-8');
    }
    get(key) {
        return this.store[key];
    }
    set(key, value) {
        if (value === this.store[key]) {
            return;
        }
        this.store[key] = value;
        this.wirte();
    }
}
const ConfigCache = new Store();
exports.ConfigCache = ConfigCache;
const HttpCache = new node_1.LocalCache(path_1.default.join(operation_file_1.default.STORE_PATH, 'HttpCache.json'));
exports.HttpCache = HttpCache;
