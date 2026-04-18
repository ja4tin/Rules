/*
 * 蔚来自动签到 (BoxJs 适配版)
 */
const $ = new Env("蔚来签到");
const key = "nio_auth_token";

// 逻辑分支
if (typeof $request !== 'undefined') {
    // 抓取逻辑
    const auth = $request.headers['Authorization'] || $request.headers['authorization'];
    if (auth && $request.url.includes("checkin")) {
        $.setdata(auth, key);
        $.msg($.name, "✅ Token 抓取成功", "数据已存入 BoxJs 对应的配置项中");
    }
    $.done();
} else {
    // 执行逻辑
    const token = $.getdata(key);
    if (!token) {
        $.msg($.name, "❌ 签到失败", "请先在 BoxJs 中配置 Token 或进行抓包");
        $.done();
    } else {
        const url = {
            url: `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`,
            headers: {
                'Authorization': token,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)'
            },
            body: 'event=checkin'
        };
        $.post(url, (err, resp, data) => {
            const res = JSON.parse(data);
            if (res.code === 0 || res.result === 'success') {
                $.msg($.name, "✅ 签到成功", "奖励已入账");
            } else if (data.includes("已签到")) {
                $.msg($.name, "ℹ️ 重复签到", "今日已完成");
            } else {
                $.msg($.name, "⚠️ 签到异常", res.message || "未知错误");
            }
            $.done();
        });
    }
}

// 适配库
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.isSurge="undefined"!=typeof $httpClient}getdata(t){return $persistentStore.read(t)}setdata(t,e){return $persistentStore.write(t,e)}msg(e,s,i){$notification.post(e,s,i)}log(t){console.log(t)}post(t,e){$httpClient.post(t,e)}done(t={}){$done(t)}}(t,e)}