/**
 * 蔚来全自动任务 (Surge 终极双保险版)
 * 逻辑：优先使用模块面板的手动参数 -> 其次使用自动抓取的持久化数据
 */
const KEY_TOKEN = "nio_auth_token_surge_native";
const APP_NAME = "蔚来签到";

if (typeof $request !== 'undefined') {
    // 【间谍模式】自动抓取 Token
    const auth = $request.headers['Authorization'] || $request.headers['authorization'];
    if (auth) {
        $persistentStore.write(auth, KEY_TOKEN);
        $notification.post(APP_NAME, "✅ 自动抓取成功", "最新 Token 已入库，将用于每日自动签到");
    }
    $done({});
} else {
    // 【读取Key_Token】执行任务
    let token = "";
    
    // 通道 A：读取模块面板的手动输入
    const manualToken = typeof $argument !== 'undefined' ? $argument : "";
    // 通道 B：读取间谍抓取的自动数据
    const autoToken = $persistentStore.read(KEY_TOKEN);

    // 【核心双保险逻辑】：手动填了就用手动的，手动没填就用自动的
    if (manualToken && manualToken.includes("Bearer")) {
        token = manualToken;
        console.log("使用来源：模块手动参数");
    } else if (autoToken && autoToken.includes("Bearer")) {
        token = autoToken;
        console.log("使用来源：Surge 自动抓取缓存");
    }

    if (!token) {
        $notification.post(APP_NAME, "❌ 任务失败", "未找到有效 Token。请进入蔚来 App 自动抓取，或在模块中手动填入。");
        $done();
    } else {
        runCheckIn(token);
    }
}

// ==========================================
// 任务 1：每日签到
// ==========================================
function runCheckIn(token) {
    const req = {
        url: `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`,
        headers: { 'Authorization': token, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)' },
        body: 'event=checkin'
    };
    $httpClient.post(req, (err, resp, data) => {
        let checkInStatus = "未知";
        if (!err) {
            try {
                const res = JSON.parse(data);
                if (res.code === 0 || res.result === 'success') checkInStatus = "✅ 成功";
                else if (data.includes("已签到") || res.code === 4001) checkInStatus = "ℹ️ 已打卡";
                else checkInStatus = `⚠️ 异常 (${res.message || "未知"})`;
            } catch (e) { checkInStatus = "❌ 解析失败"; }
        }
        runMallTask(token, checkInStatus);
    });
}

// ==========================================
// 任务 2：浏览商城 (Task ID: 7403)
// ==========================================
function runMallTask(token, checkInStatus) {
    const req = {
        url: `https://gateway-front-external.nio.com/moat/10086/n/a/app/bs/csd-task/in/v2/welfare/task/schedule?app_id=10086`,
        headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)' },
        body: JSON.stringify({ "task_record_ids": ["7403"] })
    };
    $httpClient.post(req, (err, resp, data) => {
        let mallStatus = "未知";
        if (!err) {
            try {
                const res = JSON.parse(data);
                if (res.result_code === 'success') mallStatus = "✅ 成功获得积分";
                else if (data.includes("finished") || data.includes("上限")) mallStatus = "ℹ️ 任务已达上限";
                else mallStatus = `⚠️ 异常 (${res.message || "未知"})`;
            } catch (e) { mallStatus = "❌ 解析失败"; }
        }
        $notification.post(APP_NAME, "🎉 每日任务完毕", `【签到】: ${checkInStatus}\n【商城】: ${mallStatus}`);
        $done();
    });
}