Component({
  properties: {
    title: {
      type: String,
      value: "登录后继续"
    },
    desc: {
      type: String,
      value: "登录后即可创建活动、保存配置并查看活动。"
    },
    buttonText: {
      type: String,
      value: "微信登录"
    }
  },

  methods: {
    onGetUserProfile() {
      this.triggerEvent("success", null);
    }
  }
});
