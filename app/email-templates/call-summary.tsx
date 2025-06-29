export default function CallSummaryEmail() {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        color: '#333',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#4f46e5', margin: '0' }}>Spoqen</h1>
        <p style={{ color: '#666', margin: '5px 0 0' }}>Your AI Receptionist</p>
      </div>

      <div
        style={{
          background: '#f9fafb',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ margin: '0 0 15px', color: '#111' }}>Call Summary</h2>
        <p style={{ margin: '0 0 10px' }}>
          <strong>Date:</strong> May 24, 2025
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <strong>Time:</strong> 10:30 AM
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <strong>Duration:</strong> 3 minutes, 42 seconds
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3
          style={{
            borderBottom: '1px solid #eee',
            paddingBottom: '10px',
            color: '#111',
          }}
        >
          Caller Information
        </h3>
        <p style={{ margin: '10px 0' }}>
          <strong>Name:</strong> Sarah Johnson
        </p>
        <p style={{ margin: '10px 0' }}>
          <strong>Phone:</strong> (555) 123-4567
        </p>
        <p style={{ margin: '10px 0' }}>
          <strong>Best time to call back:</strong> After 5 PM today
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3
          style={{
            borderBottom: '1px solid #eee',
            paddingBottom: '10px',
            color: '#111',
          }}
        >
          Call Details
        </h3>
        <div style={{ margin: '15px 0' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 5px' }}>
            Are you looking to buy, sell, or ask about a property?
          </p>
          <p
            style={{
              margin: '0 0 15px',
              padding: '10px',
              background: '#f3f4f6',
              borderRadius: '4px',
            }}
          >
            "I'm interested in buying a property. I saw a 3-bedroom house listed
            on Oak Street and wanted to get more information about it."
          </p>
        </div>
        <div style={{ margin: '15px 0' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 5px' }}>
            What's your name and the best number to reach you?
          </p>
          <p
            style={{
              margin: '0 0 15px',
              padding: '10px',
              background: '#f3f4f6',
              borderRadius: '4px',
            }}
          >
            "My name is Sarah Johnson. You can reach me at this number, (555)
            123-4567."
          </p>
        </div>
        <div style={{ margin: '15px 0' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 5px' }}>
            When would be the best time for James to call you back?
          </p>
          <p
            style={{
              margin: '0 0 15px',
              padding: '10px',
              background: '#f3f4f6',
              borderRadius: '4px',
            }}
          >
            "I'm at work right now, so anytime after 5 PM would be best. I'm
            really excited about this property and would like to schedule a
            viewing this weekend if possible."
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3
          style={{
            borderBottom: '1px solid #eee',
            paddingBottom: '10px',
            color: '#111',
          }}
        >
          AI Summary
        </h3>
        <p
          style={{
            padding: '15px',
            background: '#f0f9ff',
            borderRadius: '4px',
            borderLeft: '4px solid #4f46e5',
          }}
        >
          Sarah is a first-time homebuyer interested in the 3-bedroom property
          on Oak Street. She would like to schedule a viewing this weekend and
          is available to discuss after 5 PM today. She seems highly motivated
          and ready to move forward quickly.
        </p>
      </div>

      <div
        style={{
          textAlign: 'center',
          marginTop: '30px',
          padding: '20px',
          borderTop: '1px solid #eee',
          color: '#666',
          fontSize: '12px',
        }}
      >
        <p>This email was sent by Spoqen, your AI receptionist.</p>
        <p>© 2025 Spoqen. All rights reserved.</p>
      </div>
    </div>
  );
}
