const { Client } = require('@stomp/stompjs');
const SockJS = require('sockjs-client');
const axios = require('axios');
const http = require('http');

// Provide WebSocket to stompjs in Node
Object.assign(global, { WebSocket: require('ws') });

const API_URL = 'http://localhost:8081/api/auth';
const WS_URL = 'http://localhost:8081/ws';

async function verify() {
    try {
        console.log("1. Registering userA...");
        let tokenA = '';
        try {
            const res = await axios.post(`${API_URL}/register`, { username: 'userA', password: 'password123' });
            tokenA = res.data.token;
        } catch (e) {
            console.log("User A might exist, trying login...");
            const res = await axios.post(`${API_URL}/login`, { username: 'userA', password: 'password123' });
            tokenA = res.data.token;
        }
        
        console.log("2. Registering userB...");
        let tokenB = '';
        try {
            const res = await axios.post(`${API_URL}/register`, { username: 'userB', password: 'password123' });
            tokenB = res.data.token;
        } catch (e) {
            const res = await axios.post(`${API_URL}/login`, { username: 'userB', password: 'password123' });
            tokenB = res.data.token;
        }

        console.log("Tokens received. Connecting WebSockets...");

        const clientA = new Client({
            webSocketFactory: () => new SockJS(`${WS_URL}?token=${tokenA}`),
            debug: (str) => { /* console.log('A: ' + str); */ },
        });

        const clientB = new Client({
            webSocketFactory: () => new SockJS(`${WS_URL}?token=${tokenB}`),
            debug: (str) => { /* console.log('B: ' + str); */ },
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

        console.log("Testing invalid token handshake...");
        const clientInvalid = new Client({
            webSocketFactory: () => new SockJS(`${WS_URL}?token=invalid_token`),
            debug: (str) => {},
        });
        
        const connectInvalid = new Promise((resolve, reject) => {
            clientInvalid.onConnect = () => reject(new Error("Should not connect with invalid token"));
            clientInvalid.onWebSocketClose = () => resolve();
            clientInvalid.activate();
        });
        await connectInvalid;
        console.log("Invalid token rejected as expected.");
        clientInvalid.deactivate();

        console.log("Testing broadcast...");
        
        const messagePromise = new Promise((resolve) => {
            clientB.subscribe('/topic/room/general', (message) => {
                const body = JSON.parse(message.body);
                console.log("Client B received message: ", body);
                resolve(body);
            });
        });

        setTimeout(() => {
            console.log("Client A sending message...");
            clientA.publish({
                destination: '/app/chat/general',
                body: JSON.stringify({ content: 'Hello World', senderUsername: 'fakeAdmin', senderId: 'fake123' })
            });
        }, 1000);

        await messagePromise;
        
        console.log("Testing persistence...");
        const historyRes = await axios.get('http://localhost:8081/api/rooms/general/messages');
        console.log("History:", historyRes.data);

        clientA.deactivate();
        clientB.deactivate();
        console.log("SUCCESS");
        
    } catch (e) {
        console.error("FAILED:", e.message);
        if (e.response) console.error(e.response.data);
    }
}

verify();
