const fs = require('fs');
const path = require('path');

const srcDir = 'd:/pulsechat/pulsechat-ui/src';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    content = content.replace(new RegExp(from, 'g'), to);
  }
  fs.writeFileSync(filePath, content);
}

replaceInFile(path.join(srcDir, 'App.jsx'), [
  ['./components/AuthPage', './components/auth/AuthPage'],
  ['./components/RoomPicker', './components/room/RoomPicker'],
  ['./components/ChatRoom', './components/chat/ChatRoom']
]);

replaceInFile(path.join(srcDir, 'components/auth/AuthPage.jsx'), [
  ['../api', '../../services/api']
]);

replaceInFile(path.join(srcDir, 'components/chat/ChatRoom.jsx'), [
  ['./MessageBubble', './MessageBubble'],
  ['./PresenceSidebar', './PresenceSidebar'],
  ['./TypingIndicator', './TypingIndicator'],
  ['./RoomHeader', './RoomHeader'],
  ['../hooks/useStompChat', '../../hooks/useStompChat']
]);

replaceInFile(path.join(srcDir, 'hooks/useStompChat.js'), [
  ['../stomp', '../services/websocketService'],
  ['../api', '../services/api']
]);

console.log('Imports fixed.');
