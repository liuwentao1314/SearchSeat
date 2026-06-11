const cloud = require("wx-server-sdk");
const XLSX = require("xlsx");
const util = require("util");

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

  const parsed = [];
  rows.forEach((row, index) => {
    const tableLabel = String(row[0] || "").trim();
    const names = row
      .slice(1)
      .map(item => String(item || "").trim())
      .filter(Boolean);
    if (!tableLabel || !names.length) {
      return;
    }
    parsed.push({
      tableLabel,
      guests: names.map((name, sortOrder) => ({
        guestNameRaw: name,
        guestNameNormalized: normalizeGuestName(name),
        guestNamePinyin: toPlainPinyin(name),
        sortOrder: index * 100 + sortOrder
      }))
    });
  });
  return parsed;
}

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
  console.log("commitGuestImport version", "2026-06-04T15:35-serial-write");
  console.log("commitGuestImport start", {
    eventId: event.eventId,
    hasSourceFileId: Boolean(event.sourceFileId)
  });
  const jobs = await db.collection("importJobs")
    .where({
      eventId: event.eventId,
      sourceFileId: event.sourceFileId
    })
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!jobs.data.length) {
    throw new Error("找不到导入预览，请重新上传");
  }

  const job = jobs.data[0];
  const file = await cloud.downloadFile({
    fileID: event.sourceFileId
  });
  if (!file || !file.fileContent) {
    throw new Error("文件读取失败");
  }

  const parsedRows = parseRowsFromBuffer(file.fileContent);
  if (!parsedRows.length) {
    throw new Error("没有可导入的数据");
  }

  try {
    console.log("commitGuestImport parsed rows", {
      tableCount: parsedRows.length
    });

    const oldSeats = await db.collection("guestSeats").where({
      eventId: event.eventId
    }).get();

    console.log("commitGuestImport old seats", {
      count: oldSeats.data.length
    });

    for (const item of oldSeats.data) {
      await db.collection("guestSeats").doc(item._id).remove();
    }

    let guestCount = 0;
    for (const row of parsedRows) {
      for (const guest of row.guests) {
        guestCount += 1;
        await db.collection("guestSeats").add({
          data: {
            eventId: event.eventId,
            tableLabel: row.tableLabel,
            guestNameRaw: guest.guestNameRaw,
            guestNameNormalized: guest.guestNameNormalized,
            guestNamePinyin: guest.guestNamePinyin,
            sortOrder: guest.sortOrder
          }
        });
      }
    }

    console.log("commitGuestImport inserted seats", {
      guestCount
    });

    await db.collection("events").doc(event.eventId).update({
      data: {
        guestCount,
        tableCount: parsedRows.length,
        updatedAt: Date.now()
      }
    });

    console.log("commitGuestImport updated event", {
      guestCount,
      tableCount: parsedRows.length
    });

    await db.collection("importJobs").doc(job._id).update({
      data: {
        status: "committed"
      }
    });

    console.log("commitGuestImport marked job committed", {
      jobId: job._id
    });

    return {
      ok: true,
      guestCount,
      tableCount: parsedRows.length,
      seats: parsedRows.flatMap(row => row.guests.map(guest => ({
        eventId: event.eventId,
        tableLabel: row.tableLabel,
        guestNameRaw: guest.guestNameRaw,
        guestNameNormalized: guest.guestNameNormalized,
        guestNamePinyin: guest.guestNamePinyin,
        sortOrder: guest.sortOrder
      })))
    };
  } catch (error) {
    console.error("commitGuestImport failed detail", stringifyError(error));
    console.error("commitGuestImport failed raw", error);
    throw new Error(`导入写入失败：${stringifyError(error)}`);
  }
};
