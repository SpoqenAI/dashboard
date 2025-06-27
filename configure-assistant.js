// Helper script to configure your VAPI assistant for action points analysis
// Usage: node configure-assistant.js [ASSISTANT_ID]
// If no assistant ID is provided, it will use VAPI_ASSISTANT_ID from environment

const assistantId = process.argv[2] || process.env.VAPI_ASSISTANT_ID;

if (!assistantId) {
  console.error('❌ No assistant ID provided');
  console.log('Usage: node configure-assistant.js [ASSISTANT_ID]');
  console.log('Or set VAPI_ASSISTANT_ID environment variable');
  console.log('');
  console.log('To find your assistant ID:');
  console.log('1. Go to your VAPI dashboard at https://dashboard.vapi.ai');
  console.log('2. Navigate to Assistants');
  console.log('3. Copy the ID of the assistant you want to configure');
  process.exit(1);
}

console.log(
  `🔧 Configuring assistant ${assistantId} for action points analysis...`
);

const configureAssistant = async () => {
  try {
    // Get base URL from environment variable or use localhost as fallback
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/vapi/configure-action-points`;

    console.log(`🌐 Using API URL: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistantId }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Assistant configured successfully!');
      console.log('📋 Details:', result);
      console.log('');
      console.log('🎉 Your assistant is now ready to generate action points!');
      console.log(
        'New calls made with this assistant will automatically include:'
      );
      console.log('  • Call purpose analysis');
      console.log('  • Sentiment detection');
      console.log('  • Key discussion points');
      console.log('  • Follow-up action items');
      console.log('  • Urgent concerns identification');
      console.log('');
      console.log(
        '⚠️  Note: This only affects NEW calls. Existing calls will still show "Analysis not available"'
      );
      console.log(
        '   because they were made before the assistant was configured.'
      );
    } else {
      console.error('❌ Configuration failed:', result);
    }
  } catch (error) {
    console.error('❌ Error configuring assistant:', error.message);
    console.log('');
    console.log('💡 Make sure your development server is running:');
    console.log('   npm run dev');
  }
};

configureAssistant();
