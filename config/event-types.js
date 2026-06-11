const EVENT_TYPE_THEMES = {
  wedding: {
    key: "wedding",
    label: "婚礼",
    icon: "囍",
    color: "#B62438",
    accent: "#E8B857",
    soft: "#FFF3F1",
    deep: "#7D1326",
    textPrimary: "#5B1520",
    textSecondary: "#91645A",
    pageBackground: "linear-gradient(180deg, #fff8f3 0%, #fde7e4 100%)",
    heroBackground: "linear-gradient(135deg, rgba(182,36,56,0.96) 0%, rgba(145,18,32,0.9) 56%, rgba(232,184,87,0.40) 100%)",
    cardBackground: "rgba(255, 248, 243, 0.96)",
    cardBorder: "rgba(182, 36, 56, 0.16)",
    typeStyle: "喜庆请帖"
  },
  banquet: {
    key: "banquet",
    label: "宴请",
    icon: "宴",
    color: "#8A5A1D",
    accent: "#D8B067",
    soft: "#FCF6EC",
    deep: "#4A3111",
    textPrimary: "#503418",
    textSecondary: "#88705B",
    pageBackground: "linear-gradient(180deg, #faf4e9 0%, #efe3cf 100%)",
    heroBackground: "linear-gradient(135deg, rgba(138,90,29,0.97) 0%, rgba(75,48,20,0.94) 60%, rgba(216,176,103,0.34) 100%)",
    cardBackground: "rgba(255, 250, 242, 0.96)",
    cardBorder: "rgba(138, 90, 29, 0.18)",
    typeStyle: "高端雅宴"
  },
  team: {
    key: "team",
    label: "团建",
    icon: "聚",
    color: "#1F7A74",
    accent: "#6BC9B4",
    soft: "#EEF9F6",
    deep: "#104A46",
    textPrimary: "#144A45",
    textSecondary: "#557F7A",
    pageBackground: "linear-gradient(180deg, #f2fbf9 0%, #ddf2ee 100%)",
    heroBackground: "linear-gradient(135deg, rgba(31,122,116,0.96) 0%, rgba(17,79,74,0.92) 58%, rgba(107,201,180,0.38) 100%)",
    cardBackground: "rgba(246, 255, 252, 0.95)",
    cardBorder: "rgba(31, 122, 116, 0.16)",
    typeStyle: "活力出行"
  },
  annual: {
    key: "annual",
    label: "年会",
    icon: "年",
    color: "#2D56B3",
    accent: "#80A6FF",
    soft: "#F2F6FF",
    deep: "#18315E",
    textPrimary: "#20385F",
    textSecondary: "#667FA9",
    pageBackground: "linear-gradient(180deg, #f4f7ff 0%, #e1e9ff 100%)",
    heroBackground: "linear-gradient(135deg, rgba(45,86,179,0.97) 0%, rgba(28,53,118,0.94) 58%, rgba(128,166,255,0.36) 100%)",
    cardBackground: "rgba(248, 250, 255, 0.96)",
    cardBorder: "rgba(45, 86, 179, 0.16)",
    typeStyle: "科技盛典"
  },
  birthday: {
    key: "birthday",
    label: "生日宴",
    icon: "生",
    color: "#A43DB8",
    accent: "#F39AD9",
    soft: "#FFF0FA",
    deep: "#62246F",
    textPrimary: "#682C74",
    textSecondary: "#946C9F",
    pageBackground: "linear-gradient(180deg, #fff6fb 0%, #fbe6f6 100%)",
    heroBackground: "linear-gradient(135deg, rgba(164,61,184,0.96) 0%, rgba(118,41,133,0.92) 58%, rgba(243,154,217,0.38) 100%)",
    cardBackground: "rgba(255, 247, 253, 0.96)",
    cardBorder: "rgba(164, 61, 184, 0.15)",
    typeStyle: "轻甜派对"
  },
  other: {
    key: "other",
    label: "其他",
    icon: "活动",
    color: "#5C6574",
    accent: "#B8C0D0",
    soft: "#F5F7FA",
    deep: "#38414E",
    textPrimary: "#3E4651",
    textSecondary: "#748090",
    pageBackground: "linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)",
    heroBackground: "linear-gradient(135deg, rgba(92,101,116,0.96) 0%, rgba(56,65,78,0.92) 58%, rgba(184,192,208,0.34) 100%)",
    cardBackground: "rgba(255, 255, 255, 0.95)",
    cardBorder: "rgba(92, 101, 116, 0.14)",
    typeStyle: "通用活动"
  }
};

const BUILTIN_EVENT_TYPES = Object.values(EVENT_TYPE_THEMES);

function getEventTheme(input) {
  if (!input) {
    return EVENT_TYPE_THEMES.other;
  }

  if (typeof input === "string") {
    return EVENT_TYPE_THEMES[input] || EVENT_TYPE_THEMES.other;
  }

  const base = EVENT_TYPE_THEMES[input.typeKey || input.key] || EVENT_TYPE_THEMES.other;
  return {
    ...base,
    color: input.themeColor || input.color || base.color,
    label: input.typeLabel || input.label || base.label
  };
}

module.exports = {
  BUILTIN_EVENT_TYPES,
  EVENT_TYPE_THEMES,
  getEventTheme
};
