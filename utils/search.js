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

function buildSearchIndex(list) {
  return (list || []).map(item => {
    const normalizedName = normalizeGuestName(item.guestNameRaw);
    return {
      ...item,
      guestNameNormalized: normalizedName,
      guestNamePinyin: item.guestNamePinyin || toPlainPinyin(normalizedName)
    };
  });
}

function findGuestsByInput(list, inputRaw) {
  const normalizedInput = normalizeGuestName(inputRaw);
  const inputPinyin = toPlainPinyin(normalizedInput);
  const safeList = buildSearchIndex(list);

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

module.exports = {
  normalizeGuestName,
  toPlainPinyin,
  buildSearchIndex,
  findGuestsByInput
};
