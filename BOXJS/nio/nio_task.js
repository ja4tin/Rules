/**
 * 蔚来全自动签到脚本
 */
const KEY_TOKEN = "nio_auth_token_surge_native";
const APP_NAME = "蔚来签到";

console.log("🚀 [蔚来签到脚本] 开始运行...");

if (typeof $request !== 'undefined') {
    // ==========================================
    // 间谍模式：抓取 Token
    // ==========================================
    console.log("🕵️ [抓包] 检测到匹配的蔚来网络请求...");
    const auth = $request.headers['Authorization'] || $request.headers['authorization'];
    
    if (auth) {
        console.log(`🔑 [抓包] 成功获取到 Token (开头): ${auth.substring(0, 20)}...`);
        const saveStatus = $persistentStore.write(auth, KEY_TOKEN);
        if (saveStatus) {
            console.log("💾 [抓包] Token 已成功持久化保存至 Surge 数据库！");
            $notification.post(APP_NAME, "✅ 自动抓取成功", "最新 Token 已入库，将用于每日自动执行");
        } else {
            console.log("❌ [抓包] 写入 Surge 数据库失败！");
        }
    } else {
        console.log("⚠️ [抓包] 在请求头中未找到 Authorization 字段，跳过。");
    }
    $done({});

} else {
    // ==========================================
    // 打工人模式：执行任务
    // ==========================================
    console.log("👷 [任务] 触发定时/手动执行...");
    let token = "";
    
    // 清除 Surge 参数替换时可能带入的首尾双引号
    let manualToken = typeof $argument !== 'undefined' ? $argument : "";
    manualToken = manualToken.replace(/^"|"$/g, ""); 
    
    const autoToken = $persistentStore.read(KEY_TOKEN);

    if (manualToken && manualToken.includes("Bearer")) {
        token = manualToken;
        console.log("🟢 [数据源] 使用：模块面板手动填写的 Token 参数");
    } else if (autoToken && autoToken.includes("Bearer")) {
        token = autoToken;
        console.log("🟢 [数据源] 使用：Surge 数据库自动抓取的 Token 缓存");
    }

    if (!token) {
        console.log("❌ [错误] 致命错误：未找到有效的 Token 供执行使用。");
        $notification.post(APP_NAME, "❌ 任务失败", "未找到 Token。请进入蔚来 App 自动抓取，或长按模块“编辑参数”填入");
        $done();
    } else {
        console.log("✅ [任务] 准备就绪，开始向蔚来服务器发送请求...");
        runCheckIn(token);
    }
}

// ==========================================
// 任务 1：每日签到
// ==========================================
function runCheckIn(token) {
    console.log("▶️ [签到] 发送签到请求...");
    const req = {
        url: `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`,
        headers: { 'Authorization': token, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)' },
        body: 'event=checkin'
    };
    
    $httpClient.post(req, (err, resp, data) => {
        let checkInStatus = "未知";
        if (err) {
            console.log("❌ [签到] 网络请求失败: " + err);
        } else {
            console.log("⬇️ [签到] 服务器返回响应: " + data);
            try {
                const res = JSON.parse(data);
                if (res.code === 0 || res.result === 'success') checkInStatus = "✅ 成功";
                else if (data.includes("已签到") || res.code === 4001) checkInStatus = "ℹ️ 已打卡";
                else checkInStatus = `⚠️ 异常 (${res.message || "未知"})`;
            } catch (e) { 
                checkInStatus = "❌ 解析失败"; 
                console.log("❌ [签到] JSON 解析失败");
            }
        }
        runMallTask(token, checkInStatus);
    });
}

// ==========================================
// 任务 2：浏览商城 (Task ID: 7403)
// ==========================================
function runMallTask(token, checkInStatus) {
    console.log("▶️ [商城] 发送浏览商城任务请求...");
    const req = {
        url: `https://gateway-front-external.nio.com/moat/10086/n/a/app/bs/csd-task/in/v2/welfare/task/schedule?app_id=10086`,
        headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)' },
        body: JSON.stringify({ "task_record_ids": ["7403"] })
    };
    
    $httpClient.post(req, (err, resp, data) => {
        let mallStatus = "未知";
        if (err) {
            console.log("❌ [商城] 网络请求失败: " + err);
        } else {
            console.log("⬇️ [商城] 服务器返回响应: " + data);
            try {
                const res = JSON.parse(data);
                if (res.result_code === 'success') mallStatus = "✅ 成功获得积分";
                else if (data.includes("finished") || data.includes("上限")) mallStatus = "ℹ️ 任务已达上限";
                else mallStatus = `⚠️ 异常 (${res.message || "未知"})`;
            } catch (e) { 
                mallStatus = "❌ 解析失败";
                console.log("❌ [商城] JSON 解析失败");
            }
        }
        
        console.log("🎉 [完成] 所有任务流执行完毕。");
        $notification.post(APP_NAME, "🎉 每日任务完毕", `【签到】: ${checkInStatus}\n【商城】: ${mallStatus}`);
        $done();
    });
}