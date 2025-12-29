import { createRequestHandler } from "@remix-run/node";
import { createServer } from "http";
import process from "process";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Dynamically import the build to ensure it's loaded correctly
const build = await import("./build/server/index.js");

const buildToUse = build.default || build;

console.log("=== DEBUG BUILD OBJECT ===");
console.log("Using build.default?", !!build.default);
console.log("buildToUse keys:", Object.keys(buildToUse));
console.log("buildToUse.routes:", typeof buildToUse.routes, buildToUse.routes === null ? "null" : buildToUse.routes === undefined ? "undefined" : "exists");
console.log("buildToUse.entry:", typeof buildToUse.entry);
console.log("buildToUse.isSpaMode:", buildToUse.isSpaMode);

const handler = createRequestHandler({
  build: buildToUse,
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
