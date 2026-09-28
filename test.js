
async function run() {
  const login = async (u, p) => fetch('http://localhost:8081/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: u, password: p})});
  const l1 = await login('newuser99', 'wrongpass');
  console.log('Login wrong password:', l1.status);
  const l2 = await login('nonexistent', 'pass');
  console.log('Login nonexistent:', l2.status);
  const r1 = await fetch('http://localhost:8081/api/rooms/invalid_id');
  console.log('GET invalid room:', r1.status);
  const l3 = await login('newuser99', 'password123');
  console.log('Login correct:', l3.status);
}
run();

