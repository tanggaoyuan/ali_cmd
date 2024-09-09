import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import qrcode from 'qrcode';
import crypto from 'crypto';

class OperationFile {
  public static readonly STORE_PATH = path.join(
    os.homedir(),
    'Documents',
    'yunpanstore',
  );

  public static readonly STORE_DOWNLOAD_PATH = path.join(
    os.homedir(),
    'Downloads',
  );

  public static getTempPath(filepath: string) {
    return path.join(os.tmpdir(), ...filepath.split(/\\|\//g));
  }

  public static openImage(url: string) {
    return new Promise((resolve, reject) => {
      exec(`start file:///${url}`, (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(data);
      });
    });
  }

  public static saveQrImage(url: string) {
    const md5 = crypto.createHash('md5').update(url).digest('hex');
    const dir = OperationFile.getTempPath(`/YUNPAN`);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const savefilepath = path.join(dir, `${md5}.png`);

    const write = fs.createWriteStream(savefilepath);

    qrcode.toFileStream(write, url);

    return new Promise<string>((resolve, reject) => {
      write.on('close', () => {
        resolve(savefilepath);
      });
      write.on('error', reject);
    });
  }
}

export default OperationFile;
