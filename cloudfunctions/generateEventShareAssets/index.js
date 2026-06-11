const cloud = require("wx-server-sdk");
const util = require("util");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function stringifyError(error) {
  if (!error) {
    return "未知错误";
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch (stringifyErr) {
    return util.inspect(error, { depth: 6, breakLength: 120 });
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const eventRes = await db.collection("events").doc(event.eventId).get();
  if (!eventRes.data || eventRes.data.status !== "published") {
    throw new Error("请先发布活动");
  }

  const current = eventRes.data;
  const users = await db.collection("users").where({ openid: OPENID }).limit(1).get();
  if (!users.data.length || users.data[0]._id !== current.ownerUserId) {
    throw new Error("无权生成该活动海报");
  }

  try {
    const wxacodeRes = await cloud.openapi.wxacode.getUnlimited({
      scene: event.eventId,
      page: "pages/guest/index",
      checkPath: false,
      envVersion: "release"
    });
    const cloudPath = `share-assets/${event.eventId}-wxacode.png`;
    const uploaded = await cloud.uploadFile({
      cloudPath,
      fileContent: wxacodeRes.buffer
    });
    const temp = await cloud.getTempFileURL({
      fileList: [uploaded.fileID]
    });

    return {
      qrCodeFileId: uploaded.fileID,
      qrCodeTempUrl: temp.fileList[0]?.tempFileURL || "",
      qrCodeEnabled: true
    };
  } catch (error) {
    console.error("generateEventShareAssets openapi failed", stringifyError(error));
    return {
      qrCodeFileId: "",
      qrCodeTempUrl: "",
      qrCodeEnabled: false,
      warning: "当前云环境暂未开通生成官方小程序码的权限，已生成无二维码海报预览。"
    };
  }
};
