const LOCAL_EVENTS_KEY = "localEvents";
const LOCAL_CUSTOM_TYPES_KEY = "localCustomEventTypes";
const LOCAL_IMPORT_JOBS_KEY = "localImportJobs";
const LOCAL_EVENT_PREVIEW_KEY = "localEventPreviewDraft";
const LOCAL_GUEST_SEATS_KEY = "localGuestSeats";
const LOCAL_EVENT_EDIT_DRAFT_KEY = "localEventEditDraft";

function readList(key) {
  return wx.getStorageSync(key) || [];
}

function writeList(key, value) {
  wx.setStorageSync(key, value || []);
}

function createLocalEvent(type) {
  const now = Date.now();
  return {
    eventId: `local-event-${now}`,
    ownerUserId: "local-owner",
    typeKey: type.key,
    typeLabel: type.label,
    name: `${type.label}活动`,
    title: type.label,
    subtitle: "欢迎入席 · 输入姓名查询座位",
    themeColor: type.color,
    status: "draft",
    shareTemplateKey: "golden",
    backgroundImageFileId: "",
    backgroundTempUrl: "",
    sharePosterFileId: "",
    guestCount: 0,
    tableCount: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    isLocalMockEvent: true
  };
}

function getLocalEvents() {
  return readList(LOCAL_EVENTS_KEY);
}

function saveLocalEvents(events) {
  writeList(LOCAL_EVENTS_KEY, events);
}

function addLocalEvent(event) {
  const events = getLocalEvents();
  events.unshift(event);
  saveLocalEvents(events);
  return event;
}

function updateLocalEvent(eventId, patch) {
  const events = getLocalEvents();
  const nextEvents = events.map(item => {
    if (item.eventId !== eventId) {
      return item;
    }
    return {
      ...item,
      ...patch,
      updatedAt: Date.now()
    };
  });
  saveLocalEvents(nextEvents);
  return nextEvents.find(item => item.eventId === eventId) || null;
}

function getLocalEventById(eventId) {
  return getLocalEvents().find(item => item.eventId === eventId) || null;
}

function removeLocalEvent(eventId) {
  const events = getLocalEvents().filter(item => item.eventId !== eventId);
  saveLocalEvents(events);
}

function saveLocalCustomTypes(list) {
  writeList(LOCAL_CUSTOM_TYPES_KEY, list);
}

function getLocalCustomTypes() {
  return readList(LOCAL_CUSTOM_TYPES_KEY);
}

function addLocalCustomType(type) {
  const list = getLocalCustomTypes();
  const next = [
    {
      key: `local-type-${Date.now()}`,
      label: type.name,
      color: type.color || "#b62438",
      icon: "自定义"
    },
    ...list
  ];
  saveLocalCustomTypes(next);
  return next;
}

function saveLocalImportJob(job) {
  const jobs = readList(LOCAL_IMPORT_JOBS_KEY);
  const nextJobs = [job, ...jobs.filter(item => item.eventId !== job.eventId)];
  writeList(LOCAL_IMPORT_JOBS_KEY, nextJobs);
}

function getLocalImportJob(eventId, sourceFileId) {
  const jobs = readList(LOCAL_IMPORT_JOBS_KEY);
  return jobs.find(item => item.eventId === eventId && item.sourceFileId === sourceFileId) || null;
}

function saveLocalEventPreviewDraft(eventId, eventData) {
  const drafts = wx.getStorageSync(LOCAL_EVENT_PREVIEW_KEY) || {};
  drafts[eventId] = eventData;
  wx.setStorageSync(LOCAL_EVENT_PREVIEW_KEY, drafts);
}

function getLocalEventPreviewDraft(eventId) {
  const drafts = wx.getStorageSync(LOCAL_EVENT_PREVIEW_KEY) || {};
  return drafts[eventId] || null;
}

function saveLocalEventEditDraft(eventId, eventData) {
  const drafts = wx.getStorageSync(LOCAL_EVENT_EDIT_DRAFT_KEY) || {};
  drafts[eventId] = eventData;
  wx.setStorageSync(LOCAL_EVENT_EDIT_DRAFT_KEY, drafts);
}

function getLocalEventEditDraft(eventId) {
  const drafts = wx.getStorageSync(LOCAL_EVENT_EDIT_DRAFT_KEY) || {};
  return drafts[eventId] || null;
}

function clearLocalEventEditDraft(eventId) {
  const drafts = wx.getStorageSync(LOCAL_EVENT_EDIT_DRAFT_KEY) || {};
  if (drafts[eventId]) {
    delete drafts[eventId];
    wx.setStorageSync(LOCAL_EVENT_EDIT_DRAFT_KEY, drafts);
  }
}

function saveLocalGuestSeats(eventId, seats) {
  const bucket = wx.getStorageSync(LOCAL_GUEST_SEATS_KEY) || {};
  bucket[eventId] = seats || [];
  wx.setStorageSync(LOCAL_GUEST_SEATS_KEY, bucket);
}

function getLocalGuestSeats(eventId) {
  const bucket = wx.getStorageSync(LOCAL_GUEST_SEATS_KEY) || {};
  return bucket[eventId] || [];
}

module.exports = {
  createLocalEvent,
  getLocalEvents,
  saveLocalEvents,
  addLocalEvent,
  updateLocalEvent,
  getLocalEventById,
  removeLocalEvent,
  getLocalCustomTypes,
  addLocalCustomType,
  saveLocalImportJob,
  getLocalImportJob,
  saveLocalEventPreviewDraft,
  getLocalEventPreviewDraft,
  saveLocalEventEditDraft,
  getLocalEventEditDraft,
  clearLocalEventEditDraft,
  saveLocalGuestSeats,
  getLocalGuestSeats
};
