const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function assertOwner(eventId, openid) {
  const users = await db.collection("users").where({ openid }).limit(1).get();
  if (!users.data.length) {
    throw new Error("请先登录");
  }

  const eventRes = await db.collection("events").doc(eventId).get();
  if (!eventRes.data || eventRes.data.ownerUserId !== users.data[0]._id) {
    throw new Error("无权修改该活动");
  }

  return eventRes.data;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  await assertOwner(event.eventId, OPENID);
  const patch = {
    ...event.patch,
    updatedAt: Date.now()
  };

  await db.collection("events").doc(event.eventId).update({
    data: patch
  });

  const updated = await db.collection("events").doc(event.eventId).get();
  return {
    event: {
      ...updated.data,
      eventId: updated.data._id
    }
  };
};
