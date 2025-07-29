import React from 'https://esm.sh/react@18';
const BRAND_COLOR = '#4F46E5';

export default function CallSummaryEmail({ summary, phoneNumber, logoUrl, fullLogoUrl, dashboardUrl, analysis }) {
  // Extract additional AI analysis data when provided
  const structuredData = analysis?.structuredData || {};
  const callPurpose = structuredData.callPurpose || '';
  const sentiment = structuredData.sentiment || analysis?.sentiment || '';
  const leadQuality = structuredData.leadQuality || analysis?.leadQuality || '';
  const keyPoints = structuredData.keyPoints || [];
  const followUpItems = structuredData.followUpItems || [];
  const urgentConcerns = structuredData.urgentConcerns || [];

  return(// Wrapper table → best compatibility across mail clients
  /*#__PURE__*/ React.createElement("table", {
    width: "100%",
    cellPadding: 0,
    cellSpacing: 0,
    role: "presentation",
    style: {
      fontFamily: 'Arial, sans-serif',
      color: '#333'
    }
  }, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    align: "center",
    style: {
      padding: '24px 0 0'
    }
  }, /*#__PURE__*/ React.createElement("table", {
    width: "100%",
    cellPadding: 0,
    cellSpacing: 0,
    role: "presentation",
    style: {
      textAlign: 'left',
      maxWidth: '600px'
    }
  }, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    style: {
      padding: '0 20px'
    }
  }, /*#__PURE__*/ React.createElement("img", {
    src: logoUrl,
    alt: "Spoqen logo",
    width: 32,
    height: 32,
    style: {
      display: 'block'
    }
  })))))), /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, /*#__PURE__*/ React.createElement("div", {
    style: {
      borderTop: '1px solid #E5E5E5',
      margin: '16px 20px 0'
    }
  }))), /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    align: "center",
    style: {
      padding: '24px 0'
    }
  }, /*#__PURE__*/ React.createElement("table", {
    width: "100%",
    cellPadding: 0,
    cellSpacing: 0,
    role: "presentation",
    style: {
      textAlign: 'left',
      maxWidth: '600px'
    }
  }, /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    style: {
      padding: '0 20px'
    }
  }, /*#__PURE__*/ React.createElement("div", {
    style: {
      color: BRAND_COLOR,
      fontSize: '20px',
      fontWeight: 600,
      marginBottom: '12px'
    }
  }, "Call Summary"), /*#__PURE__*/ React.createElement("div", {
    style: {
      fontSize: '14px',
      lineHeight: 1.5,
      whiteSpace: 'pre-line',
      color: '#000'
    }
  }, summary),

  // === Additional AI-generated sections ===
  callPurpose && /*#__PURE__*/ React.createElement("div", {
    style: {
      marginTop: '16px',
      fontSize: '14px',
      color: '#000'
    }
  }, /*#__PURE__*/ React.createElement("strong", null, "Call Purpose: "), callPurpose),

  sentiment && /*#__PURE__*/ React.createElement("div", {
    style: {
      marginTop: '12px',
      fontSize: '14px',
      color: '#000'
    }
  }, /*#__PURE__*/ React.createElement("strong", null, "Call Sentiment: "), sentiment),

  leadQuality && /*#__PURE__*/ React.createElement("div", {
    style: {
      marginTop: '12px',
      fontSize: '14px',
      color: '#000'
    }
  }, /*#__PURE__*/ React.createElement("strong", null, "Lead Quality: "), leadQuality),

  keyPoints && keyPoints.length > 0 && /*#__PURE__*/ React.createElement("div", {
    style: {
      marginTop: '12px',
      fontSize: '14px',
      color: '#000'
    }
  }, /*#__PURE__*/ React.createElement("strong", null, `Key Discussion Points (` + keyPoints.length + `):`), /*#__PURE__*/ React.createElement("ul", {
    style: { paddingLeft: '16px', margin: '4px 0' }
  }, keyPoints.map((pt, idx) => /*#__PURE__*/ React.createElement("li", { key: idx }, pt))),

  followUpItems && followUpItems.length > 0 && /*#__PURE__*/ React.createElement("div", {
    style: {
      marginTop: '12px',
      fontSize: '14px',
      color: '#000'
    }
  }, /*#__PURE__*/ React.createElement("strong", null, `Action Points (` + followUpItems.length + `):`), /*#__PURE__*/ React.createElement("ul", {
    style: { paddingLeft: '16px', margin: '4px 0' }
  }, followUpItems.map((pt, idx) => /*#__PURE__*/ React.createElement("li", { key: idx }, pt))),

  urgentConcerns && urgentConcerns.length > 0 && /*#__PURE__*/ React.createElement("div", {
    style: {
      marginTop: '12px',
      fontSize: '14px',
      color: '#000'
    }
  }, /*#__PURE__*/ React.createElement("strong", null, `Urgent Concerns (` + urgentConcerns.length + `):`), /*#__PURE__*/ React.createElement("ul", {
    style: { paddingLeft: '16px', margin: '4px 0' }
  }, urgentConcerns.map((pt, idx) => /*#__PURE__*/ React.createElement("li", { key: idx }, pt))),

  phoneNumber && /*#__PURE__*/ React.createElement("div", {
    style: {
      marginTop: '16px',
      fontSize: '14px',
      color: '#000'
    }
  }, "Caller phone: ", /*#__PURE__*/ React.createElement("strong", null, phoneNumber)), /*#__PURE__*/ React.createElement("div", {
    style: {
      marginTop: '20px'
    }
  }, /*#__PURE__*/ React.createElement("a", {
    href: dashboardUrl,
    style: {
      color: BRAND_COLOR,
      textDecoration: 'none',
      fontSize: '14px'
    }
  }, "View all your recent calls →"))))))), /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", null, /*#__PURE__*/ React.createElement("div", {
    style: {
      borderTop: '1px solid #E5E5E5',
      margin: '24px 20px 0'
    }
  }))), /*#__PURE__*/ React.createElement("tr", null, /*#__PURE__*/ React.createElement("td", {
    align: "center",
    style: {
      padding: '32px 20px 24px',
      fontSize: '12px',
      color: '#666'
    }
  }, /*#__PURE__*/ React.createElement("span", {
    style: {
      display: 'block',
      marginBottom: '2px',
      lineHeight: '1'
    }
  }, "from"), /*#__PURE__*/ React.createElement("img", {
    src: fullLogoUrl,
    alt: "Spoqen",
    width: 100,
    style: {
      display: 'block',
      margin: '0 auto 12px'
    }
  }), /*#__PURE__*/ React.createElement("div", null, "© ", new Date().getFullYear(), " Spoqen. All rights reserved.")))));
}
