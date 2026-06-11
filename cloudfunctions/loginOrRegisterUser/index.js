const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const now = Date.now();
  const users = db.collection("users");
  const existing = await users.where({ openid: OPENID }).limit(1).get();

  if (existing.data.length > 0) {
    const user = existing.data[0];
    await users.doc(user._id).update({
      data: {
        lastLoginAt: now,
        nickname: event.profile?.nickName || user.nickname || "微信用户",
        avatarUrl: event.profile?.avatarUrl || user.avatarUrl || ""
      }
    });
    return {
      user: {
        ...user,
        lastLoginAt: now,
        nickname: event.profile?.nickName || user.nickname || "微信用户",
        avatarUrl: event.profile?.avatarUrl || user.avatarUrl || ""
      }
    };
  }

  const newUser = {
    openid: OPENID,
    nickname: event.profile?.nickName || "微信用户",
    avatarUrl: event.profile?.avatarUrl || "",
    createdAt: now,
    lastLoginAt: now
  };
  const created = await users.add({ data: newUser });
  return {
    user: {
      ...newUser,
      _id: created._id,
      userId: created._id
    }
  };
};
