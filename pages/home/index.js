const { BUILTIN_EVENT_TYPES } = require("../../config/event-types");
const { ensureUserProfile, getStoredUser } = require("../../utils/auth");
const { callFunction } = require("../../utils/cloud");
const {
  addLocalEvent,
  createLocalEvent,
  getLocalEvents
} = require("../../utils/local-store");

Page({
  data: {
    user: null,
    loading: true,
    builtinTypes: BUILTIN_EVENT_TYPES,
    showLogin: false,
    loginDesc: "登录后即可创建活动、保存配置并查看活动。",
    quickLinks: [
      { key: "mine", label: "我的活动", path: "/pages/event-list/index" }
    ]
  },

  pendingEventType: null,
  pendingAction: null,

  onShow() {
    this.bootstrap();
  },

  async bootstrap() {
    this.setData({ loading: true });
    const user = getStoredUser();
    if (!user) {
      this.setData({
        user: null,
        loading: false
      });
      return;
    }

    try {
      await callFunction("listUserEvents", {}, {
        fallback() {
          return {
            events: getLocalEvents()
          };
        }
      });
      this.setData({
        user,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || "初始化失败",
        icon: "none"
      });
    }
  },

  noop() {},

  openLogin(desc) {
    this.setData({
      showLogin: true,
      loginDesc: desc || "登录后即可创建活动、保存配置并查看活动。"
    });
  },

  onCloseLogin() {
    this.pendingEventType = null;
    this.pendingAction = null;
    this.setData({ showLogin: false });
  },

  onGoMyEvents() {
    if (!getStoredUser()) {
      this.pendingAction = "myEvents";
      this.openLogin("登录后即可查看和管理你创建的活动。");
      return;
    }
    wx.navigateTo({
      url: "/pages/event-list/index"
    });
  },

  async handleLoginSuccess(event) {
    try {
      const user = await ensureUserProfile({
        forceRefresh: true,
        profile: event.detail
      });
      if (!user) {
        throw new Error("登录结果为空");
      }
      this.setData({ user, showLogin: false });
      await this.bootstrap();
      this.runPendingAction();
    } catch (error) {
      wx.showToast({
        title: error.message || "登录失败",
        icon: "none"
      });
    }
  },

  runPendingAction() {
    const pendingType = this.pendingEventType;
    const pendingAction = this.pendingAction;
    this.pendingEventType = null;
    this.pendingAction = null;

    if (pendingType) {
      this.createEventWithType(pendingType);
      return;
    }
    if (pendingAction === "myEvents") {
      wx.navigateTo({
        url: "/pages/event-list/index"
      });
    }
  },

  onCreateEvent(event) {
    const type = {
      key: event.currentTarget.dataset.key,
      label: event.currentTarget.dataset.label,
      color: event.currentTarget.dataset.color,
      icon: event.currentTarget.dataset.icon,
      accent: event.currentTarget.dataset.accent,
      soft: event.currentTarget.dataset.soft,
      deep: event.currentTarget.dataset.deep,
      textPrimary: event.currentTarget.dataset.textPrimary,
      textSecondary: event.currentTarget.dataset.textSecondary,
      pageBackground: event.currentTarget.dataset.pageBackground,
      heroBackground: event.currentTarget.dataset.heroBackground,
      cardBackground: event.currentTarget.dataset.cardBackground,
      cardBorder: event.currentTarget.dataset.cardBorder,
      typeStyle: event.currentTarget.dataset.typeStyle
    };
    if (!type.key) {
      return;
    }

    if (!getStoredUser()) {
      this.pendingEventType = type;
      this.openLogin("登录后即可创建活动并保存到你的账号里。");
      return;
    }

    this.createEventWithType(type);
  },

  async createEventWithType(type) {
    try {
      wx.showLoading({ title: "创建中" });
      const result = await callFunction("createEvent", {
        eventType: type
      }, {
        fallback: () => {
          const localEvent = addLocalEvent(createLocalEvent(type));
          return {
            event: localEvent
          };
        }
      });
      wx.hideLoading();
      if (!result?.event?.eventId) {
        throw new Error("活动创建结果缺少 eventId");
      }
      wx.navigateTo({
        url: `/pages/event-edit/index?eventId=${result.event.eventId}&new=1`
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || "创建失败",
        icon: "none"
      });
    }
  }
});
