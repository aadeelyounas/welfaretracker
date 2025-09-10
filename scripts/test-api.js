#!/usr/bin/env node

/**
 * API Test Suite for Welfare Tracker
 * 
 * This script tests all API endpoints in both development and production modes.
 */

const API_BASE = process.env.API_BASE || 'http://localhost:9002';

async function testAPI() {
  console.log('🧪 Testing Welfare Tracker API');
  console.log('📍 API Base URL:', API_BASE);
  console.log('');

  let allPassed = true;

  // Test 1: Get all events
  try {
    console.log('📋 Test 1: GET /api/welfare-events');
    const response = await fetch(`${API_BASE}/api/welfare-events`);
    const data = await response.json();
    
    if (response.ok && Array.isArray(data)) {
      console.log('✅ PASS - Retrieved', data.length, 'events');
    } else {
      console.log('❌ FAIL - Invalid response');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error.message);
    allPassed = false;
  }

  // Test 2: Get raw data
  try {
    console.log('📋 Test 2: GET /api/welfare-events?format=raw');
    const response = await fetch(`${API_BASE}/api/welfare-events?format=raw`);
    const text = await response.text();
    
    if (response.ok && text.startsWith('[')) {
      console.log('✅ PASS - Retrieved raw JSON data');
    } else {
      console.log('❌ FAIL - Invalid raw data response');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error.message);
    allPassed = false;
  }

  // Test 3: Create new event
  try {
    console.log('📋 Test 3: POST /api/welfare-events');
    const newEvent = {
      name: 'Test User',
      eventType: 'Welfare Call',
      welfareDate: new Date().toISOString(),
      followUpCompleted: false,
      notes: 'Test event created by API test'
    };

    const response = await fetch(`${API_BASE}/api/welfare-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newEvent),
    });
    
    const data = await response.json();
    
    if (response.ok && data.id && data.name === 'Test User') {
      console.log('✅ PASS - Created event with ID:', data.id);
      
      // Test 4: Update the created event
      try {
        console.log('📋 Test 4: PUT /api/welfare-events/' + data.id);
        const updateResponse = await fetch(`${API_BASE}/api/welfare-events/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes: 'Updated test event'
          }),
        });
        
        const updateData = await updateResponse.json();
        
        if (updateResponse.ok && updateData.notes === 'Updated test event') {
          console.log('✅ PASS - Updated event successfully');
        } else {
          console.log('❌ FAIL - Update failed');
          allPassed = false;
        }
      } catch (error) {
        console.log('❌ FAIL - Update error:', error.message);
        allPassed = false;
      }

      // Test 5: Delete the created event
      try {
        console.log('📋 Test 5: DELETE /api/welfare-events/' + data.id);
        const deleteResponse = await fetch(`${API_BASE}/api/welfare-events/${data.id}`, {
          method: 'DELETE',
        });
        
        if (deleteResponse.ok) {
          console.log('✅ PASS - Deleted event successfully');
        } else {
          console.log('❌ FAIL - Delete failed');
          allPassed = false;
        }
      } catch (error) {
        console.log('❌ FAIL - Delete error:', error.message);
        allPassed = false;
      }

    } else {
      console.log('❌ FAIL - Create failed');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error.message);
    allPassed = false;
  }

  console.log('');
  if (allPassed) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

// Run tests
testAPI().catch(console.error);
