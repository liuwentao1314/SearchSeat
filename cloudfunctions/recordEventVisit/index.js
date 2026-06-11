const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const users = await db.collection("users").where({ openid: OPENID }).limit(1).get();
  if (!users.data.length) {
    throw new Error("请先登录");
  }

  await db.collection("eventVisitors").add({
    data: {
      eventId: event.eventId,
      visitorUserId: users.data[0]._id,
      visitedAt: Date.now(),
      source: event.source || "direct"
    }
  });

  return {
    ok: true
  };
};
