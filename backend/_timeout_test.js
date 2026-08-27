// Unit test for fetchWithTimeout: a server that accepts but never responds
// must cause an AbortError (not hang). Verifies the contemplative-timeout fix.
const http = require("http");
const { fetchWithTimeout } = require("./server.js");

// 1) A server that accepts connections but sends nothing (simulates a hung model)
const hung = http.createServer(() => { /* never respond */ });
hung.listen(0, async () => {
  const port = hung.address().port;
  const start = Date.now();
  try {
    await fetchWithTimeout(`http://127.0.0.1:${port}/`, {}, 1500);
    console.log("FAIL: expected abort, got a response");
    process.exit(1);
  } catch (e) {
    const ms = Date.now() - start;
    console.log("ERR name=", e.name, "msg=", e.message);
    const ok = e.name === "AbortError" && ms >= 1400 && ms < 4000;
    console.log(`aborted: name=${e.name} in ${ms}ms -> ${ok ? "PASS" : "FAIL"}`);
    hung.close();
    process.exit(ok ? 0 : 1);
  }
});
