#!/usr/bin/env node

import { main } from "./server";

// Run the MCP server
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
