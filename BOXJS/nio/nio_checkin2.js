/* 蔚来：签到 + 自动浏览商城任务 (BoxJS 版) */
const $ = new Env("蔚来自动任务");
const key = "nio_auth_token"; // 保持原有的 token key 不变

const token = $.getdata(key);

if (!token) {
    $.msg($.name, "❌ 执行失败", "请先在 BoxJs 界面填入或抓取 Token");
    $.done();
} else {
    // 启动任务流：先签到 -> 再逛商城
    runCheckIn();
}

// ==========================================
// 任务 1：每日签到
// ==========================================
function runCheckIn() {
    $.post({
        url: `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`,
        headers: { 
            'Authorization': token, 
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)' 
        },
        body: 'event=checkin'
    }, (err, resp, data) => {
        let checkInStatus = "未知";
        if (!err) {
            try {
                const res = JSON.parse(data);
                if (res.code === 0 || res.result === 'success') {
                    checkInStatus = "✅ 成功";
                } else if (data.includes("已签到") || res.code === 4001) {
                    checkInStatus = "ℹ️ 已打卡";
                } else {
                    checkInStatus = "⚠️ 异常 (" + (res.message || "未知") + ")";
                }
            } catch (e) {
                checkInStatus = "❌ 解析失败";
            }
        }
        // 签到完成后，无论成功失败，都继续执行浏览商城任务
        runMallTask(checkInStatus);
    });
}

// ==========================================
// 任务 2：浏览商城 (Task ID: 7403)
// ==========================================
function runMallTask(checkInStatus) {
    $.post({
        url: `https://gateway-front-external.nio.com/moat/10086/n/a/app/bs/csd-task/in/v2/welfare/task/schedule?app_id=10086`,
        headers: { 
            'Authorization': token, 
            'Content-Type': 'application/json', // 这里是 JSON 格式
            'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)' 
        },
        body: JSON.stringify({
            "task_record_ids": ["7403"]
        })
    }, (err, resp, data) => {
        let mallStatus = "未知";
        if (!err) {
            try {
                const res = JSON.parse(data);
                if (res.result_code === 'success') {
                    mallStatus = "✅ 成功获得积分";
                } else if (data.includes("finished") || data.includes("上限")) {
                    mallStatus = "ℹ️ 任务已达上限";
                } else {
                    mallStatus = "⚠️ 异常 (" + (res.message || "未知状态") + ")";
                }
            } catch (e) {
                mallStatus = "❌ 解析失败";
            }
        }
        
        // 任务全部结束，发送最终汇总通知
        $.msg($.name, "🎉 每日任务执行完毕", `【每日签到】: ${checkInStatus}\n【浏览商城】: ${mallStatus}`);
        $.done();
    });
}

// ==========================================
// Surge / BoxJS 环境适配库
// ==========================================
function Env(t){return new class{constructor(t){this.name=t}getdata(t){return $persistentStore.read(t)}setdata(t,e){return $persistentStore.write(t,e)}msg(t,e,s){$notification.post(t,e,s)}post(t,e){$httpClient.post(t,e)}done(t={}){$done(t)}}(t)}