# NXT-SPEED

A futuristic, responsive browser-based internet speed test. Built with plain HTML, CSS and JavaScript so it can be hosted directly on GitHub Pages without a build step.

## Features

- Download and upload throughput estimates in Mbps
- Ping (latency) and jitter estimates in milliseconds
- Animated circular speed gauge and live metric cards
- Public IP, approximate city/country, country flag and ISP/network lookup
- Responsive dark UI for desktop and mobile
- Copy public IP and reset the latest test display
- Reduced-motion accessibility support

## Run locally

1. Download or clone this repository.
2. Keep `index.html`, `style.css` and `script.js` in the same folder.
3. Open `index.html` in a modern browser. For the most consistent results, use a local web server or GitHub Pages over HTTPS.

No npm install or build command is required.

## Publish with GitHub Pages

1. Open **Settings** in the [NXT-SPEED repository](https://github.com/anirudhadebbarma031214-commits/NXT-SPEED).
2. Choose **Pages** in the sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/(root)`, then save.
5. Wait for the Pages deployment to finish. The site URL will appear in the Pages settings.

If your default branch is not named `main`, select the actual default branch.

## How measurements work

- Latency uses repeated small requests to Cloudflare's speed-test endpoint. Ping is the median observed round-trip time; jitter is the mean absolute difference between consecutive samples.
- Download uses timed requests for several payload sizes and reports the final sample's estimated throughput.
- Upload posts generated data to Cloudflare's speed-test endpoint and estimates throughput from the transfer duration.
- ISP and approximate location are requested from the public [ipapi.co](https://ipapi.co/) JSON endpoint.

These are browser-side estimates, not certified measurements. Results depend on the test server, browser, device, Wi-Fi, VPN, network congestion, and other traffic. A browser speed test cannot reliably measure ICMP ping, and the displayed ping is HTTP request latency. If the endpoints are blocked by a network, browser extension, CORS policy, or service limit, a test may fail. The free IP lookup service may have usage limits or return incomplete details.

## Privacy

The app requests IP/location metadata from ipapi.co and transfers test data to Cloudflare's speed-test endpoint. Those services will receive the network requests and can observe the public IP address. The app does not save a test history to a server or use an app-owned analytics backend. Only run it if you are comfortable contacting those third-party services.

## Files

- `index.html` — accessible page structure and UI
- `style.css` — responsive styling, gauge effects and animations
- `script.js` — speed measurements, IP lookup and UI interactions

## License

Choose a license before distributing this project publicly.