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

server.listen(PORT, HOST, () => {
  console.log(`Remix server listening on http://${HOST}:${PORT}`);
});
