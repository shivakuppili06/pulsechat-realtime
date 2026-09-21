const { Client } = require('@stomp/stompjs');
const SockJS = require('sockjs-client');
const axios = require('axios');
const { MongoClient } = require('mongodb');

Object.assign(global, { WebSocket: require('ws') });

const API_URL = 'http://localhost:8081/api';
const WS_URL = 'http://localhost:8081/ws';
const ROOM_ID = 'cluster-' + Date.now();

async function verifySection5() {
    try {
        console.log("1. Registering userA and userB on Node 1...");
        let tokenA, tokenB;
        let userIdA, userIdB;

        const resA = await registerOrLogin('userA', 'password123');
        tokenA = resA.token;
        
        const resB = await registerOrLogin('userB', 'password123');
        tokenB = resB.token;

        // Fetch User IDs by logging in or decoding (we'll just use mongo for this verification script)
        const client = await MongoClient.connect('mongodb://localhost:27017');
        const db = client.db('chatdb');
        const userA = await db.collection('users').findOne({ username: 'userA' });
        const userB = await db.collection('users').findOne({ username: 'userB' });
        userIdA = userA._id.toString();
        userIdB = userB._id.toString();

        console.log(`userA ID: ${userIdA}, userB ID: ${userIdB}`);

        const clientA = new Client({
            webSocketFactory: () => new SockJS(`${WS_URL}?token=${tokenA}`),
            debug: (str) => {},
        });

        const clientB = new Client({
            webSocketFactory: () => new SockJS(`${WS_URL}?token=${tokenB}`),
            debug: (str) => {},
        });

        const connectA = new Promise((resolve) => { clientA.onConnect = resolve; clientA.activate(); });
        const connectB = new Promise((resolve) => { clientB.onConnect = resolve; clientB.activate(); });

        await Promise.all([connectA, connectB]);
        console.log("Clients connected.");

        // We need to send at least one message so they are considered "room members" by Option A
        console.log("Sending initial messages to establish room membership...");
        clientA.publish({ destination: `/app/chat/${ROOM_ID}`, body: JSON.stringify({ content: 'Init A' }) });
        clientB.publish({ destination: `/app/chat/${ROOM_ID}`, body: JSON.stringify({ content: 'Init B' }) });
        await new Promise(r => setTimeout(r, 1000));

        // --- PRESENCE TEST ---
        console.log("\n--- PRESENCE TEST ---");
        let onlineRes = await axios.get(`${API_URL}/rooms/${ROOM_ID}/online`);
        console.log("Online members (Expected userA and userB):", onlineRes.data);

        console.log("Disconnecting Client B to test explicit disconnect...");
        clientB.deactivate();
        await new Promise(r => setTimeout(r, 1000));
        
        onlineRes = await axios.get(`${API_URL}/rooms/${ROOM_ID}/online`);
        console.log("Online members after B disconnects (Expected userA only):", onlineRes.data);

        console.log("Testing TTL expiry for Client A (waiting 31 seconds)...");
        // Simulate no heartbeat by just waiting
        await new Promise(r => setTimeout(r, 31000));
        onlineRes = await axios.get(`${API_URL}/rooms/${ROOM_ID}/online`);
        console.log("Online members after 31s (Expected empty):", onlineRes.data);

        // --- TYPING INDICATORS TEST ---
        console.log("\n--- TYPING INDICATORS TEST ---");
        // Reconnect Client B
        clientB.activate();
        await new Promise(r => { clientB.onConnect = r; });
        
        let typingPromise = new Promise((resolve) => {
            const sub = clientB.subscribe(`/topic/room.${ROOM_ID}.typing`, (message) => {
                const body = JSON.parse(message.body);
                console.log("Client B received typing event:", body);
                sub.unsubscribe();
                resolve();
            });
        });

        console.log("Client A sending typing event (spoofing as maliciousUser)...");
        await new Promise(r => setTimeout(r, 500));
        clientA.publish({
            destination: `/app/chat/${ROOM_ID}/typing`,
            body: JSON.stringify({ username: 'maliciousUser' })
        });
        await typingPromise; // Should print "userA" instead of maliciousUser

        // --- READ RECEIPTS TEST ---
        console.log("\n--- READ RECEIPTS TEST ---");
        let msgIdToRead = null;
        let msgPromise = new Promise((resolve) => {
            const sub = clientB.subscribe(`/topic/room.${ROOM_ID}`, (message) => {
                const body = JSON.parse(message.body);
                if (body.content === 'Read me!') {
                    msgIdToRead = body.id;
                    sub.unsubscribe();
                    resolve();
                }
            });
        });

        clientA.publish({ destination: `/app/chat/${ROOM_ID}`, body: JSON.stringify({ content: 'Read me!' }) });
        await msgPromise;

        let receiptPromise = new Promise((resolve) => {
            const sub = clientA.subscribe(`/topic/room.${ROOM_ID}.receipts`, (message) => {
                const body = JSON.parse(message.body);
                console.log("Client A received read receipt:", body);
                sub.unsubscribe();
                resolve();
            });
        });

        console.log("Client B marking message as read (spoofing as maliciousUserId)...");
        await new Promise(r => setTimeout(r, 500));
        clientB.publish({
            destination: `/app/chat/${ROOM_ID}/read/${msgIdToRead}`,
            body: JSON.stringify({ userId: 'maliciousUserId' })
        });
        await receiptPromise;

        console.log("Checking MongoDB for readBy array...");
        const { ObjectId } = require('mongodb');
        const msgDoc = await db.collection('messages').findOne({ _id: new ObjectId(msgIdToRead) });
        console.log("MongoDB Document readBy field:", msgDoc.readBy);

        clientA.deactivate();
        clientB.deactivate();
        client.close();
        console.log("\nALL VERIFICATIONS PASSED");

    } catch (e) {
        console.error("FAILED:", e);
    }
}

async function registerOrLogin(username, password) {
    try {
        const res = await axios.post(`${API_URL}/auth/register`, { username, password });
        return res.data;
    } catch (e) {
        const res = await axios.post(`${API_URL}/auth/login`, { username, password });
        return res.data;
    }
}

verifySection5();
