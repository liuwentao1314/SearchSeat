const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const eventRes = await db.collection("events").doc(event.eventId).get();
  if (!eventRes.data) {
    throw new Error("活动不存在");
  }

  const current = eventRes.data;
  const users = await db.collection("users").where({ openid: OPENID }).limit(1).get();
  if (!users.data.length || users.data[0]._id !== current.ownerUserId) {
    throw new Error("无权发布该活动");
  }
  if (!current.name) {
    throw new Error("请先填写活动名称");
  }
  if (!current.guestCount || !current.tableCount) {
    throw new Error("请先导入有效名单");
  }

  const now = Date.now();
  await db.collection("events").doc(event.eventId).update({
    data: {
      status: "published",
      title: current.title || current.name,
      publishedAt: now,
      updatedAt: now
    }
  });

  const updated = await db.collection("events").doc(event.eventId).get();
  return {
    event: {
      ...updated.data,
      eventId: updated.data._id
    }
  };
};
