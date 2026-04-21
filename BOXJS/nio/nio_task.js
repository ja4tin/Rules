/**
 * 蔚来全自动任务 (Surge 原生版)
 * 包含：自动抓取 Token、每日签到、浏览商城任务
 */
const KEY_TOKEN = "nio_auth_token_surge_native";
const APP_NAME = "蔚来全自动任务";

// --- 逻辑分发中心 ---
if (typeof $request !== 'undefined') {
    // 【间谍模式】：由 http-request 触发，负责抓取 Token
    const auth = $request.headers['Authorization'] || $request.headers['authorization'];
    if (auth) {
        const isSuccess = $persistentStore.write(auth, KEY_TOKEN);
        if (isSuccess) {
            $notification.post(APP_NAME, "✅ Token 抓取成功", "数据已存入 Surge，明早 8:30 将自动执行任务");
        }
    }
    $done({});
} else {
    // 【打工人模式】：由 cron 定时任务或手动运行触发，负责干活
    const token = $persistentStore.read(KEY_TOKEN);
    if (!token) {
        $notification.post(APP_NAME, "❌ 任务失败", "未找到 Token，请先开启 MITM 并前往蔚来 App 签到页面抓取");
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
        headers: {
            'Authorization': token,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)'
        },
        body: 'event=checkin'
    };
    
    $httpClient.post(req, (err, resp, data) => {
        let checkInStatus = "未知";
        if (!err) {
            try {
                const res = JSON.parse(data);
                if (res.code === 0 || res.result === 'success') {
                    checkInStatus = "✅ 成功";
                } else if (data.includes("已签到") || res.code === 4001) {
                    checkInStatus = "ℹ️ 已打卡";
                } else {
                    checkInStatus = `⚠️ 异常 (${res.message || "未知"})`;
                }
            } catch (e) {
                checkInStatus = "❌ 解析失败";
            }
        }
        // 签到完毕，流转到商城任务
        runMallTask(token, checkInStatus);
    });
}

// ==========================================
// 任务 2：浏览商城 (Task ID: 7403)
// ==========================================
function runMallTask(token, checkInStatus) {
    const req = {
        url: `https://gateway-front-external.nio.com/moat/10086/n/a/app/bs/csd-task/in/v2/welfare/task/schedule?app_id=10086`,
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
            'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)'
        },
        body: JSON.stringify({ "task_record_ids": ["7403"] })
    };
    
    $httpClient.post(req, (err, resp, data) => {
        let mallStatus = "未知";
        if (!err) {
            try {
                const res = JSON.parse(data);
                if (res.result_code === 'success') {
                    mallStatus = "✅ 成功获得积分";
                } else if (data.includes("finished") || data.includes("上限")) {
                    mallStatus = "ℹ️ 任务已达上限";
                } else {
                    mallStatus = `⚠️ 异常 (${res.message || "未知"})`;
                }
            } catch (e) {
                mallStatus = "❌ 解析失败";
            }
        }
        
        // 任务全部结束，发送最终通知
        $notification.post(APP_NAME, "🎉 每日任务执行完毕", `【每日签到】: ${checkInStatus}\n【浏览商城】: ${mallStatus}`);
        $done();
    });
}