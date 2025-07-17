import React from 'https://esm.sh/react@18';

interface CallSummaryEmailProps {
  summary: string;
  phoneNumber?: string;
  /** absolute https URL to the small square logo */
  logoUrl: string;
  /** absolute https URL to the full-width brandmark used in the footer */
  fullLogoUrl: string;
  /** link that lets the user jump to their dashboard */
  dashboardUrl: string;
}

const BRAND_COLOR = '#4F46E5';

export default function CallSummaryEmail({
  summary,
  phoneNumber,
  logoUrl,
  fullLogoUrl,
  dashboardUrl,
}: CallSummaryEmailProps) {
  return (
    // Wrapper table → best compatibility across mail clients
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{
        fontFamily: 'Arial, sans-serif',
        color: '#333',
      }}
    >
      {/* Header row with small logo */}
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

      {/* Separator Line */}
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

      {/* Main Content (centred) */}
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
                    fontSize: '20px',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  Call Summary
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                    color: '#000',
                  }}
                >
                  {summary}
                </div>
                {phoneNumber && (
                  <div
                    style={{
                      marginTop: '16px',
                      fontSize: '14px',
                      color: '#000',
                    }}
                  >
                    Caller phone: <strong>{phoneNumber}</strong>
                  </div>
                )}
                <div style={{ marginTop: '20px' }}>
                  <a
                    href={dashboardUrl}
                    style={{
                      color: BRAND_COLOR,
                      textDecoration: 'none',
                      fontSize: '14px',
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

      {/* Separator Line */}
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
