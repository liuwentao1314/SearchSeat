function chooseMessageFile(options) {
  return new Promise((resolve, reject) => {
    wx.chooseMessageFile({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function chooseMedia(options) {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function cloudUploadFile(options) {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function downloadFile(options) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function saveImageToPhotosAlbum(options) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function getImageInfo(options) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function canvasToTempFilePath(options, context) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      ...options,
      success: resolve,
      fail: reject
    }, context);
  });
}

module.exports = {
  chooseMessageFile,
  chooseMedia,
  cloudUploadFile,
  downloadFile,
  saveImageToPhotosAlbum,
  getImageInfo,
  canvasToTempFilePath
};
