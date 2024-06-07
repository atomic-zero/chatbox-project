/* eslint-disable linebreak-style */
"use strict";

const axios = require('axios');
const FormData = require('form-data');
const { URL } = require('url');
const log = require('npmlog');

module.exports = function (defaultFuncs, api, ctx) {
  return function getUID(link, callback) {
    let resolveFunc = function () { };
    let rejectFunc = function () { };
    let returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, uid) {
        if (err) return rejectFunc(err);
        resolveFunc(uid);
      };
    }

    async function getUIDFast(url) {
      let Form = new FormData();
      let Url = new URL(url);
      Form.append('link', Url.href);
      try {
        let { data } = await axios.post('https://id.traodoisub.com/api.php', Form, {
          headers: Form.getHeaders()
        });
        if (data.error) throw new Error(data.error);
        return data.id || "Not found";
      } catch (e) {
        log.error('getUID', "Error: " + e.message);
        throw new Error("Error: " + e.message);
      }
    }

    async function getUIDSlow(url) {
      let Form = new FormData();
      let Url = new URL(url);
      Form.append('username', Url.pathname.replace(/\//g, ""));
      try {
        let { data } = await axios.post('https://api.findids.net/api/get-uid-from-username', Form, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.79 Safari/537.36',
            ...Form.getHeaders()
          }
        });
        if (data.status !== 200) throw new Error('Error occurred!');
        if (typeof data.error === 'string') throw new Error(data.error);
        return data.data.id || "Not found";
      } catch (e) {
        log.error('getUID', "Error: " + e.message);
        throw new Error("Error: " + e.message);
      }
    }

    async function getUID(url) {
      try {
        let uid = await getUIDFast(url);
        if (!isNaN(uid)) return uid;
        uid = await getUIDSlow(url);
        if (!isNaN(uid)) return uid;
        throw new Error("Unable to retrieve UID");
      } catch (e) {
        log.error('getUID', "Error: " + e.message);
        throw new Error("Error: " + e.message);
      }
    }

    try {
      let Link = String(link);
      if (Link.includes('facebook.com') || Link.includes('Facebook.com') || Link.includes('fb')) {
        let LinkSplit = Link.split('/');
        if (LinkSplit.indexOf("https:") == 0) {
          if (!isNaN(LinkSplit[3]) && !Link.split('=')[1] && !isNaN(Link.split('=')[1])) {
            throw new Error('Invalid link format. The correct format should be: facebook.com/username');
          } else if (!isNaN(Link.split('=')[1]) && Link.split('=')[1]) {
            let Format = `https://www.facebook.com/profile.php?id=${Link.split('=')[1]}`;
            getUID(Format).then(data => callback(null, data)).catch(err => callback(err));
          } else {
            getUID(Link).then(data => callback(null, data)).catch(err => callback(err));
          }
        } else {
          let Form = `https://www.facebook.com/${LinkSplit[1]}`;
          getUID(Form).then(data => callback(null, data)).catch(err => callback(err));
        }
      } else {
        throw new Error('Invalid link. The link should be a Facebook link.');
      }
    } catch (e) {
      log.error('getUID', "Error: " + e.message);
      return callback(null, e);
    }
    return returnPromise;
  };
};

//modified by kenneth panio