(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const el = {
    start: $("start-button"), buttonLabel: $("button-label"), message: $("test-message"),
    number: $("gauge-number"), caption: $("gauge-caption"), unit: $("gauge-unit"),
    phase: $("gauge-phase"), foot: $("gauge-foot-text"), ring: $("gauge-ring"),
    progress: $("progress-fill"), connection: $("connection-label"),
    download: $("download-value"), upload: $("upload-value"), ping: $("ping-value"),
    jitter: $("jitter-value"), downloadBar: $("download-bar"), uploadBar: $("upload-bar"),
    downloadState: $("download-state"), uploadState: $("upload-state"),
    location: $("location-value"), country: $("country-value"), flag: $("country-flag"),
    isp: $("isp-value"), ip: $("ip-value"), copy: $("copy-ip"),
    locationStatus: $("location-status"), ispStatus: $("isp-status"), ipStatus: $("ip-status"),
    historyTitle: $("history-title"), historySubtitle: $("history-subtitle")
  };
  const state = { running: false, results: null, animationFrame: 0 };
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const format = (n, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : "—";

  function setProgress(value) { el.progress.style.width = Math.max(0, Math.min(100, value)) + "%"; }
  function animateNumber(node, target, digits = 1, suffix = "") {
    const start = performance.now(), duration = 450;
    const from = Number.parseFloat(node.textContent) || 0;
    const step = now => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = (from + (target - from) * eased).toFixed(digits) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function setGauge(value, phase, caption = "YOUR SPEED", unit = "Mbps", progress = 0) {
    el.number.textContent = Number.isFinite(value) ? format(value, value >= 100 ? 0 : 1) : "—";
    el.caption.textContent = caption;
    el.unit.textContent = unit;
    el.phase.textContent = phase;
    el.ring.style.setProperty("--progress", (Math.max(0, Math.min(100, progress)) * 3.6) + "deg");
  }
  function updateMetric(kind, value, digits = 1) {
    const node = el[kind];
    if (node) node.textContent = format(value, digits);
  }
  async function timedFetch(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" }); }
    finally { clearTimeout(timer); }
  }
  async function latencySample() {
    const start = performance.now();
    const response = await timedFetch("https://speed.cloudflare.com/__down?bytes=0&nt=" + Date.now(), { cache: "no-store" }, 8000);
    if (!response.ok) throw new Error("Latency endpoint unavailable");
    await response.arrayBuffer();
    return performance.now() - start;
  }
  async function measureLatency(samples = 7) {
    const values = [];
    for (let i = 0; i < samples; i++) {
      try { values.push(await latencySample()); } catch (_) { /* continue; network may block the test endpoint */ }
      setProgress(5 + (i + 1) / samples * 15);
      await sleep(90);
    }
    if (!values.length) throw new Error("Could not reach the test server. Check your connection or browser extensions.");
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const diffs = values.slice(1).map((v, i) => Math.abs(v - values[i]));
    const jitter = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
    return { ping: median, jitter };
  }
  async function measureDownload() {
    const sizes = [1_000_000, 5_000_000, 10_000_000];
    const speeds = [];
    for (let i = 0; i < sizes.length; i++) {
      const bytes = sizes[i], started = performance.now();
      const response = await timedFetch("https://speed.cloudflare.com/__down?bytes=" + bytes + "&nt=" + Date.now(), { cache: "no-store" }, 30000);
      if (!response.ok) throw new Error("Download test failed (HTTP " + response.status + ").");
      const data = await response.arrayBuffer();
      const seconds = (performance.now() - started) / 1000;
      speeds.push(data.byteLength * 8 / seconds / 1_000_000);
      setProgress(20 + (i + 1) / sizes.length * 35);
      setGauge(speeds[speeds.length - 1], "DOWNLOADING", "DOWNLOAD SPEED", "Mbps", Math.min(100, speeds[speeds.length - 1] / 2));
      updateMetric("download", speeds[speeds.length - 1]);
      el.downloadState.textContent = "TESTING";
      el.downloadBar.style.width = Math.min(100, speeds[speeds.length - 1] / 2) + "%";
    }
    return speeds[speeds.length - 1];
  }
  async function measureUpload() {
    const sizes = [1_000_000, 5_000_000];
    const speeds = [];
    for (let i = 0; i < sizes.length; i++) {
      const bytes = sizes[i], payload = new Blob([new Uint8Array(bytes)]);
      const started = performance.now();
      const response = await timedFetch("https://speed.cloudflare.com/__up?nt=" + Date.now(), {
        method: "POST", body: payload, headers: { "Content-Type": "application/octet-stream" }
      }, 30000);
      if (!response.ok) throw new Error("Upload test failed (HTTP " + response.status + ").");
      await response.arrayBuffer().catch(() => {});
      const seconds = (performance.now() - started) / 1000;
      speeds.push(bytes * 8 / seconds / 1_000_000);
      setProgress(55 + (i + 1) / sizes.length * 30);
      setGauge(speeds[speeds.length - 1], "UPLOADING", "UPLOAD SPEED", "Mbps", Math.min(100, speeds[speeds.length - 1] / 2));
      updateMetric("upload", speeds[speeds.length - 1]);
      el.uploadState.textContent = "TESTING";
      el.uploadBar.style.width = Math.min(100, speeds[speeds.length - 1] / 2) + "%";
    }
    return speeds[speeds.length - 1];
  }
  async function detectNetwork() {
    try {
      const response = await timedFetch("https://ipapi.co/json/", {}, 9000);
      if (!response.ok) throw new Error("IP lookup unavailable");
      const d = await response.json();
      if (d.error) throw new Error(d.reason || "IP lookup unavailable");
      el.ip.textContent = d.ip || "Unavailable";
      el.location.textContent = d.city || d.region || "Location unavailable";
      el.country.textContent = [d.region && d.city ? d.region : null, d.country_name].filter(Boolean).join(", ") || "Country unavailable";
      el.flag.textContent = d.country_code ? countryFlag(d.country_code) : "🌐";
      el.isp.textContent = d.org || d.asn || "Provider unavailable";
      el.locationStatus.textContent = d.city && d.country_name ? "DETECTED" : "PARTIAL";
      el.ispStatus.textContent = d.org || d.asn ? "DETECTED" : "UNKNOWN";
      el.ipStatus.textContent = d.ip ? "DETECTED" : "UNKNOWN";
      el.copy.disabled = !d.ip;
    } catch (_) {
      ["location", "isp", "ip"].forEach(k => { el[k].textContent = "Unavailable"; });
      el.country.textContent = "IP lookup service could not be reached";
      el.locationStatus.textContent = el.ispStatus.textContent = el.ipStatus.textContent = "OFFLINE";
    }
  }
  function countryFlag(code) {
    return [...String(code).toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
  }
  async function runTest() {
    if (state.running) return;
    state.running = true;
    el.start.disabled = true; el.buttonLabel.textContent = "TEST IN PROGRESS";
    el.connection.textContent = "TEST RUNNING"; el.message.textContent = "Measuring latency first, then download and upload. Keep this tab open.";
    el.downloadState.textContent = el.uploadState.textContent = "WAITING";
    el.foot.textContent = "Measuring your connection";
    setProgress(2);
    const results = {};
    try {
      el.phase.textContent = "MEASURING PING"; setProgress(4);
      const latency = await measureLatency(7);
      results.ping = latency.ping; results.jitter = latency.jitter;
      updateMetric("ping", latency.ping); updateMetric("jitter", latency.jitter);
      setProgress(20);
      results.download = await measureDownload();
      results.upload = await measureUpload();
      setProgress(100);
      el.downloadState.textContent = el.uploadState.textContent = "COMPLETE";
      el.connection.textContent = "TEST COMPLETE"; el.foot.textContent = "Measurement complete";
      setGauge(results.download, "TEST COMPLETE", "DOWNLOAD SPEED", "Mbps", Math.min(100, results.download / 2));
      el.message.textContent = "Test complete. Speeds can vary with Wi-Fi, server load, VPNs and other network activity.";
      el.historyTitle.textContent = format(results.download) + " Mbps down · " + format(results.upload) + " Mbps up";
      el.historySubtitle.textContent = "Ping " + format(results.ping) + " ms · Jitter " + format(results.jitter) + " ms · " + new Date().toLocaleString();
      state.results = results;
    } catch (error) {
      el.connection.textContent = "TEST INTERRUPTED"; el.phase.textContent = "TEST COULD NOT FINISH";
      el.foot.textContent = "Connection test interrupted";
      el.message.textContent = (error && error.message) || "The test could not finish. Check your connection and try again.";
      el.message.textContent += " Some networks or browser extensions block the test service.";
    } finally {
      state.running = false; el.start.disabled = false; el.buttonLabel.textContent = "RUN TEST AGAIN";
      await sleep(250); setProgress(0);
    }
  }
  el.start.addEventListener("click", runTest);
  el.reset = $("reset-button");
  el.reset.addEventListener("click", () => {
    if (state.running) return;
    ["download", "upload", "ping", "jitter"].forEach(k => updateMetric(k, NaN));
    el.downloadState.textContent = el.uploadState.textContent = "—";
    el.downloadBar.style.width = el.uploadBar.style.width = "0";
    el.connection.textContent = "READY TO TEST"; el.buttonLabel.textContent = "START SPEED TEST";
    el.phase.textContent = "READY WHEN YOU ARE"; el.caption.textContent = "YOUR SPEED"; el.unit.textContent = "Mbps";
    el.number.textContent = "—"; el.ring.style.setProperty("--progress", "0deg");
    el.foot.textContent = "Waiting for test";
    el.message.textContent = "For the most accurate result, pause downloads and streaming on other devices.";
    el.historyTitle.textContent = "No test completed yet"; el.historySubtitle.textContent = "Run a test to see your latest session here.";
    setProgress(0); state.results = null;
  });
  el.copy.addEventListener("click", async () => {
    const ip = el.ip.textContent;
    if (!ip || ip === "—" || ip === "Unavailable") return;
    try {
      await navigator.clipboard.writeText(ip);
      el.copy.textContent = "✓"; setTimeout(() => { el.copy.textContent = "▢"; }, 1200);
    } catch (_) { el.message.textContent = "Clipboard access was blocked by the browser."; }
  });
  detectNetwork();
})();