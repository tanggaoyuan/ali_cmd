import OperationFile from './utils/operation_file';
import terminal from './utils/terminal';
import fs from 'fs';
import { ConfigCache, HttpCache } from './utils/store';
import { AliCloudApi } from 'base_api/node';
import { Wrapper } from 'request_chain/core';
import axios from 'axios';

fs.mkdirSync(OperationFile.STORE_PATH, { recursive: true });
fs.mkdirSync(OperationFile.STORE_DOWNLOAD_PATH, { recursive: true });

const ali = new AliCloudApi({
  request: Wrapper.wrapperAxios(axios),
  localCache: HttpCache,
  interceptor: {
    handleError: async (error, chain) => {
      if (error?.response?.status === 401) {
        const loginInfo = ConfigCache.get<AliCloudApi.LoginInfo>(
          ConfigCache.ALITOKEN,
        );
        if (!loginInfo) {
          return Promise.reject(new Error('刷新凭证异常，请重新扫码登录'));
        }
        const { app_id } = await ali.getConfig().getData();
        const { refresh_token, access_token } = await ali
          .refreshToken(app_id, loginInfo.refreshToken)
          .getData();
        const info = {
          ...loginInfo,
          refresh_token,
          access_token,
        };
        ConfigCache.set(ConfigCache.ALITOKEN, info);

        const p = chain.rebuild();

        p.setHeaders({
          Authorization: `Bearer ${access_token}`,
        });

        return p;
      }
    },
  },
});

const history: Record<string, string> = ConfigCache.get(
  ConfigCache.FILE_HISTORY,
) ?? {
  root: 'root',
};

const argv = process.argv.slice(2);

