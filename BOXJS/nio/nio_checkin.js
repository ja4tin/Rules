const $ = new Env('蔚来自动签到');
const token = $.getdata('nio_auth_token'); // 从 BoxJs 获取 Token

if (!token) {
    $.msg('蔚来签到', '❌ 失败', '未在 BoxJs 中发现 Token，请先抓包');
    $.done();
}

const url = `https://gateway-front-external.nio.com/moat/10086/c/award_cn/checkin?app_id=10086`;
const method = 'POST';
const headers = {
    'Authorization': token, // 自动填入你抓到的 Bearer xxx
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NIOAppCN/6.4.1'
};
const body = 'event=checkin';

const request = {
    url: url,
    method: method,
    headers: headers,
    body: body
};

$.post(request, (error, response, data) => {
    if (error) {
        $.msg('蔚来签到', '❌ 网络请求错误', error);
    } else {
        const result = JSON.parse(data);
        if (result.code === 0 || result.result === 'success') {
            $.msg('蔚来签到', '✅ 成功', '每日打卡完成！');
        } else {
            $.msg('蔚来签到', '⚠️ 签到异常', result.message || '未知错误');
        }
    }
    $.done();
});

// Env 库函数的简易实现（通常直接引用成熟的模板）
function Env(name) { /* 这里是常用的脚本环境适配代码 */ }