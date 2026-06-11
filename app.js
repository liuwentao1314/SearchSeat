const { initCloud } = require("./utils/cloud");
const { CLOUD_ENV_ID } = require("./config/runtime");

App({
  globalData: {
    user: null
  },

  onLaunch(options) {
    initCloud(CLOUD_ENV_ID);
    this.globalData.launchOptions = options || {};
  }
});
