"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const qrcode_1 = __importDefault(require("qrcode"));
const crypto_1 = __importDefault(require("crypto"));
class OperationFile {
    static getTempPath(filepath) {
        return path_1.default.join(os_1.default.tmpdir(), ...filepath.split(/\\|\//g));
    }
    static openImage(url) {
        return new Promise((resolve, reject) => {
            (0, child_process_1.exec)(`start file:///${url}`, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(data);
            });
        });
    }
    static saveQrImage(url) {
        const md5 = crypto_1.default.createHash('md5').update(url).digest('hex');
        const dir = OperationFile.getTempPath(`/YUNPAN`);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const savefilepath = path_1.default.join(dir, `${md5}.png`);
        const write = fs_1.default.createWriteStream(savefilepath);
        qrcode_1.default.toFileStream(write, url);
        return new Promise((resolve, reject) => {
            write.on('close', () => {
                resolve(savefilepath);
            });
            write.on('error', reject);
        });
    }
}
OperationFile.STORE_PATH = path_1.default.join(os_1.default.homedir(), 'Documents', 'yunpanstore');
OperationFile.STORE_DOWNLOAD_PATH = path_1.default.join(os_1.default.homedir(), 'Downloads');
exports.default = OperationFile;
