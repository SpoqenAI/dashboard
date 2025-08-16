import React from 'https://esm.sh/react@18';

interface CallAnalysis {
  // Core indicators (highest priority)
  sentiment?: 'positive' | 'negative' | 'neutral';
  leadQuality?: 'hot' | 'warm' | 'cold';
  leadQualityReasoning?: string;
  sentimentAnalysisReasoning?: string;

  // Call content
  callPurpose?: string;
  keyPoints?: string[];
  urgentConcerns?: string[];
  followUpItems?: string[];

  // Business qualifiers
  businessInterest?: string;
  timeline?: string;
  budgetMentioned?: boolean;
  decisionMaker?: boolean;

  // Contact and next steps
  appointmentRequested?: boolean;
  contactPreference?: string;
}

interface CallSummaryEmailProps {
  summary: string;
  phoneNumber?: string;
  callerName?: string;
  callAnalysis?: CallAnalysis;
  logoUrl: string;
  fullLogoUrl: string;
  dashboardUrl: string;
}

const BRAND_COLOR = '#33BD8F';
const TEXT_COLOR = '#0B1221';
const MUTED_TEXT = '#4B5563';
const SURFACE = '#F6F8FA';

export default function CallSummaryEmail({
  summary,
  phoneNumber,
  callerName,
  callAnalysis,
  logoUrl,
  fullLogoUrl,
  dashboardUrl,
}: CallSummaryEmailProps) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{
        fontFamily: 'Inter, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        color: TEXT_COLOR,
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header with logo */}
      <tr>
        <td align="center" style={{ padding: '24px 0 0' }}>
          <table
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            role="presentation"
            style={{ textAlign: 'left', maxWidth: '600px' }}
          >
            <tr>
              <td style={{ padding: '0 20px' }}>
                <img
                  src={logoUrl}
                  alt="Spoqen logo"
                  width={32}
                  height={32}
                  style={{ display: 'block' }}
                />
              </td>
            </tr>
          </table>
        </td>
      </tr>

      {/* Separator */}
      <tr>
        <td>
          <div
            style={{
              borderTop: '1px solid #E5E5E5',
              margin: '16px 20px 0',
            }}
          />
        </td>
      </tr>

      {/* Main Content */}
      <tr>
        <td align="center" style={{ padding: '24px 0' }}>
          <table
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            role="presentation"
            style={{ textAlign: 'left', maxWidth: '600px' }}
          >
            <tr>
              <td style={{ padding: '0 20px' }}>
                <div
                  style={{
                    color: BRAND_COLOR,
                    fontSize: '22px',
                    fontWeight: 700,
                    marginBottom: '16px',
                  }}
                >
                  Call Details Report
                </div>

                {/* Call Summary Section */}
                <div style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: TEXT_COLOR,
                      marginBottom: '8px',
                    }}
                  >
                    Call Summary
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                      color: TEXT_COLOR,
                      backgroundColor: SURFACE,
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    {summary || 'No summary available'}
                  </div>
                </div>

                {/* Caller Information */}
                {(phoneNumber || callerName) && (
                  <div style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: TEXT_COLOR,
                        marginBottom: '8px',
                      }}
                    >
                      Caller Information
                    </div>
                    {callerName && (
                      <div
                        style={{
                          fontSize: '14px',
                          color: TEXT_COLOR,
                          marginBottom: '4px',
                        }}
                      >
                        <strong>Name:</strong> {callerName}
                      </div>
                    )}
                    {phoneNumber && (
                      <div style={{ fontSize: '14px', color: TEXT_COLOR }}>
                        <strong>Phone:</strong> {phoneNumber}
                      </div>
                    )}
                  </div>
                )}

                {/* AI-Generated Analysis */}
                {callAnalysis && (
                  <>
                    {/* Lead Quality & Sentiment (Highest Priority) */}
                    <div style={{ marginBottom: '24px' }}>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: TEXT_COLOR,
                          marginBottom: '8px',
                        }}
                      >
                        AI-Generated Analysis
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        {callAnalysis.leadQuality && (
                          <div
                            style={{
                              backgroundColor:
                                callAnalysis.leadQuality === 'hot'
                                  ? '#FEF2F2'
                                  : callAnalysis.leadQuality === 'warm'
                                    ? '#FEF3C7'
                                    : '#F3F4F6',
                              color:
                                callAnalysis.leadQuality === 'hot'
                                  ? '#DC2626'
                                  : callAnalysis.leadQuality === 'warm'
                                    ? '#D97706'
                                    : '#6B7280',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                            }}
                          >
                            {callAnalysis.leadQuality} Lead
                          </div>
                        )}
                        {callAnalysis.sentiment && (
                          <div
                            style={{
                              backgroundColor:
                                callAnalysis.sentiment === 'positive'
                                  ? '#ECFDF5'
                                  : callAnalysis.sentiment === 'negative'
                                    ? '#FEF2F2'
                                    : '#F3F4F6',
                              color:
                                callAnalysis.sentiment === 'positive'
                                  ? '#047857'
                                  : callAnalysis.sentiment === 'negative'
                                    ? '#DC2626'
                                    : '#374151',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                            }}
                          >
                            {callAnalysis.sentiment} Sentiment
                          </div>
                        )}
                      </div>

                      {/* Lead Quality Reasoning */}
                      {callAnalysis.leadQualityReasoning && (
                        <div
                          style={{
                            fontSize: '14px',
                            color: TEXT_COLOR,
                            marginBottom: '8px',
                            backgroundColor: SURFACE,
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #E5E7EB',
                          }}
                        >
                          <strong>Lead Quality Analysis:</strong>{' '}
                          {callAnalysis.leadQualityReasoning}
                        </div>
                      )}

                      {/* Sentiment Reasoning */}
                      {callAnalysis.sentimentAnalysisReasoning && (
                        <div
                          style={{
                            fontSize: '14px',
                            color: TEXT_COLOR,
                            marginBottom: '8px',
                            backgroundColor: SURFACE,
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #E5E7EB',
                          }}
                        >
                          <strong>Sentiment Analysis:</strong>{' '}
                          {callAnalysis.sentimentAnalysisReasoning}
                        </div>
                      )}

                      {/* Call Purpose */}
                      {callAnalysis.callPurpose && (
                        <div
                          style={{
                            fontSize: '14px',
                            color: TEXT_COLOR,
                            marginBottom: '4px',
                          }}
                        >
                          <strong>Call Purpose:</strong>{' '}
                          {callAnalysis.callPurpose}
                        </div>
                      )}
                    </div>

                    {/* Key Discussion Points */}
                    {callAnalysis.keyPoints &&
                      callAnalysis.keyPoints.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#333',
                              marginBottom: '8px',
                            }}
                          >
                            Key Discussion Points
                          </div>
                          <ul style={{ margin: '0', paddingLeft: '20px' }}>
                            {callAnalysis.keyPoints.map((point, index) => (
                              <li
                                key={index}
                                style={{
                                  fontSize: '14px',
                                  color: TEXT_COLOR,
                                  marginBottom: '6px',
                                  lineHeight: 1.4,
                                }}
                              >
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Follow-up Actions */}
                    {callAnalysis.followUpItems &&
                      callAnalysis.followUpItems.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#333',
                              marginBottom: '8px',
                            }}
                          >
                            Follow-up Actions
                          </div>
                          <ul style={{ margin: '0', paddingLeft: '20px' }}>
                            {callAnalysis.followUpItems.map((item, index) => (
                              <li
                                key={index}
                                style={{
                                  fontSize: '14px',
                                  color: TEXT_COLOR,
                                  marginBottom: '6px',
                                  lineHeight: 1.4,
                                  backgroundColor: '#FEF3C7',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  listStyle: 'none',
                                  marginLeft: '-20px',
                                  paddingLeft: '20px',
                                }}
                              >
                                🔄 {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Urgent Concerns */}
                    {callAnalysis.urgentConcerns &&
                      callAnalysis.urgentConcerns.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#DC2626',
                              marginBottom: '8px',
                            }}
                          >
                            ⚠️ Urgent Concerns
                          </div>
                          <ul style={{ margin: '0', paddingLeft: '20px' }}>
                            {callAnalysis.urgentConcerns.map(
                              (concern, index) => (
                                <li
                                  key={index}
                                  style={{
                                    fontSize: '14px',
                                    color: TEXT_COLOR,
                                    marginBottom: '6px',
                                    lineHeight: 1.4,
                                    backgroundColor: '#FEF2F2',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    listStyle: 'none',
                                    marginLeft: '-20px',
                                    paddingLeft: '20px',
                                    border: '1px solid #FECACA',
                                  }}
                                >
                                  🚨 {concern}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Business Qualifiers (Priority Order) */}
                    {(callAnalysis.businessInterest ||
                      callAnalysis.timeline ||
                      callAnalysis.budgetMentioned ||
                      callAnalysis.decisionMaker) && (
                      <div style={{ marginBottom: '24px' }}>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#333',
                            marginBottom: '8px',
                          }}
                        >
                          Business Qualifiers
                        </div>

                        {/* Business Interest (High Priority) */}
                        {callAnalysis.businessInterest && (
                          <div
                            style={{
                              fontSize: '14px',
                              color: TEXT_COLOR,
                              marginBottom: '4px',
                            }}
                          >
                            <strong>Business Interest:</strong>{' '}
                            {callAnalysis.businessInterest}
                          </div>
                        )}

                        {/* Timeline */}
                        {callAnalysis.timeline && (
                          <div
                            style={{
                              fontSize: '14px',
                              color: TEXT_COLOR,
                              marginBottom: '8px',
                            }}
                          >
                            <strong>Timeline:</strong> {callAnalysis.timeline}
                          </div>
                        )}

                        {/* Budget & Decision Maker Indicators */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          {callAnalysis.budgetMentioned && (
                            <span
                              style={{
                                backgroundColor: '#F0F9FF',
                                color: '#0369A1',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              💰 Budget Discussed
                            </span>
                          )}
                          {callAnalysis.decisionMaker && (
                            <span
                              style={{
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              👤 Decision Maker
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact & Next Steps */}
                    {(callAnalysis.appointmentRequested ||
                      callAnalysis.contactPreference) && (
                      <div style={{ marginBottom: '24px' }}>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#333',
                            marginBottom: '8px',
                          }}
                        >
                          Contact & Next Steps
                        </div>

                        {callAnalysis.appointmentRequested && (
                          <div style={{ marginBottom: '8px' }}>
                            <span
                              style={{
                                backgroundColor: '#ECFDF5',
                                color: '#047857',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              📅 Appointment Requested
                            </span>
                          </div>
                        )}

                        {callAnalysis.contactPreference && (
                          <div
                            style={{
                              fontSize: '14px',
                              color: TEXT_COLOR,
                            }}
                          >
                            <strong>Contact Preference:</strong>{' '}
                            {callAnalysis.contactPreference}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div
                  style={{
                    marginTop: '32px',
                    paddingTop: '20px',
                    borderTop: '1px solid #E5E7EB',
                  }}
                >
                  <a
                    href={dashboardUrl}
                    style={{
                      color: BRAND_COLOR,
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    View all your recent calls →
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      {/* Separator */}
      <tr>
        <td>
          <div
            style={{
              borderTop: '1px solid #E5E5E5',
              margin: '24px 20px 0',
            }}
          />
        </td>
      </tr>

      {/* Footer */}
      <tr>
        <td
          align="center"
          style={{ padding: '32px 20px 24px', fontSize: '12px', color: '#666' }}
        >
          <span
            style={{ display: 'block', marginBottom: '2px', lineHeight: '1' }}
          >
            from
          </span>
          <img
            src={fullLogoUrl}
            alt="Spoqen"
            width={100}
            style={{ display: 'block', margin: '0 auto 12px' }}
          />
          <div>© {new Date().getFullYear()} Spoqen. All rights reserved.</div>
        </td>
      </tr>
    </table>
  );
}
