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
  if (!event.allowVisitor) {
    const users = await db.collection("users").where({ openid: OPENID }).limit(1).get();
    if (!users.data.length || users.data[0]._id !== current.ownerUserId) {
      throw new Error("无权查看该活动");
    }
  }

  if (event.allowVisitor && current.status !== "published") {
    const users = await db.collection("users").where({ openid: OPENID }).limit(1).get();
    if (!users.data.length || users.data[0]._id !== current.ownerUserId) {
      throw new Error("该活动暂未开放查询");
    }
  }

  let backgroundTempUrl = "";
  if (current.backgroundImageFileId) {
    const temp = await cloud.getTempFileURL({
      fileList: [current.backgroundImageFileId]
    });
    backgroundTempUrl = temp.fileList[0]?.tempFileURL || "";
  }

  return {
    event: {
      ...current,
      eventId: current._id,
      backgroundTempUrl
    }
  };
};
