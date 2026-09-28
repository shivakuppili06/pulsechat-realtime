const http = require('http');

function makeRequest(path, data) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 8081,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body });
            });
        });
        
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log("3.1 & 3.2 Register two users:");
    const reg1 = await makeRequest('/api/auth/register', JSON.stringify({username: 'testuser1', password: 'StrongPass123!'}));
    console.log('User 1:', reg1);
    
    const reg2 = await makeRequest('/api/auth/register', JSON.stringify({username: 'testuser2', password: 'StrongPass123!'}));
    console.log('User 2:', reg2);

    console.log("\n3.2 Login both, confirm JWTs:");
    const login1 = await makeRequest('/api/auth/login', JSON.stringify({username: 'testuser1', password: 'StrongPass123!'}));
    console.log('Login 1 status:', login1.status, 'Has JWT:', !!JSON.parse(login1.body).token);
    
    const login2 = await makeRequest('/api/auth/login', JSON.stringify({username: 'testuser2', password: 'StrongPass123!'}));
    console.log('Login 2 status:', login2.status, 'Has JWT:', !!JSON.parse(login2.body).token);

    console.log("\n3.3 Confirm password validation (weak password):");
    const weakReg = await makeRequest('/api/auth/register', JSON.stringify({username: 'testuser3', password: 'weak'}));
    console.log('Weak Password Reg:', weakReg);

    console.log("\n3.4 Confirm duplicate username registration:");
    const dupReg = await makeRequest('/api/auth/register', JSON.stringify({username: 'testuser1', password: 'StrongPass123!'}));
    console.log('Duplicate Reg:', dupReg);
}

runTests().catch(console.error);
