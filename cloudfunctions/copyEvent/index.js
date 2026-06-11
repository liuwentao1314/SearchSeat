const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const sourceRes = await db.collection("events").doc(event.eventId).get();
  if (!sourceRes.data) {
    throw new Error("原活动不存在");
  }

  const source = sourceRes.data;
  const users = await db.collection("users").where({ openid: OPENID }).limit(1).get();
  if (!users.data.length || users.data[0]._id !== source.ownerUserId) {
    throw new Error("无权复制该活动");
  }
  const now = Date.now();
  const created = await db.collection("events").add({
    data: {
      ownerUserId: source.ownerUserId,
      typeKey: source.typeKey,
      typeLabel: source.typeLabel,
      name: `${source.name}（副本）`,
      title: source.title,
      subtitle: source.subtitle,
      themeColor: source.themeColor,
      status: "draft",
      shareTemplateKey: source.shareTemplateKey || "golden",
      backgroundImageFileId: source.backgroundImageFileId || "",
      sharePosterFileId: "",
      guestCount: source.guestCount || 0,
      tableCount: source.tableCount || 0,
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    }
  });

  const seats = await db.collection("guestSeats").where({
    eventId: event.eventId
  }).get();

  for (const seat of seats.data) {
    await db.collection("guestSeats").add({
      data: {
        eventId: created._id,
        tableLabel: seat.tableLabel,
        guestNameRaw: seat.guestNameRaw,
        guestNameNormalized: seat.guestNameNormalized,
        guestNamePinyin: seat.guestNamePinyin,
        sortOrder: seat.sortOrder
      }
    });
  }

  return {
    event: {
      ...source,
      eventId: created._id,
      name: `${source.name}（副本）`,
      status: "draft",
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    }
  };
};
