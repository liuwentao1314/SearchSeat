const cloud = require("wx-server-sdk");
const XLSX = require("xlsx");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

function normalizeGuestName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[（(]?\d+人[）)]?$/, "");
}

function toPlainPinyin(text) {
  return normalizeGuestName(text);
}

function parseRowsFromBuffer(buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    cellNF: false,
    cellText: false
  });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false
  });

  const warnings = [];
  const parsed = [];

  rows.forEach((row, index) => {
    const tableLabel = String(row[0] || "").trim();
    const names = row
      .slice(1)
      .map(item => String(item || "").trim())
      .filter(Boolean);
    if (!tableLabel) {
      warnings.push(`第 ${index + 1} 行缺少桌号，已跳过`);
      return;
    }
    if (!names.length) {
      warnings.push(`第 ${index + 1} 行没有宾客姓名，已跳过`);
      return;
    }
    parsed.push({
      tableLabel,
      names
    });
  });

  return {
    parsed,
    warnings
  };
}

exports.main = async (event) => {
  console.log("parseGuestExcel version", "2026-06-04T14:50-fix-syntax");
  const file = await cloud.downloadFile({
    fileID: event.sourceFileId
  });
  if (!file || !file.fileContent) {
    throw new Error("文件读取失败");
  }

  const { parsed, warnings } = parseRowsFromBuffer(file.fileContent);

  if (!parsed.length) {
    throw new Error("没有可导入的数据");
  }

  const tableCount = parsed.length;
  const guestCount = parsed.reduce((sum, row) => sum + row.names.length, 0);
  const existingJobs = await db.collection("importJobs")
    .where({
      eventId: event.eventId,
      sourceFileId: event.sourceFileId
    })
    .limit(1)
    .get();

  const previewData = {
    eventId: event.eventId,
    sourceFileId: event.sourceFileId,
    summary: {
      tableCount,
      guestCount,
      warnings
    },
    sampleRows: parsed.slice(0, 5).map(row => ({
      tableLabel: row.tableLabel,
      names: row.names.join("、")
    })),
    status: "parsed",
    createdAt: Date.now()
  };

  if (existingJobs.data.length) {
    await db.collection("importJobs").doc(existingJobs.data[0]._id).update({
      data: previewData
    });
  } else {
    await db.collection("importJobs").add({
      data: previewData
    });
  }

  return {
    tableCount,
    guestCount,
    warnings,
    sampleRows: previewData.sampleRows
  };
};
