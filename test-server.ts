#!/usr/bin/env bun

// Simple test to verify the server starts and responds
import { spawn } from 'child_process';

console.log('Starting Signoz MCP server test...');

const server = spawn('bun', ['run', 'src/server.ts'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    SIGNOZ_API_KEY: process.env.SIGNOZ_API_KEY,
    SIGNOZ_BASE_URL: process.env.SIGNOZ_BASE_URL || 'http://localhost:8081',
  },
});

let responseCount = 0;
const expectedResponses = 2;

// Test 1: List tools
const listToolsRequest = {
  jsonrpc: '2.0',
  method: 'tools/list',
  id: 1,
};

// Test 2: Test connection
const testConnectionRequest = {
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'test_connection',
    arguments: {},
  },
  id: 2,
};

// Send list tools request first
setTimeout(() => {
  console.log('\nSending list tools request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 500);

// Send test connection request after a delay
setTimeout(() => {
  console.log('\nSending test connection request...');
  server.stdin.write(JSON.stringify(testConnectionRequest) + '\n');
}, 1500);

server.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('\nServer response:', response);
  
  try {
    const parsed = JSON.parse(response);
    if (parsed.id === 1) {
      console.log('✅ Tools list received');
    } else if (parsed.id === 2) {
      console.log('✅ Connection test completed');
      if (parsed.result?.content?.[0]?.text) {
        console.log('\nConnection test result:');
        console.log(parsed.result.content[0].text);
      }
    }
  } catch (e) {
    // Response might be partial or stderr logging
  }
  
  responseCount++;
  if (responseCount >= expectedResponses) {
    setTimeout(() => {
      console.log('\n✅ All tests completed successfully');
      server.kill();
      process.exit(0);
    }, 500);
  }
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

setTimeout(() => {
  console.log('Test timed out');
  server.kill();
  process.exit(1);
}, 5000);