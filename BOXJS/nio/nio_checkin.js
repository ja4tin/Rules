/*
蔚来自动签到脚本 - Surge 原生版
*/

const $ = new Env("蔚来签到");
const key = "nio_auth_token_surge";

// --- 逻辑判断：是抓取 Token 还是 执行签到 ---
if (typeof $request !== 'undefined') {
  // 1. 抓取模式 (Rewrite 触发)
  const auth = $request.headers['Authorization'] || $request.headers['authorization'];
  if (auth && $request.url.includes("checkin")) {
    $.setdata(auth, key);
    $.msg($.name, "✅ Token 获取成功", "已保存至 Surge 本地存储");
  }
  $.done();
} else {
  // 2. 签到模式 (Cron 触发)
  const token = $.getdata(key);
  if (!token) {
    $.msg($.name, "❌ 签到失败", "未找到 Token，请先打开蔚来 App 签到页面");
    $.done();
  } else {
    const checkinUrl = {
      url: `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)'
      },
      body: 'event=checkin'
    };

    $.post(checkinUrl, (error, response, data) => {
      try {
        if (error) throw new Error(error);
        const res = JSON.parse(data);
        if (res.code === 0 || res.result === 'success') {
          $.msg($.name, "✅ 签到成功", `结果: ${res.message || '打卡完成'}`);
        } else if (data.includes("已签到")) {
          $.msg($.name, "ℹ️ 重复签到", "今日已完成，无需重复操作");
        } else {
          $.msg($.name, "⚠️ 签到异常", res.message || "未知错误");
        }
      } catch (e) {
        $.msg($.name, "❌ 请求出错", e.message);
      } finally {
        $.done();
      }
    });
  }
}

// --- Surge 环境适配库 (Env.js) ---
function Env(t){return new class{constructor(t){this.name=t,this.isSurge="undefined"!=typeof $httpClient,this.log(this.name)}getdata(t){return $persistentStore.read(t)}setdata(t,e){return $persistentStore.write(t,e)}msg(t,e,s){$notification.post(t,e,s)}log(t){console.log(t)}post(t,e){$httpClient.post(t,e)}done(t={}){$done(t)}}(t)}