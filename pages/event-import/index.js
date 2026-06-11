const { callFunction } = require("../../utils/cloud");
const { getStoredUser } = require("../../utils/auth");
const { chooseMessageFile, cloudUploadFile } = require("../../utils/wxapi");
const { saveLocalGuestSeats } = require("../../utils/local-store");

Page({
  data: {
    eventId: "",
    loading: false,
    preview: null,
    fileName: "",
    sourceFileId: "",
    importReady: false
  },

  onLoad(query) {
    if (!getStoredUser()) {
      wx.reLaunch({
        url: "/pages/home/index"
      });
      return;
    }
    this.setData({
      eventId: query.eventId || ""
    });
  },

  async onChooseExcel() {
    try {
      const res = await chooseMessageFile({
        count: 1,
        type: "file",
        extension: ["xls", "xlsx"]
      });
      const file = res.tempFiles[0];
      const cloudPath = `imports/${this.data.eventId}-${Date.now()}-${file.name}`;
      wx.showLoading({ title: "上传中" });
      const uploadRes = await cloudUploadFile({
        cloudPath,
        filePath: file.path
      });
      const preview = await callFunction("parseGuestExcel", {
        eventId: this.data.eventId,
        sourceFileId: uploadRes.fileID
      });
      wx.hideLoading();
      this.setData({
        fileName: file.name,
        sourceFileId: uploadRes.fileID,
        preview,
        importReady: true
      });
    } catch (error) {
      wx.hideLoading();
      if (error.errMsg && error.errMsg.includes("cancel")) {
        return;
      }
      wx.showToast({
        title: error.message || "导入失败",
        icon: "none"
      });
    }
  },

  async onCommitImport() {
    if (!this.data.importReady) {
      return;
    }

    try {
      wx.showLoading({ title: "保存中" });
      const result = await callFunction("commitGuestImport", {
        eventId: this.data.eventId,
        sourceFileId: this.data.sourceFileId
      });
      if (result && result.seats) {
        saveLocalGuestSeats(this.data.eventId, result.seats);
      }
      wx.hideLoading();
      wx.showToast({
        title: "导入成功",
        icon: "success"
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 600);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || "保存失败",
        icon: "none"
      });
    }
  }
});
