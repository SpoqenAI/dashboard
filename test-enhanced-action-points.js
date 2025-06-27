#!/usr/bin/env node

/**
 * Test script for enhanced action points extraction
 * Tests the new VAPI-native analysis with various data scenarios
 */

const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;

if (!apiKey) {
  console.error('❌ VAPI_PRIVATE_KEY environment variable is required');
  console.log('Set your VAPI private key:');
  console.log('export VAPI_PRIVATE_KEY=your_vapi_private_key_here');
  process.exit(1);
}

async function testActionPointsExtraction() {
  console.log('🧪 Testing Enhanced Action Points Extraction');
  console.log('==========================================\n');

  // Test with different call scenarios
  const testScenarios = [
    {
      name: 'Recent Real Call',
      description: 'Testing with a recent call from your VAPI account',
    },
    {
      name: 'Mock Structured Data',
      description: 'Testing extraction logic with mock VAPI data',
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`📋 ${scenario.name}: ${scenario.description}`);
    console.log('─'.repeat(50));

    if (scenario.name === 'Recent Real Call') {
      await testWithRecentCall();
    } else if (scenario.name === 'Mock Structured Data') {
      await testWithMockData();
    }

    console.log('');
  }
}

async function testWithRecentCall() {
  try {
    // Fetch recent calls
    console.log('🔍 Fetching recent calls...');
    const callsResponse = await fetch(`${baseUrl}/call`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!callsResponse.ok) {
      throw new Error(`Failed to fetch calls: ${callsResponse.status}`);
    }

    const callsData = await callsResponse.json();
    const recentCalls = callsData.filter(call => 
      call.status === 'completed' && 
      (call.analysis || call.transcript)
    ).slice(0, 3);

    if (recentCalls.length === 0) {
      console.log('⚠️  No recent calls with analysis found. Skipping real call test.');
      return;
    }

    for (const call of recentCalls) {
      console.log(`\n🎯 Testing Call ID: ${call.id}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Duration: ${call.durationSeconds || 0}s`);
      console.log(`   Has Analysis: ${!!call.analysis}`);
      console.log(`   Has Transcript: ${!!call.transcript}`);

      // Test action points extraction
      const actionPointsResponse = await fetch(`http://localhost:3000/api/vapi/calls/${call.id}/action-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (actionPointsResponse.ok) {
        const result = await actionPointsResponse.json();
        console.log('\n✅ Action Points Extracted:');
        console.log('   📌 Key Points:', result.actionPoints.keyPoints.length);
        result.actionPoints.keyPoints.forEach(point => 
          console.log(`      • ${point}`)
        );
        
        console.log('   📋 Follow-up Items:', result.actionPoints.followUpItems.length);
        result.actionPoints.followUpItems.forEach(item => 
          console.log(`      • ${item}`)
        );
        
        console.log('   🚨 Urgent Concerns:', result.actionPoints.urgentConcerns.length);
        result.actionPoints.urgentConcerns.forEach(concern => 
          console.log(`      • ${concern}`)
        );
        
        console.log(`   😊 Sentiment: ${result.actionPoints.sentiment}`);
        console.log(`   🎯 Call Purpose: ${result.actionPoints.callPurpose}`);
      } else {
        console.log(`❌ Failed to extract action points: ${actionPointsResponse.status}`);
        const error = await actionPointsResponse.text();
        console.log(`   Error: ${error}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error testing with recent calls: ${error.message}`);
  }
}

async function testWithMockData() {
  console.log('🧪 Testing extraction logic with various mock data scenarios...\n');

  const mockScenarios = [
    {
      name: 'Complete Structured Data',
      data: {
        analysis: {
          summary: 'Client interested in 3-bedroom home in downtown area with $500k budget.',
          structuredData: {
            callPurpose: 'Home buying consultation',
            sentiment: 'positive',
            keyPoints: [
              'Looking for 3-bedroom home',
              'Prefers downtown location',
              'Budget up to $500,000'
            ],
            followUpItems: [
              'Send listings matching criteria',
              'Schedule property viewings',
              'Arrange pre-approval meeting'
            ],
            urgentConcerns: [
              'Market moving fast, need to act quickly'
            ]
          },
          successEvaluation: true
        },
        transcript: 'Hi, I am looking for a house...'
      }
    },
    {
      name: 'Summary Only (No Structured Data)',
      data: {
        analysis: {
          summary: 'Seller wants to list their property. Mentioned they need to sell urgently due to job relocation. Discussed pricing strategy and market conditions.',
        },
        transcript: 'I need to sell my house quickly because I got a new job in another state...'
      }
    },
    {
      name: 'Transcript Only (No Analysis)',
      data: {
        transcript: 'Hello, I am interested in buying an investment property. I have about $300,000 to invest and looking for rental properties that would give good returns. Can you help me find something?'
      }
    },
    {
      name: 'Legacy Field Names',
      data: {
        analysis: {
          summary: 'Investment consultation call.',
          structuredData: {
            actionItems: ['Research investment areas', 'Calculate ROI projections'],
            urgentItems: ['Client traveling next week, needs info before then'],
            keyPoints: ['Investment property focus', 'ROI is primary concern']
          }
        }
      }
    }
  ];

  for (const scenario of mockScenarios) {
    console.log(`📊 ${scenario.name}`);
    console.log('─'.repeat(30));

    try {
      // We'll simulate the extraction logic here
      const extractedPoints = simulateExtraction(scenario.data);
      
      console.log('✅ Extracted Action Points:');
      console.log(`   📌 Key Points (${extractedPoints.keyPoints.length}):`);
      extractedPoints.keyPoints.forEach(point => 
        console.log(`      • ${point}`)
      );
      
      console.log(`   📋 Follow-ups (${extractedPoints.followUpItems.length}):`);
      extractedPoints.followUpItems.forEach(item => 
        console.log(`      • ${item}`)
      );
      
      console.log(`   🚨 Urgent (${extractedPoints.urgentConcerns.length}):`);
      extractedPoints.urgentConcerns.forEach(concern => 
        console.log(`      • ${concern}`)
      );
      
      console.log(`   😊 Sentiment: ${extractedPoints.sentiment}`);
      console.log(`   🎯 Purpose: ${extractedPoints.callPurpose}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
}

// Simplified simulation of the extraction logic for testing
function simulateExtraction(callData) {
  const analysis = callData.analysis || {};
  const summary = analysis.summary || '';
  const transcript = callData.transcript || '';
  const structured = analysis.structuredData || {};

  // Mock the key extraction logic
  const keyPoints = [];
  const followUpItems = [];
  const urgentConcerns = [];

  // Extract from structured data first
  if (structured.keyPoints) {
    keyPoints.push(...structured.keyPoints);
  }
  if (structured.followUpItems) {
    followUpItems.push(...structured.followUpItems);
  }
  if (structured.actionItems) {
    followUpItems.push(...structured.actionItems);
  }
  if (structured.urgentConcerns) {
    urgentConcerns.push(...structured.urgentConcerns);
  }
  if (structured.urgentItems) {
    urgentConcerns.push(...structured.urgentItems);
  }

  // Fallback extraction from text
  if (keyPoints.length === 0 && summary) {
    const summaryPoints = extractPointsFromText(summary);
    keyPoints.push(...summaryPoints);
  }

  if (followUpItems.length === 0) {
    const actions = extractActionsFromText(summary || transcript);
    followUpItems.push(...actions);
  }

  // Determine purpose
  let callPurpose = 'General inquiry';
  if (structured.callPurpose) {
    callPurpose = structured.callPurpose;
  } else {
    callPurpose = extractPurposeFromText(summary || transcript);
  }

  // Determine sentiment
  let sentiment = 'neutral';
  if (structured.sentiment) {
    sentiment = structured.sentiment;
  } else if (analysis.successEvaluation) {
    sentiment = analysis.successEvaluation ? 'positive' : 'negative';
  }

  return {
    keyPoints,
    followUpItems,
    urgentConcerns,
    sentiment,
    callPurpose
  };
}

function extractPointsFromText(text) {
  if (!text) return [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  return sentences.slice(0, 2).map(s => s.trim());
}

function extractActionsFromText(text) {
  if (!text) return [];
  const actions = [];
  if (text.includes('schedule') || text.includes('send') || text.includes('call')) {
    actions.push('Follow up with client');
  }
  if (text.includes('meeting') || text.includes('appointment')) {
    actions.push('Schedule meeting');
  }
  return actions;
}

function extractPurposeFromText(text) {
  if (!text) return 'General inquiry';
  const lower = text.toLowerCase();
  if (lower.includes('buy') || lower.includes('purchase')) return 'Home buying inquiry';
  if (lower.includes('sell') || lower.includes('list')) return 'Home selling consultation';
  if (lower.includes('invest')) return 'Investment consultation';
  if (lower.includes('rent')) return 'Rental inquiry';
  return 'General real estate inquiry';
}

// Run the tests
if (require.main === module) {
  testActionPointsExtraction()
    .then(() => {
      console.log('🎉 Testing completed!');
      console.log('\n💡 Next steps:');
      console.log('   • Try the action points feature in your dashboard');
      console.log('   • Check the enhanced extraction with real call data');
      console.log('   • Verify VAPI analysis configuration for best results');
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testActionPointsExtraction }; 