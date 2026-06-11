const { callFunction } = require("../../utils/cloud");
const { getStatusMeta, formatTimestamp } = require("../../utils/event");
const { getStoredUser } = require("../../utils/auth");

Page({
  data: {
    filter: "all",
    events: [],
    displayEvents: [],
    loading: true,
    filters: [
      { key: "all", label: "全部" },
      { key: "draft", label: "草稿" },
      { key: "published", label: "已发布" },
      { key: "archived", label: "已归档" }
    ]
  },

  onShow() {
    if (!getStoredUser()) {
      wx.reLaunch({
        url: "/pages/home/index"
      });
      return;
    }
    this.fetchEvents();
  },

  async fetchEvents() {
    this.setData({ loading: true });
    try {
      const result = await callFunction("listUserEvents", {});
      this.setData({
        events: (result.events || []).map(event => ({
          ...event,
          statusMeta: getStatusMeta(event.status),
          updatedLabel: formatTimestamp(event.updatedAt)
        })),
        loading: false
      });
      this.refreshDisplayEvents();
    } catch (error) {
      console.error("listUserEvents failed", error);
      this.setData({ loading: false });
      wx.showToast({
        title: (error && (error.message || error.errMsg)) || "加载失败",
        icon: "none"
      });
    }
  },

  onSwitchFilter(event) {
    this.setData({
      filter: event.currentTarget.dataset.key
    });
    this.refreshDisplayEvents();
  },

  refreshDisplayEvents() {
    const displayEvents = this.data.filter === "all"
      ? this.data.events
      : this.data.events.filter(item => item.status === this.data.filter);
    this.setData({ displayEvents });
  },

  onOpenEvent(event) {
    wx.navigateTo({
      url: `/pages/event-edit/index?eventId=${event.currentTarget.dataset.id}`
    });
  },

  async onCopyEvent(event) {
    try {
      wx.showLoading({ title: "复制中" });
      const result = await callFunction("copyEvent", {
        eventId: event.currentTarget.dataset.id
      });
      wx.hideLoading();
      wx.navigateTo({
        url: `/pages/event-edit/index?eventId=${result.event.eventId}&new=1`
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || "复制失败",
        icon: "none"
      });
    }
  },

  async onArchiveEvent(event) {
    try {
      await callFunction("updateEvent", {
        eventId: event.currentTarget.dataset.id,
        patch: {
          status: "archived"
        }
      });
      this.fetchEvents();
    } catch (error) {
      wx.showToast({
        title: error.message || "归档失败",
        icon: "none"
      });
    }
  },

  async onRepublishEvent(event) {
    try {
      await callFunction("publishEvent", {
        eventId: event.currentTarget.dataset.id
      });
      this.fetchEvents();
    } catch (error) {
      wx.showToast({
        title: error.message || "重新发布失败",
        icon: "none"
      });
    }
  }
});
