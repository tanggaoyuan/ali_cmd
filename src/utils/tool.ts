import { RequestChain, Wrapper } from 'request_chain/core';
import axios from 'axios';

export const chain = new RequestChain({
  timeout: 10000,
  request: Wrapper.wrapperAxios(axios),
});
