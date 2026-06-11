const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const users = await db.collection("users").where({ openid: OPENID }).limit(1).get();
  if (!users.data.length) {
    throw new Error("请先登录");
  }

  const user = users.data[0];
  const [eventsRes, customTypesRes] = await Promise.all([
    db.collection("events")
      .where({ ownerUserId: user._id })
      .orderBy("updatedAt", "desc")
      .get(),
    db.collection("eventTypes")
      .where({ ownerUserId: user._id })
      .orderBy("createdAt", "desc")
      .get()
  ]);

  return {
    events: eventsRes.data.map(item => ({
      ...item,
      eventId: item._id
    })),
    customTypes: customTypesRes.data.map(item => ({
      key: item._id,
      label: item.label,
      color: item.color,
      icon: "自定义"
    }))
  };
};
