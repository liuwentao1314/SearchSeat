let initialized = false;
const { ENABLE_LOCAL_MOCK } = require("../config/runtime");

function initCloud(env) {
  if (initialized || !wx.cloud) {
    return;
  }

  wx.cloud.init({
    env,
    traceUser: true
  });
  initialized = true;
}

function isFunctionMissingError(error) {
  const message = String(error?.errMsg || error?.message || "");
  return (
    message.includes("FUNCTION_NOT_FOUND") ||
    message.includes("FunctionName parameter could not be found") ||
    message.includes("errCode: -501000")
  );
}

function isFallbackEligibleError(error) {
  const message = String(error?.errMsg || error?.message || "").toLowerCase();
  return (
    isFunctionMissingError(error) ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("time out") ||
    message.includes("-504003") ||
    message.includes("request:fail")
  );
}

function withTimeout(promise, timeoutMs, message) {
  if (!timeoutMs) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message || "请求超时"));
      }, timeoutMs);
    })
  ]);
}

function callFunction(name, data, options) {
  const request = wx.cloud.callFunction({
    name,
    data: data || {}
  }).then(({ result }) => result);

  return withTimeout(request, options?.timeoutMs).catch(error => {
    if (options?.fallback && (ENABLE_LOCAL_MOCK || options.allowFallback) && isFallbackEligibleError(error)) {
      return options.fallback(error);
    }
    throw error;
  });
}

module.exports = {
  initCloud,
  callFunction,
  withTimeout,
  isFunctionMissingError,
  isFallbackEligibleError
};
