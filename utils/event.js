const DEFAULT_POSTER_TEMPLATES = [
  { key: "golden", label: "鎏金礼帖" },
  { key: "blossom", label: "花宴海报" },
  { key: "clean", label: "简雅留白" }
];

function normalizeEventTitle(title) {
  return String(title || "").replace(/找座/g, "").trim();
}

function createDefaultEventDraft(type) {
  const now = Date.now();
  return {
    name: `${type.label}活动`,
    title: type.label,
    subtitle: "欢迎入席 · 输入姓名查询座位",
    themeColor: type.color,
    typeKey: type.key,
    typeLabel: type.label,
    status: "draft",
    shareTemplateKey: DEFAULT_POSTER_TEMPLATES[0].key,
    backgroundImageFileId: "",
    guestCount: 0,
    tableCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

function getStatusMeta(status) {
  if (status === "published") {
    return { className: "badge badge-published", label: "已发布" };
  }

  if (status === "archived") {
    return { className: "badge badge-archived", label: "已归档" };
  }

  return { className: "badge badge-draft", label: "草稿" };
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "--";
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

module.exports = {
  DEFAULT_POSTER_TEMPLATES,
  normalizeEventTitle,
  createDefaultEventDraft,
  getStatusMeta,
  formatTimestamp
};
