const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { startSession, activeSessions } = require('./system/manager');

const app = express();
app.use(bodyParser.json());
const port = 8237;

app.post('/submit-appstate', (req, res) => {
  const { appState } = req.body;
  if (appState) {
    const filePath = path.join(__dirname, 'system', 'database', 'sessions', `temp.json`);
    fs.writeFileSync(filePath, JSON.stringify(appState, null, '\t'));
    startSession(appState).then(() => {
      const botID = Object.keys(sessions).pop();
      fs.renameSync(filePath, path.join(__dirname, 'system', 'database', 'sessions', `${botID}.json`));
      res.sendStatus(200);
    }).catch(err => {
      console.error(err);
      res.sendStatus(500);
    });
  } else {
    res.sendStatus(400);
  }
});

app.post('/set-admin', (req, res) => {
  const { uid } = req.body;
  if (uid) {
    userRoles.admin.push(uid);
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

app.post('/set-prefixes', (req, res) => {
  const { newPrefixes } = req.body;
  if (newPrefixes && Array.isArray(newPrefixes)) {
    prefixes = newPrefixes.filter(prefix => prefix.length === 1 && !/[a-zA-Z]/.test(prefix));
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/control-panel.html');
});

app.get('/active-sessions', (req, res) => {
  res.json({ activeSessions });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
