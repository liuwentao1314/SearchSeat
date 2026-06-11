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

  if (!event.name) {
    throw new Error("类型名称不能为空");
  }

  const now = Date.now();
  await db.collection("eventTypes").add({
    data: {
      ownerUserId: users.data[0]._id,
      label: event.name,
      color: event.color || "#b62438",
      createdAt: now
    }
  });

  const customTypesRes = await db.collection("eventTypes")
    .where({ ownerUserId: users.data[0]._id })
    .orderBy("createdAt", "desc")
    .get();

  return {
    customTypes: customTypesRes.data.map(item => ({
      key: item._id,
      label: item.label,
      color: item.color,
      icon: "自定义"
    }))
  };
};
