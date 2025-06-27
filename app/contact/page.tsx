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
    </div>
  );
}
