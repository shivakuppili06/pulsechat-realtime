
const { Client } = require('@stomp/stompjs');
const SockJS = require('sockjs-client');
const axios = require('axios');
Object.assign(global, { WebSocket: require('ws') });
async function test() {
  const res = await axios.post('http://localhost:8081/api/auth/register', { username: 'hsuser', password: 'password123' }).catch(e => axios.post('http://localhost:8081/api/auth/login', { username: 'hsuser', password: 'password123' }));
  const validToken = res.data.token;
  const c1 = new Client({ webSocketFactory: () => new SockJS('http://localhost:8081/ws?token=' + validToken), debug: ()=>{} });
  c1.onConnect = () => { console.log('VALID TOKEN: Accepted'); c1.deactivate(); };
  c1.onStompError = () => console.log('VALID TOKEN: Rejected');
  c1.activate();
  setTimeout(()=> {
    const c2 = new Client({ webSocketFactory: () => new SockJS('http://localhost:8081/ws?token=invalid'), debug: ()=>{} });
    c2.onWebSocketClose = () => { console.log('INVALID TOKEN: Rejected'); };
    c2.activate();
  }, 1000);
  setTimeout(()=> {
    const c3 = new Client({ webSocketFactory: () => new SockJS('http://localhost:8081/ws'), debug: ()=>{} });
    c3.onWebSocketClose = () => { console.log('NO TOKEN: Rejected'); };
    c3.activate();
  }, 2000);
}
test();

