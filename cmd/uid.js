module.exports = {
  name: "uid",
  version: "1.3.0",
  role: 0,
  aliases: ['id', 'userid', 'fbid', 'fb-id'],
  info: 'Search for a user\'s ID or retrieve your own UID',
  usage: '[name or mention or Facebook profile link]',
  credits: 'Kenneth Panio',

  exec: ({ event, args, box, fonts }) => {
    const mono = txt => fonts.monospace(txt);
    const { threadID, mentions, senderID } = event;
    const targetName = args.join(' ');

    const getUserName = (box, userID) => {
      return box.userInfo(userID)
        .then(userInfo => userInfo && userInfo[userID] ? userInfo[userID].name?.toLowerCase() : "Unknown")
        .catch(() => "Unknown");
    };

    if (!targetName) {
      box.userInfo(senderID)
        .then(selfInfo => {
          const selfName = mono(selfInfo[senderID].name || 'UID');
          box.contact(`${selfName}: ${senderID}`);
        })
        .catch(error => box.reply(mono(`❗ | An error occurred: ${error.message}`)));
      return;
    }

    if (Object.keys(mentions).length > 0) {
      Object.keys(mentions).forEach(mentionID => {
        const mentionName = mentions[mentionID].replace('@', '');
        box.contact(`${mono(mentionName)}: ${mentionID}`, mentionID);
      });
      return;
    }

    const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
    const isFacebookLink = facebookLinkRegex.test(targetName);

    if (isFacebookLink) {
      box.uid(targetName)
        .then(uid => {
          if (uid) {
            box.contact(uid, uid);
          } else {
            box.reply(mono("❗ | Unable to retrieve UID from the provided Facebook link."));
          }
        })
        .catch(error => box.reply(mono(`❗ | An error occurred: ${error.message}`)));
      return;
    }

    box.threadInfo(threadID)
      .then(threadInfo => {
        const participantIDs = threadInfo.participantIDs;

        Promise.all(participantIDs.map(participantID => getUserName(box, participantID).then(userName => ({
          userID: participantID,
          userName: userName?.toLowerCase(),
        }))))
        .then(matchedUserIDs => {
          const matchedUsers = matchedUserIDs.filter(user => user.userName?.includes(targetName?.toLowerCase()));

          if (matchedUsers.length === 0) {
            box.reply(mono(`❓ | There is no user with the name "${targetName}" in the group.`));
            return;
          }

          const formattedList = matchedUsers.map((user, index) => {
            const userInfo = `${mono(user.userName)}: ${user.userID}`;
            box.contact(userInfo, user.userID);
            return `${index + 1}. ${userInfo}`;
          }).join('\n');

          box.reply(formattedList);
        });
      })
      .catch(error => box.reply(mono(`❗ | An error occurred: ${error.message}`)));
  }
};
