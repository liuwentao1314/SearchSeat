const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function createDefaultEventDraft(type) {
  const now = Date.now();
  return {
    typeKey: type.key,
    typeLabel: type.label,
    name: `${type.label}活动`,
    title: type.label,
    subtitle: "欢迎入席 · 输入姓名查询座位",
    themeColor: type.color,
    status: "draft",
    shareTemplateKey: "golden",
    backgroundImageFileId: "",
    guestCount: 0,
    tableCount: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: null
  };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const users = db.collection("users");
  const userRes = await users.where({ openid: OPENID }).limit(1).get();
  if (!userRes.data.length) {
    throw new Error("请先登录后再创建活动");
  }

  const owner = userRes.data[0];
  const eventDraft = createDefaultEventDraft(event.eventType);
  const created = await db.collection("events").add({
    data: {
      ownerUserId: owner._id,
      ...eventDraft
    }
  });

  return {
    event: {
      eventId: created._id,
      ownerUserId: owner._id,
      ...eventDraft
    }
  };
};
