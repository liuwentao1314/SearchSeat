const { getStatusMeta, formatTimestamp, normalizeEventTitle } = require("../../utils/event");
const { callFunction } = require("../../utils/cloud");
const { getStoredUser } = require("../../utils/auth");
const {
  getLocalEventById,
  updateLocalEvent,
  removeLocalEvent,
  saveLocalEventPreviewDraft,
  clearLocalEventEditDraft
} = require("../../utils/local-store");
const { chooseMedia, cloudUploadFile } = require("../../utils/wxapi");
const { BUILTIN_EVENT_TYPES } = require("../../config/event-types");

const THEME_SWATCHES = BUILTIN_EVENT_TYPES.map(item => item.color);

function getEventDraftSnapshot(event) {
  if (!event) {
    return "";
  }

  return JSON.stringify({
    name: event.name || "",
    title: event.title || "",
    subtitle: event.subtitle || "",
    themeColor: event.themeColor || "",
    backgroundImageFileId: event.backgroundImageFileId || "",
    shareTemplateKey: event.shareTemplateKey || ""
  });
}

Page({
  data: {
    eventId: "",
    isNewEvent: false,
    hasManualSaved: false,
    loading: true,
    saving: false,
    publishing: false,
    uploadingBackground: false,
    event: null,
    themeSwatches: THEME_SWATCHES
  },

  onLoad(query) {
    this._baselineSnapshot = "";
    this._handlingBack = false;
    this.setData({
      eventId: query.eventId || "",
      isNewEvent: query.new === "1"
    });
  },

  onShow() {
    if (!getStoredUser()) {
      wx.reLaunch({
        url: "/pages/home/index"
      });
      return;
    }
    this.fetchEventDetail();
  },

  onBackPress() {
    if (this._handlingBack || !this.shouldPromptOnLeave()) {
      return false;
    }

    this.promptSaveBeforeLeave();
    return true;
  },

  shouldPromptOnLeave() {
    if (!this.data.event) {
      return false;
    }

    if (this.data.isNewEvent && !this.data.hasManualSaved) {
      return true;
    }

    return this.isDirty();
  },

  isDirty() {
    if (!this.data.event) {
      return false;
    }

    return getEventDraftSnapshot(this.data.event) !== this._baselineSnapshot;
  },

  promptSaveBeforeLeave() {
    if (this._handlingBack) {
      return;
    }

    this._handlingBack = true;
    wx.showModal({
      title: "提示",
      content: "当前修改尚未保存，是否保存草稿？",
      confirmText: "保存",
      cancelText: "不保存",
      success: (res) => {
        if (res.confirm) {
          this.onSaveDraft({ fromBack: true })
            .then(() => {
              this._handlingBack = false;
              wx.navigateBack();
            })
            .catch(() => {
              this._handlingBack = false;
            });
          return;
        }

        if (res.cancel) {
          this.discardChanges()
            .then(() => {
              this._handlingBack = false;
              wx.navigateBack();
            })
            .catch(() => {
              this._handlingBack = false;
            });
          return;
        }

        this._handlingBack = false;
      },
      fail: () => {
        this._handlingBack = false;
      }
    });
  },

  async discardChanges() {
    clearLocalEventEditDraft(this.data.eventId);

    if (this.data.isNewEvent && !this.data.hasManualSaved) {
      removeLocalEvent(this.data.eventId);
    }
  },

  async fetchEventDetail() {
    if (!this.data.eventId) {
      return;
    }

    this.setData({ loading: true });
    try {
      const result = await callFunction("getEventDetail", {
        eventId: this.data.eventId
      }, {
        fallback: () => {
          const localEvent = getLocalEventById(this.data.eventId);
          if (!localEvent) {
            throw new Error("活动不存在");
          }
          return {
            event: localEvent
          };
        }
      });
      const event = this.decorateEvent(result.event);
      this._baselineSnapshot = getEventDraftSnapshot(event);
      this.setData({
        event,
        loading: false,
        hasManualSaved: !this.data.isNewEvent
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || "加载失败",
        icon: "none"
      });
    }
  },

  decorateEvent(event) {
    if (!event) {
      return null;
    }

    return {
      ...event,
      title: normalizeEventTitle(event.title),
      statusMeta: getStatusMeta(event.status),
      updatedLabel: formatTimestamp(event.updatedAt),
      publishedLabel: event.publishedAt ? formatTimestamp(event.publishedAt) : "未发布"
    };
  },

  updateEventDraft(patch) {
    const nextEvent = this.decorateEvent({
      ...this.data.event,
      ...patch,
      updatedAt: Date.now()
    });
    this.setData({
      event: nextEvent
    });
  },

  onInputName(event) {
    this.updateEventDraft({ name: event.detail.value });
  },

  onInputTitle(event) {
    this.updateEventDraft({ title: normalizeEventTitle(event.detail.value) });
  },

  onInputSubtitle(event) {
    this.updateEventDraft({ subtitle: event.detail.value });
  },

  onPickThemeColor(event) {
    this.updateEventDraft({ themeColor: event.currentTarget.dataset.color });
  },

  async onChooseBackground() {
    try {
      this.setData({ uploadingBackground: true });
      const res = await chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"]
      });
      const file = res.tempFiles[0];
      const cloudPath = `event-backgrounds/${this.data.eventId}-${Date.now()}.jpg`;
      wx.showLoading({ title: "上传中" });
      const uploadRes = await cloudUploadFile({
        cloudPath,
        filePath: file.tempFilePath
      });
      wx.hideLoading();
      this.updateEventDraft({
        backgroundImageFileId: uploadRes.fileID,
        backgroundPreviewUrl: file.tempFilePath,
        backgroundTempUrl: file.tempFilePath
      });
      this.setData({
        uploadingBackground: false
      });
      wx.showToast({
        title: "背景图上传成功",
        icon: "success"
      });
    } catch (error) {
      wx.hideLoading();
      this.setData({ uploadingBackground: false });
      if (error.errMsg && error.errMsg.includes("cancel")) {
        return;
      }
      wx.showToast({
        title: error.message || "上传失败",
        icon: "none"
      });
    }
  },

  onSaveDraft(options = {}) {
    const { fromBack = false } = options;

    if (!this.data.event) {
      return Promise.reject(new Error("活动不存在"));
    }

    this.setData({ saving: true });
    return callFunction("updateEvent", {
      eventId: this.data.eventId,
      patch: {
        name: this.data.event.name,
        title: this.data.event.title,
        subtitle: this.data.event.subtitle,
        themeColor: this.data.event.themeColor,
        backgroundImageFileId: this.data.event.backgroundImageFileId || "",
        shareTemplateKey: this.data.event.shareTemplateKey
      }
    }, {
      fallback: () => ({
        event: updateLocalEvent(this.data.eventId, {
          name: this.data.event.name,
          title: this.data.event.title,
          subtitle: this.data.event.subtitle,
          themeColor: this.data.event.themeColor,
          backgroundImageFileId: this.data.event.backgroundImageFileId || "",
          backgroundTempUrl: this.data.event.backgroundPreviewUrl || this.data.event.backgroundTempUrl || "",
          shareTemplateKey: this.data.event.shareTemplateKey
        })
      })
    })
      .then((result) => {
        clearLocalEventEditDraft(this.data.eventId);
        const event = this.decorateEvent(result.event);
        this._baselineSnapshot = getEventDraftSnapshot(event);
        this.setData({
          event,
          saving: false,
          hasManualSaved: true,
          isNewEvent: false
        });
        if (!fromBack) {
          wx.showToast({
            title: "草稿已保存",
            icon: "success"
          });
        }
        return result;
      })
      .catch((error) => {
        this.setData({ saving: false });
        if (!fromBack) {
          wx.showToast({
            title: error.message || "保存失败",
            icon: "none"
          });
        }
        throw error;
      });
  },

  onGoImport() {
    wx.navigateTo({
      url: `/pages/event-import/index?eventId=${this.data.eventId}`
    });
  },

  onGoPreview() {
    saveLocalEventPreviewDraft(this.data.eventId, this.data.event);
    wx.navigateTo({
      url: `/pages/guest/index?eventId=${this.data.eventId}&preview=1`
    });
  },

  async onPublish() {
    this.setData({ publishing: true });
    try {
      const result = await callFunction("publishEvent", {
        eventId: this.data.eventId
      }, {
        fallback: () => {
          if (!this.data.event?.name) {
            throw new Error("请先填写活动名称");
          }
          if (!this.data.event?.guestCount || !this.data.event?.tableCount) {
            throw new Error("请先导入有效名单");
          }
          return {
            event: updateLocalEvent(this.data.eventId, {
              status: "published",
              publishedAt: Date.now(),
              title: this.data.event.title || this.data.event.name
            })
          };
        }
      });
      clearLocalEventEditDraft(this.data.eventId);
      const event = this.decorateEvent(result.event);
      this._baselineSnapshot = getEventDraftSnapshot(event);
      this.setData({
        event,
        publishing: false,
        hasManualSaved: true,
        isNewEvent: false
      });
      wx.showToast({
        title: "活动已发布",
        icon: "success"
      });
    } catch (error) {
      this.setData({ publishing: false });
      wx.showToast({
        title: error.message || "发布失败",
        icon: "none"
      });
    }
  },

  async onGeneratePoster() {
    if (!this.data.event || this.data.event.status !== "published") {
      wx.showToast({
        title: "请先发布活动",
        icon: "none"
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/poster/index?eventId=${this.data.eventId}`
    });
  }
});
