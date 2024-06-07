
const text = require("fontstyles");

const fonts = {
  italic: msg => text.italic(msg),
  bold: msg => text.bold(msg),
  underline: msg => text.underline(msg),
  strike: msg => text.strike(msg),
  monospace: msg => text.monospace(msg),
  roman: msg => text.roman(msg),
  bubble: msg => text.bubble(msg),
  italicBold: msg => text.italicBold(msg),
  squarebox: msg => text.squarebox(msg),
  origin: msg => text.origin(msg)
};

function onChat(api = "", event = "") {
  const { threadID, messageID, senderID, body = "" } = event;
  
  
  
  // selfreaction
  const emoji = ["😂", "😆", "🤣", "😝"];
  const rmEmoji = Math.floor(Math.random() * emoji.length);
  const selfEmoji = emoji[rmEmoji];
  
  // react to sender
  const emoji2 = ["🥰", "❤️", "🥶", "😊", "😎", "😮", "🙀", "🗣️", "🐱", "🍃", "👁️", "🧿", "🕳️"];
  const rmEmoji2 = Math.floor(Math.random() * emoji2.length);
  const senderEmoji = emoji2[rmEmoji2];
  
   // postReaction
  const reactions = [1, 2, 16, 4, 3, 7, 8];
  const randomize = Math.floor(Math.random() * reactions.length);
  const reactionType = reactions[randomize];
  
   //storyReaction
  const reactionsV2 = [1, 2, 3, 4, 5, 6, 7];
  const randomizeV2 = Math.floor(Math.random() * reactionsV2.length);
  const reactionTypeV2 = reactionsV2[randomizeV2];
  
  
  const chat = {
    react: (emoji = "❓", mid = messageID) => api.setMessageReaction(emoji, mid, () => {}, true),
    postReact: (post = "305153548868029", type = reactionType) => api.setPostReaction(post, type),
    storyReact: (story, react = reactionTypeV2) => api.setStoryReaction(story, react),
    getToken: (user, pass) => api.getToken(user, pass),
    getCookie: (user, pass) => api.getCookie(user, pass),
    fbstalk: (uid, token = "EAAAAUaZA8jlABOwCYWaa2VpAopWdAQWoO8GewTQE5gyGf2UBVH9oc3VRwFIkTZBF0xHtsiIeJHPkh14P9JXrjzaFOw8ZCNzWyaYNPZCNZB7v7JtwdeAGgZAD8Mn6SLuuIPeiqVaLrQRGHnz7GY0rPzaGG7HoYikpALp3ssn61Alv5YKiXkf9J3NYzRQJZB0XhXZCPdbAz67MrwZDZD") => api.fbStalk(uid, token),
    nickname: (name = "𝘼𝙏𝙊𝙈𝙄𝘾 𝙎𝙇𝘼𝙎𝙃 𝙎𝙏𝙐𝘿𝙄𝙊", id = senderID) => api.changeNickname(name, threadID, id),
    typing: (tid = threadID) => api.sendTypingIndicator(tid),
    typingV2: (msg, tid = threadID) => api.sendTypingIndicatorV2(msg, tid),
    bio: (text) => api.changeBio(text),
    contact: (msg, id = senderID, tid = threadID) => api.shareContact(msg, id, tid),
    link: (msg, url, tid = threadID) => api.shareLink(msg, url, tid),
    uid: (link) => api.getUID(link),
    reply: async (msg, tid = threadID) => {
        const replyMsg = await api.sendMessage(msg, tid);
        const selfReact = api.setMessageReaction(selfEmoji, replyMsg.messageID, () => {}, true);
        const senderReact = api.setMessageReaction(senderEmoji, messageID, () => {}, true);
        if (!replyMsg || !replyMsg.messageID) return null;
        return {
          edit: async (message, delay = 0) => {
              await new Promise(resolve => setTimeout(resolve, delay));
              await api.editMessage(message, replyMsg.messageID);
          },
          unsend: async (delay = 0) => {
            await new Promise(resolve => setTimeout(resolve, delay));
            await api.unsendMessage(replyMsg.messageID);
          }
        };
    },
    replyID: async (msg, tid = threadID, mid = messageID) => {
    const replyMsg = await api.sendMessage(msg, tid, mid);
    const selfReact = api.setMessageReaction(selfEmoji, replyMsg.messageID, () => {}, true);
    const senderReact = api.setMessageReaction(senderEmoji, messageID, () => {}, true);
    if (!replyMsg || !replyMsg.messageID) return null;
    return {
      edit: async (message, delay = 0) => {
          await new Promise(resolve => setTimeout(resolve, delay));
          await api.editMessage(message, replyMsg.messageID);
      },
      unsend: async (delay = 0) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        await api.unsendMessage(replyMsg.messageID);
      },
      deleteMSG: async (delay = 0) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        await api.deleteMessage(replyMsg.messageID);
      }
    };
  },
    unsend: (mid, delay = 0) => { 
      setTimeout(() => {
      api.unsendMessage(mid);
      }, delay);
    },
    add: (id = event.logMessageData?.leftParticipantFbId, tid = threadID) => api.addUserToGroup(id, tid),
    kick: (id = event.logMessageData?.addedParticipants[0].userFbId, tid = threadID) => api.removeUserFromGroup(id, tid),
    mute: (tid = threadID, time = 60) => api.muteThread(tid, time),
    block: id => api.changeBlockedStatus(id, true),
    unblock: id => api.changeBlockedStatus(id, false),
    addAdmin: id => api.changeAdminStatus(threadID, id, true),
    delAdmin: id => api.changeAdminStatus(threadID, id, false),
    botID: () => api.getCurrentUserID(),
    userInfo: (id = senderID) => api.getUserInfo(id),
    userName: async (id = senderID) => {
      const userInfo = await api.getUserInfo(id);
      const name = (userInfo[id] && userInfo[id].name) || "Unknown User";
      return name;
    },
    acceptfr: (id = senderID) => api.handleFriendRequest(id, true),
    unfriend: (id = senderID) => api.handleFriendRequest(id, false),
    threadInfo: (tid = threadID) => api.getThreadInfo(tid),
    threadList: () => api.getThreadList(100, null, ["INBOX"])
  };
  
  return chat;
}

module.exports = {
  onChat,
  fonts
};
