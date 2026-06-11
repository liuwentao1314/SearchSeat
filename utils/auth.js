const { callFunction } = require("./cloud");

function buildLocalMockUser(profile) {
  const now = Date.now();
  return {
    userId: `local-user-${now}`,
    _id: `local-user-${now}`,
    openid: `local-openid-${now}`,
    nickname: profile?.nickName || "本地测试用户",
    avatarUrl: profile?.avatarUrl || "",
    createdAt: now,
    lastLoginAt: now,
    isLocalMockUser: true
  };
}

function getStoredUser() {
  const app = getApp();
  if (app.globalData.user) {
    return app.globalData.user;
  }

  const user = wx.getStorageSync("currentUser");
  if (user) {
    app.globalData.user = user;
    return user;
  }

  return null;
}

function clearStoredUser() {
  const app = getApp();
  app.globalData.user = null;
  wx.removeStorageSync("currentUser");
}

async function ensureUserProfile(options) {
  const app = getApp();
  const cachedUser = getStoredUser();
  if (cachedUser && !options?.forceRefresh) {
    return cachedUser;
  }

  let result = await callFunction("loginOrRegisterUser", {
    profile: options?.profile || null
  }, {
    fallback() {
      return {
        user: buildLocalMockUser(options?.profile),
        isLocalFallback: true
      };
    }
  });

  if (!result || !result.user) {
    result = {
      user: buildLocalMockUser(options?.profile),
      isLocalFallback: true
    };
  }

  app.globalData.user = result.user;
  wx.setStorageSync("currentUser", result.user);
  return result.user;
}

module.exports = {
  ensureUserProfile,
  getStoredUser,
  buildLocalMockUser,
  clearStoredUser
};
