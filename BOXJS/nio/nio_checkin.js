/*
 * 蔚来 App 自动签到脚本
 * 1. 自动抓取：开启模块后，进入蔚来 App 签到页面即可自动获取 Token。
 * 2. 自动签到：每天根据 Cron 表达式自动运行。
 */

const $ = new Env("蔚来签到");
const tokenKey = "nio_auth_token_surge";

// ==========================================
// 1. 逻辑分发：判断是【抓取模式】还是【签到模式】
// ==========================================

if (typeof $request !== 'undefined') {
  // --- 抓取模式 (由 Rewrite/http-request 触发) ---
  getToken();
} else {
  // --- 签到模式 (由 Cron/手动运行 触发) ---
  runCheckin();
}

// ==========================================
// 2. 核心功能函数
// ==========================================

// 获取并保存 Token
function getToken() {
  const auth = $request.headers['Authorization'] || $request.headers['authorization'];
  if (auth && auth.includes("Bearer")) {
    const success = $.setdata(auth, tokenKey);
    if (success) {
      $.msg($.name, "✅ Token 获取成功", "数据已存入 Surge 持久化存储，可关闭抓包。");
      $.log(`[Token 获取成功]: ${auth}`);
    }
  }
  $.done();
}

// 执行签到请求
function runCheckin() {
  const token = $.getdata(tokenKey);
  
  if (!token) {
    $.msg($.name, "❌ 签到失败", "本地无 Token。请先开启抓包并进入蔚来 App 签到页面。");
    $.done();
    return;
  }

  const checkinRequest = {
    url: `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)'
    },
    body: 'event=checkin'
  };

  $.post(checkinRequest, (error, response, data) => {
    try {
      if (error) throw new Error(error);
      
      const res = JSON.parse(data);
      $.log(`[响应数据]: ${data}`);

      // 状态判断：根据蔚来 API 常见返回码
      if (res.code === 0 || res.result === 'success') {
        $.msg($.name, "✅ 签到成功", `记得明天再来哦！`);
      } else if (data.includes("已签到") || res.code === 4001) {
        $.msg($.name, "ℹ️ 重复签到", "今天已经打过卡了，无需重复执行。");
      } else if (res.code === 401) {
        $.msg($.name, "❌ Token 失效", "身份验证过期，请重新进入 App 抓取。");
      } else {
        $.msg($.name, "⚠️ 签到异常", `错误信息: ${res.message || '未知反馈'}`);
      }
    } catch (e) {
      $.msg($.name, "❌ 请求故障", `网络请求或解析失败: ${e.message}`);
    } finally {
      $.done();
    }
  });
}

// ==========================================
// 3. Surge 环境适配库 (Env.js)
// ==========================================

function Env(name) {
  return new class {
    constructor(name) {
      this.name = name;
      this.log(`--- [开始执行] ${this.name} ---`);
    }
    // 读取数据
    getdata(key) {
      return $persistentStore.read(key);
    }
    // 写入数据
    setdata(val, key) {
      return $persistentStore.write(val, key);
    }
    // 发送通知
    msg(title, subtitle, body) {
      $notification.post(title, subtitle, body);
    }
    // 打印日志
    log(msg) {
      console.log(msg);
    }
    // POST 请求
    post(opts, callback) {
      $httpClient.post(opts, callback);
    }
    // 结束脚本
    done(val = {}) {
      $done(val);
    }
  }(name);
}