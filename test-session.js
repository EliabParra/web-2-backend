import { io } from "socket.io-client";

async function test() {
  const csrfRes0 = await fetch("http://localhost:3000/csrf");
  const initCookie = csrfRes0.headers.get("set-cookie").split(';')[0];
  const jsonRes = await csrfRes0.json();
  const csrfToken = jsonRes.csrfToken || jsonRes.data?.csrfToken || jsonRes;

  const loginRes = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken, "Cookie": initCookie },
    body: JSON.stringify({ identifier: "admin", password: "admin" })
  });
  console.log("Login status:", loginRes.status);
  const cookieHeader = loginRes.headers.get("set-cookie") || initCookie;
  const cookie = cookieHeader ? cookieHeader.split(';')[0] : "";
  console.log("Login cookie:", cookie);

  const socket = io("ws://localhost:3000", {
    transports: ["websocket"],
    extraHeaders: { Cookie: cookie }
  });

  socket.on("connect", () => console.log("WS Connected 1!"));
  socket.on("connect_error", (err) => console.log("WS Error 1:", err.message));

  await new Promise(r => setTimeout(r, 1000));
  socket.disconnect();

  console.log("Simulating reload: fetching CSRF...");
  const csrfRes = await fetch("http://localhost:3000/csrf", {
    headers: { Cookie: cookie }
  });
  const csrfCookieHeader = csrfRes.headers.get("set-cookie");
  console.log("CSRF response cookie header:", csrfCookieHeader);
  // fetchCsrf might return a NEW session cookie if the store doesn't recognize the old one,
  // or it might just return nothing if the cookie is still valid and not rolled.
  const finalCookie = (csrfCookieHeader && csrfCookieHeader.includes('connect.sid')) 
    ? csrfCookieHeader.split(';')[0] : cookie;
  
  console.log("Final cookie for WS:", finalCookie);

  const socket2 = io("ws://localhost:3000", {
    transports: ["websocket"],
    extraHeaders: { Cookie: finalCookie }
  });

  socket2.on("connect", () => console.log("WS Connected 2!"));
  socket2.on("connect_error", (err) => console.log("WS Error 2:", err.message));
  
  await new Promise(r => setTimeout(r, 1000));
  socket2.disconnect();
}
test();