const handle = async (command: string, params: string[]) => {
  try {
    if (command === 'help') {
      terminal.help();
    }
    const config = await ali.getConfig().getData();
    if (command === 'login') {
      const response = await ali.qrLogin(async ({ status, msg, data }) => {
        terminal.log(status, msg);
        if (status === 'qr') {
          const filepath = await OperationFile.saveQrImage(data);
          await OperationFile.openImage(filepath);
        }
      });

      ConfigCache.set(ConfigCache.ALITOKEN, {
        access_token: response.accessToken,
        refresh_token: response.refreshToken,
      });
    }

    if (command === 'token') {
      if (params[0]) {
        terminal.log('请输入token');
        terminal.showPrompt();
        return;
      }
      await ali.refreshToken(config.app_id, params[0]);
    }

    const { access_token, refresh_token } = ConfigCache.get(
      ConfigCache.ALITOKEN,
    );

    if (command === 'refresh') {
      await ali.refreshToken(config.app_id, refresh_token);
    }

    if (command === 'cls') {
      terminal.clear();
    }

    const user = await ali.getUserInfo(access_token).getData();

    if (command === 'ls' || command === 'next') {
      const { items, next_marker } = await ali
        .getDirs({
          drive_id: user.resource_drive_id,
          parent_file_id: history[terminal.current],
          marker: command === 'next' ? params[0] : undefined,
          token: access_token,
        })
        .getData();

      items.forEach((item) => {
        if (item.type === 'file') {
          return;
        }
        history[`${terminal.current}/${item.name}`] = item.file_id;
      });

      ConfigCache.set(ConfigCache.FILE_HISTORY, history);

      terminal.table(
        items.map((item) => {
          return {
            id: item.file_id,
            名称: item.name,
            大小: item.size,
            类型: item.type,
            时间: new Date(item.created_at).toLocaleString(),
          };
        }),
        [42, 20, 8, 8, 20],
      );

      if (next_marker) {
        terminal.log('下一页', `next ${next_marker}`);
      } else {
        terminal.log('暂无更多数据');
      }
    }

    if (command === 'dir') {
      if (!params[0]) {
        terminal.log('请输入名称');
        terminal.showPrompt();
        return;
      }
      await ali.createDir({
        drive_id: user.resource_drive_id,
        parent_file_id: history[terminal.current],
        name: params[0],
        token: access_token,
      });
      terminal.log('创建成功');
    }

    if (command === 'cd') {
      let key = '';

      if (!params[0]) {
        terminal.log('请输入路径');
        terminal.showPrompt();
        return;
      }

      if (terminal.current !== params[0]) {
        if (params[0].includes('/')) {
          const names = terminal.current.split('/');

          if (params[0] === '../') {
            names.pop();
          } else {
            params[0].split('../').forEach((name) => {
              if (!name) {
                names.pop();
                return;
              }
              names.push(name.replace(/.\//g, ''));
            });
          }
          key = names.join('/');
        } else {
          key = params[0].split('\\').join('/');
        }

        if (!key) {
          key = 'root';
        }

        const id = history[key] || history[params[0]];
        if (id) {
          terminal.current = key;
          ConfigCache.set(ConfigCache.CURRENT_PATH, key);
        } else {
          terminal.log('文件路径不存在');
        }
      }
    }

    if (command === 'back') {
      const names = terminal.current.split('/');
      names.pop();
      terminal.current = names.join('/');
      ConfigCache.set(ConfigCache.CURRENT_PATH, terminal.current);
    }

    if (command === 'del') {
      if (!params[0]) {
        terminal.log('请输入id');
        terminal.showPrompt();
        return;
      }
      await ali.delete({
        drive_id: user.resource_drive_id,
        file_id: params[0],
        token: access_token,
      });
      terminal.log('删除成功');
    }

    if (command === 'upload') {
      let [dirpath, cloud_path = '', mode = 'compare'] = params;

      if (!fs.existsSync(dirpath)) {
        terminal.log('上传文件不存在');
        terminal.showPrompt();
        return;
      }

      let check_name_mode = mode;

      if (
        ['refuse', 'auto_rename', 'overwrite', 'compare'].includes(cloud_path)
      ) {
        check_name_mode = cloud_path;
        cloud_path = '';
      }

      let key;

      if (cloud_path) {
        let pathvalue = '';
        if (cloud_path.includes('./')) {
          const names = terminal.current.split('/');
          if (cloud_path === '../') {
            names.pop();
          } else {
            cloud_path.split('../').forEach((name) => {
              if (!name) {
                names.pop();
                return;
              }
              names.push(name.replace(/.\//g, ''));
            });
          }
          pathvalue = names.join('/');
        } else {
          pathvalue = cloud_path;
        }
        key = history[pathvalue];

        if (!key) {
          try {
            key = await ali.getFileInfoByPath({
              drive_id: user.resource_drive_id,
              file_path: pathvalue.replace('root/', '/'),
              token: access_token,
            });
          } catch (error) {
            terminal.log('云盘文件不存在');
          }
        }
      } else {
        key = history[terminal.current];
      }

      await ali.upload(
        {
          drive_id: user.resource_drive_id,
          source_path: dirpath,
          parent_file_id: key,
          check_name_mode: check_name_mode as
            | 'refuse'
            | 'auto_rename'
            | 'overwrite'
            | 'compare',
          token: access_token,
        },
        (data) => {
          let content = '';
          Object.keys(data).forEach((key) => {
            const { progress, name } = data[key];
            const value =
              '='.repeat(Math.floor((progress / 100) * 40)) +
              '-'.repeat(Math.ceil(40 - (progress / 100) * 40));
            content += `${name} => ${value} ${progress}% \n`;
          });
          terminal.cover(content);
        },
      );
    }

    if (command === 'url') {
      if (!params[0]) {
        terminal.log('请输入ID');
        terminal.showPrompt();
        return;
      }
      const response = await ali
        .getDownloadUrl({
          drive_id: user.resource_drive_id,
          file_id: params[0],
          token: access_token,
        })
        .getData();
      terminal.log('下载链接 ==>', response.url);
    }

    if (command === 'download') {
      let [
        file_tag,
        save_path = OperationFile.STORE_DOWNLOAD_PATH,
        mode = 'refuse',
      ] = params;

      let key = file_tag;

      if (
        ['refuse', 'auto_rename', 'overwrite', 'compare'].includes(save_path)
      ) {
        mode = save_path;
        save_path = OperationFile.STORE_DOWNLOAD_PATH;
      }

      if (file_tag === './') {
        key = terminal.current;
      } else if (file_tag.startsWith('./')) {
        key = terminal.current + file_tag.replace('./', '/');
      }

      key = history[key] || key;

      await ali.download(
        {
          drive_id: user.resource_drive_id,
          file_id: key,
          save_dir_path: save_path,
          token: access_token,
          temp_path: OperationFile.STORE_DOWNLOAD_PATH,
          check_name_mode: mode as
            | 'refuse'
            | 'auto_rename'
            | 'overwrite'
            | 'compare',
        },
        (data) => {
          let content = '';
          Object.keys(data).forEach((key) => {
            const { progress, name } = data[key];
            const value =
              '='.repeat(Math.floor((progress / 100) * 40)) +
              '-'.repeat(Math.ceil(40 - (progress / 100) * 40));
            content += `${name} => ${value} ${progress}% \n`;
          });
          terminal.cover(content);
        },
      );
      terminal.log('下载成功');
    }

    terminal.showPrompt();
  } catch (error) {
    terminal.log(
      error?.message ||
        error?.response?.data ||
        error?.response?.statusText ||
        error,
    );
    terminal.showPrompt();
  }
};

if (argv.length) {
  const [command, ...params] = argv;
  handle(command, params);
} else {
  terminal.listener(handle);
}
