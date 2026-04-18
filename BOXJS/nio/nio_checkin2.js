/* 蔚来纯签到脚本 (BoxJs 模式) */
const $ = new Env("蔚来签到");
const key = "nio_auth_token"; // 必须与 JSON 里的 keys 一致

const token = $.getdata(key);
if (!token) {
    $.msg($.name, "❌ 签到失败", "请先在 BoxJs 界面填入 Token");
    $.done();
} else {
    $.post({
        url: `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`,
        headers: { 'Authorization': token, 'User-Agent': 'NIOAppCN/6.4.1 (iPhone; iOS 18.7)' },
        body: 'event=checkin'
    }, (err, resp, data) => {
        $.msg($.name, "✅ 蔚来签到", data);
        $.done();
    });
}

function Env(t){return new class{constructor(t){this.name=t}getdata(t){return $persistentStore.read(t)}setdata(t,e){return $persistentStore.write(t,e)}msg(t,e,s){$notification.post(t,e,s)}post(t,e){$httpClient.post(t,e)}done(t={}){$done(t)}}(t)}