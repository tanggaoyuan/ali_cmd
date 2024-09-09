"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chain = void 0;
const core_1 = require("request_chain/core");
const axios_1 = __importDefault(require("axios"));
exports.chain = new core_1.RequestChain({
    timeout: 10000,
    request: core_1.Wrapper.wrapperAxios(axios_1.default),
});
