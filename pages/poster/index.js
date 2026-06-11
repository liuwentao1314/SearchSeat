const { callFunction } = require("../../utils/cloud");
const { normalizeEventTitle } = require("../../utils/event");
const { getStoredUser } = require("../../utils/auth");
const { getLocalEventById } = require("../../utils/local-store");
const { getImageInfo, canvasToTempFilePath, saveImageToPhotosAlbum } = require("../../utils/wxapi");

Page({
  data: {
    eventId: "",
    posterUrl: "",
    event: null,
    qrCodeTempUrl: "",
    posterTempPath: "",
    warning: "",
    qrCodeEnabled: true,
    canvasWidth: 720,
    canvasHeight: 1280
  },

  wrapTextCenter(ctx, text, maxWidth, centerX, startY, lineHeight, maxLines) {
    if (!text) {
      return startY;
    }

    const chars = String(text).split("");
    let line = "";
    let lineCount = 0;
    let currentY = startY;
    let hasMore = false;

    for (let index = 0; index < chars.length; index += 1) {
      const testLine = line + chars[index];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, centerX, currentY);
        line = chars[index];
        currentY += lineHeight;
        lineCount += 1;
        if (maxLines && lineCount >= maxLines) {
          hasMore = index < chars.length - 1;
          line = "";
          break;
        }
      } else {
        line = testLine;
      }
    }

    if (line) {
      let output = line;
      if (hasMore) {
        while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) {
          output = output.slice(0, -1);
        }
        output = `${output}…`;
      }
      ctx.fillText(output, centerX, currentY);
      currentY += lineHeight;
    }

    return currentY;
  },

  topRoundRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  },

  roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + width, y + height - r);
    ctx.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + height);
    ctx.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  },

  fillRoundRect(ctx, x, y, width, height, radius, color) {
    this.roundedRectPath(ctx, x, y, width, height, radius);
    if (color) {
      ctx.setFillStyle(color);
    }
    ctx.fill();
  },

  strokeRoundRect(ctx, x, y, width, height, radius, color, lineWidth) {
    this.roundedRectPath(ctx, x, y, width, height, radius);
    if (color) {
      ctx.setStrokeStyle(color);
    }
    if (lineWidth) {
      ctx.setLineWidth(lineWidth);
    }
    ctx.stroke();
  },

  async drawHeaderRegion(ctx, cardX, cardY, cardWidth, headerHeight, radius, drawer) {
    ctx.save();
    this.topRoundRectPath(ctx, cardX, cardY, cardWidth, headerHeight, radius);
    ctx.clip();
    await drawer();
    ctx.restore();
  },

  async onLoad(query) {
    if (!getStoredUser()) {
      wx.reLaunch({
        url: "/pages/home/index"
      });
      return;
    }
    this.setData({
      eventId: query.eventId || ""
    });
    await this.preparePoster();
  },

  async fetchPosterEvent() {
    try {
      const result = await callFunction("getEventDetail", {
        eventId: this.data.eventId
      }, {
        timeoutMs: 10000,
        allowFallback: true,
        fallback: () => {
          const localEvent = getLocalEventById(this.data.eventId);
          if (!localEvent) {
            throw new Error("活动不存在");
          }
          return { event: localEvent };
        }
      });
      return result.event;
    } catch (error) {
      const localEvent = getLocalEventById(this.data.eventId);
      if (localEvent) {
        return localEvent;
      }
      throw error;
    }
  },

  async fetchPosterAssets() {
    try {
      return await callFunction("generateEventShareAssets", {
        eventId: this.data.eventId
      }, {
        timeoutMs: 12000,
        allowFallback: true,
        fallback: () => ({
          qrCodeFileId: "",
          qrCodeTempUrl: "",
          qrCodeEnabled: false,
          warning: "小程序码生成超时，已生成无二维码海报预览。"
        })
      });
    } catch (error) {
      return {
        qrCodeFileId: "",
        qrCodeTempUrl: "",
        qrCodeEnabled: false,
        warning: "小程序码生成失败，已生成无二维码海报预览。"
      };
    }
  },

  async preparePoster() {
    try {
      wx.showLoading({ title: "生成中" });
      const event = await this.fetchPosterEvent();
      const posterResult = await this.fetchPosterAssets();

      this.setData({
        event,
        qrCodeTempUrl: posterResult.qrCodeTempUrl || "",
        warning: posterResult.warning || "",
        qrCodeEnabled: posterResult.qrCodeEnabled !== false
      });
      await this.drawPoster();
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || "海报生成失败",
        icon: "none"
      });
    }
  },

  async drawPoster() {
    const ctx = wx.createCanvasContext("posterCanvas", this);
    const event = this.data.event || {};
    const themeColor = event.themeColor || "#b62438";
    const title = normalizeEventTitle(event.title) || event.name || "活动邀请";
    const subtitle = event.subtitle || "欢迎入席 · 输入姓名查询座位";
    const backgroundUrl = event.backgroundTempUrl || event.backgroundPreviewUrl || "";
    const qrCodeUrl = this.data.qrCodeTempUrl;
    const width = this.data.canvasWidth;
    const height = this.data.canvasHeight;
    const cardX = 52;
    const cardY = 70;
    const cardWidth = width - cardX * 2;
    const cardHeight = height - cardY * 2;
    const cardRadius = 34;
    const headerHeight = 360;
    const headerCenterY = cardY + headerHeight / 2;

    ctx.setFillStyle("#f4ecdf");
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.setShadow(0, 12, 28, "rgba(71, 26, 17, 0.16)");
    this.fillRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, "#ffffff");
    ctx.restore();

    await this.drawHeaderRegion(ctx, cardX, cardY, cardWidth, headerHeight, cardRadius, async () => {
      if (backgroundUrl) {
        try {
          const bg = await getImageInfo({ src: backgroundUrl });
          ctx.drawImage(bg.path, cardX, cardY, cardWidth, headerHeight);
        } catch (error) {
          ctx.setFillStyle(themeColor);
          ctx.fillRect(cardX, cardY, cardWidth, headerHeight);
        }
      } else {
        ctx.setFillStyle(themeColor);
        ctx.fillRect(cardX, cardY, cardWidth, headerHeight);
      }

      ctx.setFillStyle("rgba(0, 0, 0, 0.28)");
      ctx.fillRect(cardX, cardY, cardWidth, headerHeight);
    });

    ctx.setFillStyle("#fef8ea");
    ctx.setTextAlign("center");
    ctx.setFontSize(48);
    ctx.fillText(title, width / 2, headerCenterY - 42);
    ctx.setFontSize(26);
    this.wrapTextCenter(ctx, subtitle, cardWidth - 96, width / 2, headerCenterY + 6, 36, 3);

    const bodyY = cardY + headerHeight;
    const bodyHeight = cardHeight - headerHeight;
    ctx.setFillStyle("#ffffff");
    ctx.fillRect(cardX, bodyY, cardWidth, bodyHeight);
    this.fillRoundRect(ctx, cardX + 42, bodyY + 20, cardWidth - 84, bodyHeight - 62, 28, "#f6f0e7");

    ctx.setFillStyle("#7a2231");
    ctx.setTextAlign("left");
    ctx.setFontSize(30);
    ctx.fillText("扫码进入活动页", cardX + 76, bodyY + 76);
    ctx.setFillStyle("#856b59");
    ctx.setFontSize(22);
    ctx.fillText("登录后输入姓名即可查询座位", cardX + 76, bodyY + 118);

    const qrBoxSize = 250;
    const qrBoxX = width / 2 - qrBoxSize / 2;
    const qrBoxY = bodyY + 170;

    if (qrCodeUrl) {
      try {
        const qrCode = await getImageInfo({ src: qrCodeUrl });
        this.fillRoundRect(ctx, qrBoxX - 16, qrBoxY - 16, qrBoxSize + 32, qrBoxSize + 32, 24, "#ffffff");
        ctx.drawImage(qrCode.path, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      } catch (error) {
        this.fillRoundRect(ctx, qrBoxX - 16, qrBoxY - 16, qrBoxSize + 32, qrBoxSize + 32, 24, "#fff9ef");
        this.strokeRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22, themeColor, 4);
        ctx.setFillStyle(themeColor);
        ctx.setTextAlign("center");
        ctx.setFontSize(24);
        ctx.fillText("二维码加载失败", width / 2, qrBoxY + 120);
      }
    } else {
      this.fillRoundRect(ctx, qrBoxX - 16, qrBoxY - 16, qrBoxSize + 32, qrBoxSize + 32, 24, "#fff9ef");
      this.strokeRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22, themeColor, 4);
      ctx.setFillStyle(themeColor);
      ctx.setTextAlign("center");
      ctx.setFontSize(24);
      ctx.fillText("正式环境开启后", width / 2, qrBoxY + 90);
      ctx.fillText("这里会显示", width / 2, qrBoxY + 132);
      ctx.fillText("官方小程序码", width / 2, qrBoxY + 174);
    }

    const footerY = bodyY + bodyHeight - 92;
    ctx.setFillStyle(themeColor);
    ctx.setTextAlign("center");
    ctx.setFontSize(26);
    ctx.fillText("长按保存后即可分享给好友或群聊", width / 2, footerY);
    ctx.setFillStyle("#7f6552");
    ctx.setFontSize(22);
    ctx.fillText(event.name || "活动分享海报", width / 2, footerY + 44);

    await new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        setTimeout(async () => {
          try {
            const temp = await canvasToTempFilePath({
              canvasId: "posterCanvas",
              width,
              height,
              destWidth: width * 2,
              destHeight: height * 2
            }, this);

            this.setData({
              posterTempPath: temp.tempFilePath
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        }, 120);
      });
    });
  },

  async onSavePoster() {
    if (!this.data.posterTempPath) {
      return;
    }

    try {
      wx.showLoading({ title: "保存中" });
      await saveImageToPhotosAlbum({
        filePath: this.data.posterTempPath
      });
      wx.hideLoading();
      wx.showToast({
        title: "已保存到相册",
        icon: "success"
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || "保存失败",
        icon: "none"
      });
    }
  }
});
