/**
 * 蔚来全自动签到任务
 */
const KEY_TOKEN = "nio_auth_token_surge_native";
const KEY_UA = "nio_user_agent_surge_native"; // 新增一个存放 UA 的仓库
const APP_NAME = "蔚来签到";

console.log("🚀 [蔚来脚本] 开始运行...");

if (typeof $request !== 'undefined') {
    console.log("🕵️ [抓包] 检测到匹配的蔚来网络请求...");
    const auth = $request.headers['Authorization'] || $request.headers['authorization'];
    // 提取实时 UA
    const ua = $request.headers['User-Agent'] || $request.headers['user-agent'];
    
    if (auth) {
        $persistentStore.write(auth, KEY_TOKEN);
        // 如果抓到 UA，也一保存
        if (ua) $persistentStore.write(ua, KEY_UA);
        
        console.log("💾 [抓包] Token 和 最新 UA 已成功保存！");
        $notification.post(APP_NAME, "✅ 自动抓取成功", "最新 Token 与设备 UA 已入库");
    }
    $done({});

} else {
    console.log("👷 [任务] 触发定时/手动执行...");
    let token = "";
    
    let manualToken = typeof $argument !== 'undefined' ? $argument : "";
    manualToken = manualToken.replace(/^"|"$/g, ""); 
    const autoToken = $persistentStore.read(KEY_TOKEN);
    // 读取存好的活 UA，如果没有，使用默认UA
    const liveUa = $persistentStore.read(KEY_UA) || 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)';

    if (manualToken && manualToken.includes("Bearer")) {
        token = manualToken;
    } else if (autoToken && autoToken.includes("Bearer")) {
        token = autoToken;
    }

    if (!token) {
        $notification.post(APP_NAME, "❌ 任务失败", "未找到 Token。请进入蔚来 App 自动抓取，或长按模块编辑参数填入");
        $done();
    } else {
        runCheckIn(token, liveUa);
    }
}

// ==========================================
// 任务：每日签到
// ==========================================
function runCheckIn(token, liveUa) {
    console.log("▶️ [签到] 发送签到请求，使用的 UA: " + liveUa);
    const req = {
        url: `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`,
        headers: { 
            'Authorization': token, 
            'Content-Type': 'application/x-www-form-urlencoded', 
            'User-Agent': liveUa // 这里不再写死，而是使用传进来的活参数
        },
        body: 'event=checkin'
    };
    
    $httpClient.post(req, (err, resp, data) => {
        let checkInStatus = "未知";
        if (err) {
            console.log("❌ [签到] 网络请求失败: " + err);
            checkInStatus = "❌ 网络失败";
        } else {
            console.log("⬇️ [签到] 服务器返回响应: " + data);
            try {
                const res = JSON.parse(data);
                if (res.code === 0 || res.result === 'success') checkInStatus = "✅ 签到成功";
                else if (data.includes("已签到") || res.code === 4001) checkInStatus = "ℹ️ 今日已签到";
                else checkInStatus = `⚠️ 异常 (${res.message || "未知"})`;
            } catch (e) { 
                checkInStatus = "❌ 解析失败"; 
            }
        }
        
        console.log("🎉 [完成] 签到流程执行完毕。");
        $notification.post(APP_NAME, "每日任务执行完毕", `【签到状态】: ${checkInStatus}`);
        $done();
    });
}