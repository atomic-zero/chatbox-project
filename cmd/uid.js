module.exports = {
  name: "uid",
  version: "1.3.0",
  isPrefix: false,
  aliases: ['id', 'userid', 'fbid', 'fb-id'],
  info: 'Search for a user\'s ID or retrieve your own UID',
  usage: '[name or mention or Facebook profile link]',
  credits: 'Kenneth Panio',
 async exec ({ event, args, chat, fonts }) {
    const mono = txt => fonts.monospace(txt);
    const { threadID, mentions, senderID } = event;
    const targetName = args.join(' ');

    const getUserName = (chat, userID) => {
      return chat.userInfo(userID)
        .then(userInfo => userInfo && userInfo[userID] ? userInfo[userID].name?.toLowerCase() : "Unknown")
        .catch(() => "Unknown");
    };

    if (!targetName) {
      chat.userInfo(senderID)
        .then(selfInfo => {
          const selfName = mono(selfInfo[senderID].name || 'UID');
          chat.contact(`${selfName}: ${senderID}`);
        })
        .catch(error => chat.reply(mono(`❗ | An error occurred: ${error.message}`)));
      return;
    }

    if (Object.keys(mentions).length > 0) {
      Object.keys(mentions).forEach(mentionID => {
        const mentionName = mentions[mentionID].replace('@', '');
        chat.contact(`${mono(mentionName)}: ${mentionID}`, mentionID);
      });
      return;
    }

    const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
    const isFacebookLink = facebookLinkRegex.test(targetName);

    if (isFacebookLink) {
      chat.uid(targetName)
        .then(uid => {
          if (uid) {
            chat.contact(uid, uid);
          } else {
            chat.reply(mono("❗ | Unable to retrieve UID from the provided Facebook link."));
          }
        })
        .catch(error => chat.reply(mono(`❗ | An error occurred: ${error.message}`)));
      return;
    }

    chat.threadInfo(threadID)
      .then(threadInfo => {
        const participantIDs = threadInfo.participantIDs;

        Promise.all(participantIDs.map(participantID => getUserName(chat, participantID).then(userName => ({
          userID: participantID,
          userName: userName?.toLowerCase(),
        }))))
        .then(matchedUserIDs => {
          const matchedUsers = matchedUserIDs.filter(user => user.userName?.includes(targetName?.toLowerCase()));

          if (matchedUsers.length === 0) {
            chat.reply(mono(`❓ | There is no user with the name "${targetName}" in the group.`));
            return;
          }

          const formattedList = matchedUsers.map((user, index) => {
            const userInfo = `${mono(user.userName)}: ${user.userID}`;
            chat.contact(userInfo, user.userID);
            return `${index + 1}. ${userInfo}`;
          }).join('\n');

        //  chat.reply(formattedList);
        });
      })
      .catch(error => chat.reply(mono(`❗ | An error occurred: ${error.message}`)));
  }
};
