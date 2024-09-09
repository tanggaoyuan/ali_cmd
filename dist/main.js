"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const operation_file_1 = __importDefault(require("./utils/operation_file"));
const terminal_1 = __importDefault(require("./utils/terminal"));
const fs_1 = __importDefault(require("fs"));
const store_1 = require("./utils/store");
const node_1 = require("base_api/node");
const core_1 = require("request_chain/core");
const axios_1 = __importDefault(require("axios"));
fs_1.default.mkdirSync(operation_file_1.default.STORE_PATH, { recursive: true });
fs_1.default.mkdirSync(operation_file_1.default.STORE_DOWNLOAD_PATH, { recursive: true });
const ali = new node_1.AliCloudApi({
    request: core_1.Wrapper.wrapperAxios(axios_1.default),
    localCache: store_1.HttpCache,
    interceptor: {
        handleError: (error, chain) => __awaiter(void 0, void 0, void 0, function* () {
            var _b;
            if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 401) {
                const loginInfo = store_1.ConfigCache.get(store_1.ConfigCache.ALITOKEN);
                if (!loginInfo) {
                    return Promise.reject(new Error('刷新凭证异常，请重新扫码登录'));
                }
                const { app_id } = yield ali.getConfig().getData();
                const { refresh_token, access_token } = yield ali
                    .refreshToken(app_id, loginInfo.refreshToken)
                    .getData();
                const info = Object.assign(Object.assign({}, loginInfo), { refresh_token,
                    access_token });
                store_1.ConfigCache.set(store_1.ConfigCache.ALITOKEN, info);
                const p = chain.rebuild();
                p.setHeaders({
                    Authorization: `Bearer ${access_token}`,
                });
                return p;
            }
        }),
    },
});
const history = (_a = store_1.ConfigCache.get(store_1.ConfigCache.FILE_HISTORY)) !== null && _a !== void 0 ? _a : {
    root: 'root',
};
const argv = process.argv.slice(2);
const handle = (command, params) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d;
    try {
        if (command === 'help') {
            terminal_1.default.help();
        }
        const config = yield ali.getConfig().getData();
        if (command === 'login') {
            const response = yield ali.qrLogin(({ status, msg, data }) => __awaiter(void 0, void 0, void 0, function* () {
                terminal_1.default.log(status, msg);
                if (status === 'qr') {
                    const filepath = yield operation_file_1.default.saveQrImage(data);
                    yield operation_file_1.default.openImage(filepath);
                }
            }));
            store_1.ConfigCache.set(store_1.ConfigCache.ALITOKEN, {
                access_token: response.accessToken,
                refresh_token: response.refreshToken,
            });
        }
        if (command === 'token') {
            if (params[0]) {
                terminal_1.default.log('请输入token');
                terminal_1.default.showPrompt();
                return;
            }
            yield ali.refreshToken(config.app_id, params[0]);
        }
        const { access_token, refresh_token } = store_1.ConfigCache.get(store_1.ConfigCache.ALITOKEN);
        if (command === 'refresh') {
            yield ali.refreshToken(config.app_id, refresh_token);
        }
        if (command === 'cls') {
            terminal_1.default.clear();
        }
        const user = yield ali.getUserInfo(access_token).getData();
        if (command === 'ls' || command === 'next') {
            const { items, next_marker } = yield ali
                .getDirs({
                drive_id: user.resource_drive_id,
                parent_file_id: history[terminal_1.default.current],
                marker: command === 'next' ? params[0] : undefined,
                token: access_token,
            })
                .getData();
            items.forEach((item) => {
                if (item.type === 'file') {
                    return;
                }
                history[`${terminal_1.default.current}/${item.name}`] = item.file_id;
            });
            store_1.ConfigCache.set(store_1.ConfigCache.FILE_HISTORY, history);
            terminal_1.default.table(items.map((item) => {
                return {
                    id: item.file_id,
                    名称: item.name,
                    大小: item.size,
                    类型: item.type,
                    时间: new Date(item.created_at).toLocaleString(),
                };
            }), [42, 20, 8, 8, 20]);
            if (next_marker) {
                terminal_1.default.log('下一页', `next ${next_marker}`);
            }
            else {
                terminal_1.default.log('暂无更多数据');
            }
        }
        if (command === 'dir') {
            if (!params[0]) {
                terminal_1.default.log('请输入名称');
                terminal_1.default.showPrompt();
                return;
            }
            yield ali.createDir({
                drive_id: user.resource_drive_id,
                parent_file_id: history[terminal_1.default.current],
                name: params[0],
                token: access_token,
            });
            terminal_1.default.log('创建成功');
        }
        if (command === 'cd') {
            let key = '';
            if (!params[0]) {
                terminal_1.default.log('请输入路径');
                terminal_1.default.showPrompt();
                return;
            }
            if (terminal_1.default.current !== params[0]) {
                if (params[0].includes('/')) {
                    const names = terminal_1.default.current.split('/');
                    if (params[0] === '../') {
                        names.pop();
                    }
                    else {
                        params[0].split('../').forEach((name) => {
                            if (!name) {
                                names.pop();
                                return;
                            }
                            names.push(name.replace(/.\//g, ''));
                        });
                    }
                    key = names.join('/');
                }
                else {
                    key = params[0].split('\\').join('/');
                }
                if (!key) {
                    key = 'root';
                }
                const id = history[key] || history[params[0]];
                if (id) {
                    terminal_1.default.current = key;
                    store_1.ConfigCache.set(store_1.ConfigCache.CURRENT_PATH, key);
                }
                else {
                    terminal_1.default.log('文件路径不存在');
                }
            }
        }
        if (command === 'back') {
            const names = terminal_1.default.current.split('/');
            names.pop();
            terminal_1.default.current = names.join('/');
            store_1.ConfigCache.set(store_1.ConfigCache.CURRENT_PATH, terminal_1.default.current);
        }
        if (command === 'del') {
            if (!params[0]) {
                terminal_1.default.log('请输入id');
                terminal_1.default.showPrompt();
                return;
            }
            yield ali.delete({
                drive_id: user.resource_drive_id,
                file_id: params[0],
                token: access_token,
            });
            terminal_1.default.log('删除成功');
        }
        if (command === 'upload') {
            let [dirpath, cloud_path = '', mode = 'compare'] = params;
            if (!fs_1.default.existsSync(dirpath)) {
                terminal_1.default.log('上传文件不存在');
                terminal_1.default.showPrompt();
                return;
            }
            let check_name_mode = mode;
            if (['refuse', 'auto_rename', 'overwrite', 'compare'].includes(cloud_path)) {
                check_name_mode = cloud_path;
                cloud_path = '';
            }
            let key;
            if (cloud_path) {
                let pathvalue = '';
                if (cloud_path.includes('./')) {
                    const names = terminal_1.default.current.split('/');
                    if (cloud_path === '../') {
                        names.pop();
                    }
                    else {
                        cloud_path.split('../').forEach((name) => {
                            if (!name) {
                                names.pop();
                                return;
                            }
                            names.push(name.replace(/.\//g, ''));
                        });
                    }
                    pathvalue = names.join('/');
                }
                else {
                    pathvalue = cloud_path;
                }
                key = history[pathvalue];
                if (!key) {
                    try {
                        key = yield ali.getFileInfoByPath({
                            drive_id: user.resource_drive_id,
                            file_path: pathvalue.replace('root/', '/'),
                            token: access_token,
                        });
                    }
                    catch (error) {
                        terminal_1.default.log('云盘文件不存在');
                    }
                }
            }
            else {
                key = history[terminal_1.default.current];
            }
            yield ali.upload({
                drive_id: user.resource_drive_id,
                source_path: dirpath,
                parent_file_id: key,
                check_name_mode: check_name_mode,
                token: access_token,
            }, (data) => {
                let content = '';
                Object.keys(data).forEach((key) => {
                    const { progress, name } = data[key];
                    const value = '='.repeat(Math.floor((progress / 100) * 40)) +
                        '-'.repeat(Math.ceil(40 - (progress / 100) * 40));
                    content += `${name} => ${value} ${progress}% \n`;
                });
                terminal_1.default.cover(content);
            });
        }
        if (command === 'url') {
            if (!params[0]) {
                terminal_1.default.log('请输入ID');
                terminal_1.default.showPrompt();
                return;
            }
            const response = yield ali
                .getDownloadUrl({
                drive_id: user.resource_drive_id,
                file_id: params[0],
                token: access_token,
            })
                .getData();
            terminal_1.default.log('下载链接 ==>', response.url);
        }
        if (command === 'download') {
            let [file_tag, save_path = operation_file_1.default.STORE_DOWNLOAD_PATH, mode = 'refuse',] = params;
            let key = file_tag;
            if (['refuse', 'auto_rename', 'overwrite', 'compare'].includes(save_path)) {
                mode = save_path;
                save_path = operation_file_1.default.STORE_DOWNLOAD_PATH;
            }
            if (file_tag === './') {
                key = terminal_1.default.current;
            }
            else if (file_tag.startsWith('./')) {
                key = terminal_1.default.current + file_tag.replace('./', '/');
            }
            key = history[key] || key;
            yield ali.download({
                drive_id: user.resource_drive_id,
                file_id: key,
                save_dir_path: save_path,
                token: access_token,
                temp_path: operation_file_1.default.STORE_DOWNLOAD_PATH,
                check_name_mode: mode,
            }, (data) => {
                let content = '';
                Object.keys(data).forEach((key) => {
                    const { progress, name } = data[key];
                    const value = '='.repeat(Math.floor((progress / 100) * 40)) +
                        '-'.repeat(Math.ceil(40 - (progress / 100) * 40));
                    content += `${name} => ${value} ${progress}% \n`;
                });
                terminal_1.default.cover(content);
            });
            terminal_1.default.log('下载成功');
        }
        terminal_1.default.showPrompt();
    }
    catch (error) {
        terminal_1.default.log((error === null || error === void 0 ? void 0 : error.message) ||
            ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) ||
            ((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.statusText) ||
            error);
        terminal_1.default.showPrompt();
    }
});
if (argv.length) {
    const [command, ...params] = argv;
    handle(command, params);
}
else {
    terminal_1.default.listener(handle);
}
