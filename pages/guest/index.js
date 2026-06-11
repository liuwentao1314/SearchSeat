const { ensureUserProfile, getStoredUser } = require("../../utils/auth");
const { normalizeEventTitle } = require("../../utils/event");
const { callFunction } = require("../../utils/cloud");
const {
  getLocalEventById,
  getLocalEventPreviewDraft,
  getLocalGuestSeats
} = require("../../utils/local-store");

function decorateGuestEvent(event) {
  if (!event) {
    return null;
  }

  return {
    ...event,
    title: normalizeEventTitle(event.title)
  };
}

function normalizeGuestName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[（(]?\d+人[）)]?$/, "");
}

function toPlainPinyin(text) {
  if (!text) {
    return "";
  }

  const map = {
    张: "zhang",
    王: "wang",
    李: "li",
    刘: "liu",
    陈: "chen",
    赵: "zhao",
    杨: "yang",
    黄: "huang",
    周: "zhou",
    吴: "wu",
    徐: "xu",
    孙: "sun",
    胡: "hu",
    朱: "zhu",
    高: "gao",
    林: "lin",
    何: "he",
    郭: "guo",
    马: "ma",
    罗: "luo",
    梁: "liang",
    宋: "song",
    郑: "zheng",
    谢: "xie",
    唐: "tang",
    韩: "han",
    冯: "feng",
    于: "yu",
    董: "dong",
    萧: "xiao",
    程: "cheng",
    曹: "cao",
    袁: "yuan",
    邓: "deng",
    许: "xu",
    傅: "fu",
    沈: "shen",
    曾: "zeng",
    彭: "peng",
    吕: "lv",
    苏: "su",
    卢: "lu",
    蒋: "jiang",
    蔡: "cai",
    贾: "jia",
    丁: "ding",
    魏: "wei",
    薛: "xue",
    叶: "ye",
    阎: "yan",
    余: "yu",
    潘: "pan",
    杜: "du",
    戴: "dai",
    夏: "xia",
    汪: "wang",
    田: "tian",
    任: "ren",
    姜: "jiang",
    范: "fan",
    方: "fang",
    石: "shi",
    姚: "yao",
    谭: "tan",
    廖: "liao",
    邹: "zou",
    熊: "xiong",
    金: "jin",
    郝: "hao",
    孔: "kong",
    崔: "cui",
    康: "kang",
    毛: "mao",
    邱: "qiu",
    秦: "qin",
    江: "jiang",
    史: "shi"
  };

  return String(text)
    .split("")
    .map(char => map[char] || char)
    .join("");
}

function findGuestsByInput(list, inputRaw) {
  const normalizedInput = normalizeGuestName(inputRaw);
  const inputPinyin = toPlainPinyin(normalizedInput);
  const safeList = (list || []).map(item => {
    const normalizedName = normalizeGuestName(item.guestNameRaw);
    return {
      ...item,
      guestNameNormalized: item.guestNameNormalized || normalizedName,
      guestNamePinyin: item.guestNamePinyin || toPlainPinyin(normalizedName)
    };
  });

  const exactMatches = safeList.filter(guest => {
    return (
      guest.guestNameRaw === inputRaw ||
      guest.guestNameNormalized === normalizedInput ||
      guest.guestNamePinyin === inputPinyin
    );
  });

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  return safeList.filter(guest => {
    return (
      guest.guestNameRaw.includes(inputRaw) ||
      guest.guestNameNormalized.includes(normalizedInput) ||
      guest.guestNamePinyin.includes(inputPinyin)
    );
  });
}

Page({
  data: {
    eventId: "",
    preview: false,
    event: null,
    user: null,
    loading: true,
    query: "",
    results: [],
    emptyMessage: "",
    canScrollHint: false,
    hintDismissed: false,
    localSeats: []
  },

  async onLoad(query) {
    this.setData({
      eventId: query.eventId || "",
      preview: query.preview === "1"
    });
    await this.bootstrap();
  },

  async bootstrap() {
    this.setData({ loading: true });
    const cachedUser = getStoredUser();
    if (!cachedUser) {
      this.setData({
        user: null,
        loading: false
      });
      return;
    }

    try {
      if (this.data.preview) {
        const previewEvent = getLocalEventPreviewDraft(this.data.eventId) || getLocalEventById(this.data.eventId);
        if (previewEvent) {
          this.setData({
            user: cachedUser,
            event: decorateGuestEvent(previewEvent),
            localSeats: getLocalGuestSeats(this.data.eventId),
            loading: false
          });
          return;
        }
      }

      const result = await callFunction("getEventDetail", {
        eventId: this.data.eventId,
        allowVisitor: !this.data.preview
      });
      if (!this.data.preview) {
        await callFunction("recordEventVisit", {
          eventId: this.data.eventId,
          source: "scan"
        });
      }
      this.setData({
        user: cachedUser,
        event: decorateGuestEvent(result.event),
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || "加载失败",
        icon: "none"
      });
    }
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
      this.setData({ user });
      await this.bootstrap();
    } catch (error) {
      wx.showToast({
        title: error.message || "登录失败",
        icon: "none"
      });
    }
  },

  onInputQuery(event) {
    this.setData({
      query: event.detail.value
    });
  },

  async onSearch() {
    if (!this.data.query.trim()) {
      this.setData({
        emptyMessage: "请输入姓名再查询",
        results: []
      });
      return;
    }

    try {
      if (this.data.preview) {
        const localResults = findGuestsByInput(this.data.localSeats || [], this.data.query.trim());
        if (localResults.length || (this.data.localSeats || []).length) {
          this.setData({
            results: localResults || [],
            emptyMessage: localResults.length ? "" : `未找到与“${this.data.query.trim()}”相关的席位`,
            hintDismissed: false
          });
          this.refreshScrollHint();
          return;
        }

        const previewResult = await callFunction("getGuestSearchResult", {
          eventId: this.data.eventId,
          query: this.data.query.trim(),
          allowDraft: true
        });
        this.setData({
          results: previewResult.results || [],
          emptyMessage: previewResult.results.length ? "" : `未找到与“${this.data.query.trim()}”相关的席位`,
          hintDismissed: false
        });
        this.refreshScrollHint();
        return;
      }

      const result = await callFunction("getGuestSearchResult", {
        eventId: this.data.eventId,
        query: this.data.query.trim()
      });
      this.setData({
        results: result.results || [],
        emptyMessage: result.results.length ? "" : `未找到与“${this.data.query.trim()}”相关的席位`,
        hintDismissed: false
      });
      this.refreshScrollHint();
    } catch (error) {
      wx.showToast({
        title: error.message || "查询失败",
        icon: "none"
      });
    }
  },

  refreshScrollHint() {
    setTimeout(() => {
      const query = wx.createSelectorQuery();
      query.select(".result-scroll").boundingClientRect();
      query.select(".result-scroll").scrollOffset();
      query.exec(res => {
        const box = res[0];
        if (!box) {
          return;
        }
        this.setData({
          canScrollHint: (this.data.results || []).length > 2
        });
      });
    }, 30);
  },

  onScrollResults() {
    if (!this.data.hintDismissed) {
      this.setData({
        hintDismissed: true
      });
    }
  },

  onGoHome() {
    wx.reLaunch({
      url: "/pages/home/index"
    });
  }
});
