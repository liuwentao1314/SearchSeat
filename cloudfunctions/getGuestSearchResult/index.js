const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function normalizeGuestName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[（(]?\d+人[）)]?$/, "");
}

function toPlainPinyin(text) {
  return normalizeGuestName(text);
}

function findGuestsByInput(list, inputRaw) {
  const normalizedInput = normalizeGuestName(inputRaw);
  const inputPinyin = toPlainPinyin(normalizedInput);

  const exactMatches = list.filter(guest => {
    return (
      guest.guestNameRaw === inputRaw ||
      guest.guestNameNormalized === normalizedInput ||
      guest.guestNamePinyin === inputPinyin
    );
  });

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  return list.filter(guest => {
    return (
      guest.guestNameRaw.includes(inputRaw) ||
      guest.guestNameNormalized.includes(normalizedInput) ||
      guest.guestNamePinyin.includes(inputPinyin)
    );
  });
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const eventRes = await db.collection("events").doc(event.eventId).get();
  if (!eventRes.data) {
    throw new Error("该活动不存在");
  }

  if (eventRes.data.status !== "published") {
    if (!event.allowDraft) {
      throw new Error("该活动暂未开放查询");
    }

    const users = await db.collection("users").where({ openid: OPENID }).limit(1).get();
    if (!users.data.length || users.data[0]._id !== eventRes.data.ownerUserId) {
      throw new Error("该活动暂未开放查询");
    }
  }

  if (!eventRes.data.status && !event.allowDraft) {
    throw new Error("该活动暂未开放查询");
  }

  const seats = await db.collection("guestSeats")
    .where({ eventId: event.eventId })
    .orderBy("sortOrder", "asc")
    .get();

  return {
    results: findGuestsByInput(seats.data, event.query)
  };
};
