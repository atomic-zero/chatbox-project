/* eslint-disable linebreak-style */
"use strict";

//credits to kenneth panio

const axios = require('axios');
const FormData = require('form-data');
const log = require('npmlog');
const { URL } = require('url');
const http = require('http');
const querystring = require('querystring');

module.exports = function (defaultFuncs, api, ctx) {
  return {
    getCookie,
    getToken,
    fbStalk
  };

  function getCookie(username, password, callback) {
    let resolveFunc, rejectFunc;
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, cookie) {
        if (err) return rejectFunc(err);
        resolveFunc(cookie);
      };
    }

    async function fetchCookie(user, pass) {
      try {
        const session = axios.create();
        const headers = {
          'User-Agent': randomUserAgent(),
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        const getlog = await session.get('https://free.facebook.com/login.php', { headers });
        const idpass = {
          lsd: /name="lsd" value="(.*?)"/.exec(getlog.data)[1],
          jazoest: /name="jazoest" value="(.*?)"/.exec(getlog.data)[1],
          m_ts: /name="m_ts" value="(.*?)"/.exec(getlog.data)[1],
          li: /name="li" value="(.*?)"/.exec(getlog.data)[1],
          try_number: "0",
          unrecognize_tries: "0",
          email: user,
          pass: pass,
          login: "Log In",
          bi_xrwh: /name="bi_xrwh" value="(.*?)"/.exec(getlog.data)[1],
        };
        const comp = await session.post('https://free.facebook.com/login/device-based/regular/login/?shbl=1&refsrc=deprecated', querystring.stringify(idpass), { headers, maxRedirects: 0 });
        const cookie = comp.headers['set-cookie'].join('; ');
        if (cookie.includes('c_user')) {
          return cookie;
        } else if (cookie.includes('checkpoint')) {
          return 'account checkpoint';
        } else {
          return 'invalid username or password';
        }
      } catch (e) {
        log.error('getCookie', "Error: " + e.message);
        throw new Error("Error: " + e.message);
      }
    }

    fetchCookie(username, password)
      .then(cookie => callback(null, cookie))
      .catch(err => callback(err));

    return returnPromise;
  }

  function getToken(username, password, callback) {
    let resolveFunc, rejectFunc;
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, tokens) {
        if (err) return rejectFunc(err);
        resolveFunc(tokens);
      };
    }

    async function fetchToken(user, pass) {
      try {
        const tokenFetchers = [fetchEAAAAU, fetchEAADYP, fetchEAAGNO, fetchEAAD6V7];
        const tokens = await Promise.all(tokenFetchers.map(fetcher => fetcher(user, pass)));
        if (tokens.every(token => !token)) {
          throw new Error("Error while generating access_token");
        }
        return tokens;
      } catch (e) {
        log.error('getToken', "Error: " + e.message);
        throw new Error("Error: " + e.message);
      }
    }

    fetchToken(username, password)
      .then(tokens => callback(null, tokens))
      .catch(err => callback(err));

    return returnPromise;
  }

  async function fetchEAAAAU(user, pass) {
    try {
      const res = await axios.get(`https://b-api.facebook.com/method/auth.login?email=${user}&password=${pass}&format=json&generate_session_cookies=1&generate_machine_id=1&generate_analytics_claim=1&locale=en_US&client_country_code=US&credentials_type=device_based_login_password&fb_api_caller_class=com.facebook.account.login.protocol.Fb4aAuthHandler&fb_api_req_friendly_name=authenticate&api_key=882a8490361da98702bf97a021ddc14d&access_token=350685531728%7C62f8ce9f74b12f84c123cc23437a4a32`);
      return res.data.access_token || false;
    } catch (e) {
      return false;
    }
  }

  async function fetchEAADYP(user, pass) {
    try {
      const res = await axios.get(`https://b-api.facebook.com/method/auth.login?access_token=237759909591655%25257C0f140aabedfb65ac27a739ed1a2263b1&format=json&sdk_version=1&email=${user}&locale=en_US&password=${pass}&sdk=ios&generate_session_cookies=1&sig=3f555f98fb61fcd7aa0c44f58f522efm`);
      return res.data.access_token || false;
    } catch (e) {
      return false;
    }
  }

  async function fetchEAAGNO(user, pass) {
    try {
      const cookie = await fetchCookie(user, pass);
      const headers = {
        'User-Agent': randomUserAgent(),
        'Cookie': cookie
      };
      const res = await axios.get('https://business.facebook.com/content_management', { headers });
      const token = res.data.match(/EAAG(.*?)","/)[1];
      return `EAAG${token}` || false;
    } catch (e) {
      return false;
    }
  }

  async function fetchEAAD6V7(user, pass) {
    try {
      const cookie = await fetchCookie(user, pass);
      const res = await axios.get(`https://hoanghao.me/api/cookietotoken?cookie=${cookie}`);
      return res.data.access_token || false;
    } catch (e) {
      return false;
    }
  }

  function fbStalk(uid, token, callback) {
    let resolveFunc, rejectFunc;
    const returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, data) {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    }

    async function fetchFbStalk(uid, token) {
      try {
        const url = `https://graph.facebook.com/${uid}?fields=id,is_verified,work,hometown,username,link,name,locale,location,about,website,birthday,gender,relationship_status,first_name,subscribers.limit(0)&access_token=${token}`;
        const headers = { 'User-Agent': randomUserAgent() };
        const resp = await axios.get(url, { headers });
        const data = {
          name: resp.data.name || 'No data!',
          first_name: resp.data.first_name || 'No data!',
          link: resp.data.link || 'No data!',
          username: resp.data.username || 'No data!',
          uid: resp.data.id || 'No data!',
          web: resp.data.website || 'No data!',
          gender: resp.data.gender || 'No data!',
          relationship: resp.data.relationship_status || 'No data!',
          birthday: resp.data.birthday || 'No data!',
          follower: resp.data.subscribers?.summary?.total_count || 'No data!',
          locale: resp.data.locale || 'No data!',
          is_verified: resp.data.is_verified || false,
          about: resp.data.about || 'No data!',
          hometown: resp.data.hometown?.name || 'No hometown!',
          livein: resp.data.location?.name || 'No data!',
          workplace: resp.data.work ? resp.data.work.map(work => `- ${work.employer.name}`).join('\n') : 'No data!',
          followers: resp.data.subscribers?.summary?.total_count ? resp.data.subscribers.summary.total_count.toLocaleString() : 'No data!',
          avatar: `https://graph.facebook.com/${resp.data.id}/picture?width=1500&height=1500&access_token=1174099472704185|0722a7d5b5a4ac06b11450f7114eb2e9`
        };
        return data;
      } catch (e) {
        log.error('fbStalk', "Error: " + e.message);
        throw new Error("Error: " + e.message);
      }
    }

    fetchFbStalk(uid)
      .then(data => callback(null, data))
      .catch(err => callback(err));

    return returnPromise;
  }

  function randomUserAgent() {
    const userAgents = [
      "Mozilla/5.0 (Linux; Android 4.1.2; GT-I8552 Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36",
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "Dalvik/2.1.0 (Linux; U; Android 8.0.0; SM-G960F Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
};
