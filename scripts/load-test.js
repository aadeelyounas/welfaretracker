#!/usr/bin/env node
/**
 * Phase 2 Load Testing Script
 * Tests database optimizations and caching performance
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.TEST_URL || 'http://localhost:9002';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 5;
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER) || 10;

class LoadTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      startTime: 0,
      endTime: 0
    };
  }

  async makeRequest(endpoint) {
    const startTime = performance.now();
    const url = `${BASE_URL}${endpoint}`;
    
    return new Promise((resolve, reject) => {
      const request = (url.startsWith('https') ? https : http).get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          const responseTime = performance.now() - startTime;
          
          this.results.totalRequests++;
          this.results.totalResponseTime += responseTime;
          this.results.responseTimes.push(responseTime);
          
          if (responseTime < this.results.minResponseTime) {
            this.results.minResponseTime = responseTime;
          }
          if (responseTime > this.results.maxResponseTime) {
            this.results.maxResponseTime = responseTime;
          }
          
          if (response.statusCode >= 200 && response.statusCode < 300) {
            this.results.successfulRequests++;
            resolve({ statusCode: response.statusCode, responseTime, data: JSON.parse(data) });
          } else {
            this.results.failedRequests++;
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        });
      });
      
      request.on('error', (error) => {
        this.results.failedRequests++;
        this.results.totalRequests++;
        reject(error);
      });
      
      request.setTimeout(10000, () => {
        this.results.failedRequests++;
        this.results.totalRequests++;
        reject(new Error('Request timeout'));
      });
    });
  }

  async simulateUser(userId) {
    console.log(`🚀 Starting user ${userId} with ${REQUESTS_PER_USER} requests`);
    
    const endpoints = [
      '/api/employees?includeWelfare=true',
      '/api/dashboard/stats',
      '/api/welfare-events',
      '/api/performance',
    ];
    
    for (let i = 0; i < REQUESTS_PER_USER; i++) {
      try {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const result = await this.makeRequest(endpoint);
        
        if (i % 5 === 0) {
          console.log(`👤 User ${userId}: Request ${i + 1}/${REQUESTS_PER_USER} to ${endpoint} - ${result.responseTime.toFixed(2)}ms`);
        }
        
        // Small delay between requests to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      } catch (error) {
        console.error(`❌ User ${userId} request failed:`, error.message);
      }
    }
    
    console.log(`✅ User ${userId} completed all requests`);
  }

  async runLoadTest() {
    console.log('🧪 Starting Phase 2 Load Test');
    console.log(`📊 Configuration: ${CONCURRENT_USERS} users, ${REQUESTS_PER_USER} requests each`);
    console.log(`🎯 Target: ${BASE_URL}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    this.results.startTime = performance.now();
    
    // Create concurrent users
    const userPromises = [];
    for (let i = 1; i <= CONCURRENT_USERS; i++) {
      userPromises.push(this.simulateUser(i));
    }
    
    // Wait for all users to complete
    await Promise.all(userPromises);
    
    this.results.endTime = performance.now();
    this.printResults();
  }

  printResults() {
    const totalTime = (this.results.endTime - this.results.startTime) / 1000;
    const avgResponseTime = this.results.totalResponseTime / this.results.successfulRequests;
    const requestsPerSecond = this.results.totalRequests / totalTime;
    
    // Calculate percentiles
    const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    console.log('\n📊 PHASE 2 LOAD TEST RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⏱️  Total Test Time: ${totalTime.toFixed(2)}s`);
    console.log(`📈 Total Requests: ${this.results.totalRequests}`);
    console.log(`✅ Successful: ${this.results.successfulRequests} (${((this.results.successfulRequests/this.results.totalRequests)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${this.results.failedRequests} (${((this.results.failedRequests/this.results.totalRequests)*100).toFixed(1)}%)`);
    console.log(`🚀 Requests/sec: ${requestsPerSecond.toFixed(2)}`);
    console.log('');
    console.log('⚡ RESPONSE TIME ANALYSIS:');
    console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Minimum: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`  Maximum: ${this.results.maxResponseTime.toFixed(2)}ms`);
    console.log(`  50th percentile: ${(p50 || 0).toFixed(2)}ms`);
    console.log(`  95th percentile: ${(p95 || 0).toFixed(2)}ms`);
    console.log(`  99th percentile: ${(p99 || 0).toFixed(2)}ms`);
    console.log('');
    
    // Performance assessment
    let status = '🔴 NEEDS OPTIMIZATION';
    if (avgResponseTime < 100 && p95 < 200) {
      status = '🟢 EXCELLENT PERFORMANCE';
    } else if (avgResponseTime < 300 && p95 < 500) {
      status = '🟡 GOOD PERFORMANCE';
    }
    
    console.log(`🎯 Performance Status: ${status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// Run the load test
if (require.main === module) {
  const tester = new LoadTester();
  tester.runLoadTest().catch(console.error);
}

module.exports = LoadTester;
