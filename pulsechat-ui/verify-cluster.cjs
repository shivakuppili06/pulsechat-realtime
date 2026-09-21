const { Client } = require('@stomp/stompjs');
const SockJS = require('sockjs-client');
const axios = require('axios');

Object.assign(global, { WebSocket: require('ws') });

const API_URL_1 = 'http://localhost:8081/api/auth';
const WS_URL_1 = 'http://localhost:8081/ws';

const API_URL_2 = 'http://localhost:8082/api/auth';
const WS_URL_2 = 'http://localhost:8082/ws';

async function verifyCluster() {
    try {
        console.log("1. Registering userA on Node 1...");
        let tokenA = '';
        try {
            const res = await axios.post(`${API_URL_1}/register`, { username: 'userA', password: 'password123' });
            tokenA = res.data.token;
        } catch (e) {
            const res = await axios.post(`${API_URL_1}/login`, { username: 'userA', password: 'password123' });
            tokenA = res.data.token;
        }
        
        console.log("2. Registering userB on Node 2...");
        let tokenB = '';
        try {
            const res = await axios.post(`${API_URL_2}/register`, { username: 'userB', password: 'password123' });
            tokenB = res.data.token;
        } catch (e) {
            const res = await axios.post(`${API_URL_2}/login`, { username: 'userB', password: 'password123' });
            tokenB = res.data.token;
        }

        console.log("Tokens received. Connecting WebSockets...");
        console.log("Client A -> Node 1 (8081)");
        console.log("Client B -> Node 2 (8082)");

        const clientA = new Client({
            webSocketFactory: () => new SockJS(`${WS_URL_1}?token=${tokenA}`),
            debug: (str) => {},
        });

        const clientB = new Client({
            webSocketFactory: () => new SockJS(`${WS_URL_2}?token=${tokenB}`),
            debug: (str) => {},
        });

        const connectA = new Promise((resolve, reject) => {
            clientA.onConnect = resolve;
            clientA.onStompError = reject;
            clientA.activate();
        });

        const connectB = new Promise((resolve, reject) => {
            clientB.onConnect = resolve;
            clientB.onStompError = reject;
            clientB.activate();
        });

        await Promise.all([connectA, connectB]);
        console.log("Both clients connected successfully!");

        console.log("-----------------------------------------");
        
        let clientBReceived = null;
        const messagePromise1 = new Promise((resolve) => {
            clientB.subscribe('/topic/room/cluster', (message) => {
                const body = JSON.parse(message.body);
                if (body.content === 'Hello from Node 1 to Node 2!') {
                    console.log("-> Client B received message from A: ", body.content);
                    resolve(body);
                }
            });
        });

        let clientAReceived = null;
        const messagePromise2 = new Promise((resolve) => {
            clientA.subscribe('/topic/room/cluster', (message) => {
                const body = JSON.parse(message.body);
                if (body.content === 'Hello from Node 2 to Node 1!') {
                    console.log("-> Client A received message from B: ", body.content);
                    resolve(body);
                }
            });
        });

        console.log("TEST 1: Client A (Node 1) -> Client B (Node 2)");
        setTimeout(() => {
            console.log("Client A publishing message...");
            clientA.publish({
                destination: '/app/chat/cluster',
                body: JSON.stringify({ content: 'Hello from Node 1 to Node 2!' })
            });
        }, 500);

        await messagePromise1;
        
        console.log("-----------------------------------------");
        console.log("TEST 2: Client B (Node 2) -> Client A (Node 1)");
        setTimeout(() => {
            console.log("Client B publishing message...");
            clientB.publish({
                destination: '/app/chat/cluster',
                body: JSON.stringify({ content: 'Hello from Node 2 to Node 1!' })
            });
        }, 500);

        await messagePromise2;

        clientA.deactivate();
        clientB.deactivate();
        console.log("-----------------------------------------");
        console.log("CLUSTER VERIFICATION SUCCESS");
        
    } catch (e) {
        console.error("FAILED:", e.message);
        if (e.response) console.error(e.response.data);
    }
}

verifyCluster();
