import React from 'react';

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 text-foreground">
      <h1 className="mb-6 text-center text-4xl font-extrabold">Contact Us</h1>
      <p className="mb-6 text-center text-lg">
        Thank you for your interest in{' '}
        <span className="font-semibold">Spoqen</span>, the AI-powered
        receptionist built exclusively for real&nbsp;estate professionals. We
        value every opportunity to connect with current and prospective clients
        and welcome your questions, feedback, and partnership inquiries.
      </p>

      <p className="mb-6 text-center text-lg">
        For general support, billing questions, media requests, or strategic
        partnerships, please reach out to our team at
        <a
          href="mailto:admin@spoqen.com"
          className="mx-1 font-medium text-primary underline hover:text-primary/80"
        >
          admin@spoqen.com
        </a>
        . We strive to respond to every message within{' '}
        <span className="font-semibold">one business day</span> (Monday –
        Friday, 9:00&nbsp;AM&nbsp;–&nbsp;5:00&nbsp;PM&nbsp;ET).
      </p>

      <p className="text-center text-sm text-muted-foreground">
        If your matter is time-sensitive, please indicate "URGENT" in the email
        subject line so we can prioritise your request accordingly.
      </p>

      <div className="mt-10 space-y-4 text-sm">
        <h2 className="text-center text-lg font-semibold">Privacy Statement</h2>
        <p>
          We record and securely store all call audio and transcripts generated
          by your AI receptionist in our cloud database. This information—
          including any personal details callers provide—is used only to operate
          and improve the service.
        </p>
        <p>
          It is accessible only to you (the account owner), authorised Spoqen
          staff, and our trusted service providers (e.g. telephony and cloud
          hosting partners) under strict confidentiality. We never sell your
          personal information or share your call content outside of Spoqen (and
          never with third parties except those necessary to deliver this
          service, or with your explicit direction). Call recordings and
          transcripts are retained securely for your reference, and you may
          request deletion of this data at any time. By using the AI
          receptionist, you consent to these practices. For full details, see
          our{' '}
          <a
            href="/privacy"
            className="font-medium text-primary underline hover:text-primary/80"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
