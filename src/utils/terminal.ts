import readline from 'readline';
import { ConfigCache } from './store';
import Table from 'cli-table3';

class Log {
  private tempcontent = '';
  private ref: readline.Interface;
  private content = '';

  public current: string; // 获取当前工作目录

  constructor() {
    this.current = ConfigCache.get(ConfigCache.CURRENT_PATH) || 'root';
  }

  private output(text: string) {
    console.clear();
    console.log(text);
  }

  clear() {
    this.content = '';
    this.tempcontent = '';
    console.clear();
  }

  table(rows: any[], colWidths: number[] = []) {
    const table = new Table({
      head: Object.keys(rows[0]),
      style: {
        head: ['green'],
      },
      wordWrap: true,
      wrapOnWordBoundary: false,
      colWidths,
    });

    table.push(
      ...rows.map((row) => {
        return Object.keys(row).map((key) => {
          return row[key];
        });
      }),
    );
    this.content += '\n' + table.toString() + '\n';
    this.output(this.content);
  }

  log(...params: any[]) {
    this.saveTemp();

    let text = '';
    params.forEach((value) => {
      if (!value || typeof value === 'object') {
        text += JSON.stringify(value, null, 2) + '\t';
        return;
      }
      text += value + '\t';
    });
    this.content += text + '\n';
    this.output(this.content);
  }

  help() {
    const options = [
      {
        操作名称: '帮助',
        操作编码: 'help',
      },
      {
        操作名称: '登录',
        操作编码: 'login',
      },
      {
        操作名称: '设置token',
        操作编码: 'token 刷新凭证',
      },
      {
        操作名称: '刷新token',
        操作编码: 'refresh',
      },
      {
        操作名称: '获取列表',
        操作编码: 'ls',
      },
      {
        操作名称: '打开文件',
        操作编码: 'cd ./文件名称',
      },
      {
        操作名称: '返回上级',
        操作编码: 'cd ../ 或 back',
      },
      {
        操作名称: '创建文件',
        操作编码: 'dir 名称',
      },
      {
        操作名称: '删除文件',
        操作编码: 'del ID',
      },
      {
        操作名称: '获取下载地址',
        操作编码: 'url ID',
      },
      {
        操作名称: '上传文件/目录',
        操作编码:
          'upload 文件路劲 [云盘文件路劲/id]  [refuse/auto_rename/overwrite/compare]',
      },
      {
        操作名称: '下载文件/目录',
        操作编码:
          'download 云盘文件路劲/id [本地文件路劲] [refuse/auto_rename/overwrite/compare]',
      },
      {
        操作名称: '清空日志',
        操作编码: 'cls',
      },
    ];
    this.table(options);
    this.log(
      '[]表示可不传',
      'refuse:当文件存在是取消上传/下载',
      'auto_rename:当文件存在时重命名上传/下载',
      'overwrite:覆盖文件',
      'compare:比较hash,执行overwrite',
    );
  }

  showPrompt() {
    if (!this.ref) {
      return;
    }
    const prompt = `${this.current}> `;
    this.ref.setPrompt(prompt);
    this.ref.prompt();
    this.saveTemp();
  }

  cover(text: string) {
    this.tempcontent = '\n' + text;
    this.output(this.content + this.tempcontent);
  }

  saveTemp() {
    this.content += this.tempcontent;
    this.tempcontent = '';
  }

  listener(fn: (cmd: string, params: string[]) => void) {
    if (this.ref) {
      this.ref.close();
    }
    console.clear();
    this.ref = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.help();
    this.showPrompt();
    this.ref.on('line', (input) => {
      const [command, ...params] = input.trim().split(/\s+/);
      this.content += `${this.current}> ${input} \n`;
      this.output(this.content);
      fn(command, params);
    });
    process.on('SIGINT', () => {
      console.log('\n程序被中断，退出中...');
      this.ref.close();
    });
    return this.ref;
  }
}

export default new Log();
