import { createRequestHandler } from "@remix-run/node";
import { createServer } from "http";
import process from "process";
import * as build from "./build/server/index.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";

const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || "production",
});

const server = createServer(handler);

// Enable Keep-Alive for persistent connections
// This allows Shopify to reuse connections for webhook delivery
server.keepAliveTimeout = 65000; // 65 seconds (longer than load balancer's 60s)
server.headersTimeout = 66000; // Slightly longer than keepAliveTimeout

server.listen(PORT, HOST, () => {
  console.log(`Remix server listening on http://${HOST}:${PORT}`);
  console.log(`Keep-Alive enabled: timeout=${server.keepAliveTimeout}ms`);
});
