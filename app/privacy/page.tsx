import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 text-gray-800">
      <h1 className="mb-8 text-center text-4xl font-extrabold">
        Privacy Policy for Spoqen
      </h1>

      <p className="mb-6 text-sm text-gray-600">
        Effective Date: {new Date().toLocaleDateString()}
        <br />
        Last Updated: {new Date().toLocaleDateString()}
      </p>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          1. Introduction and Scope of This Policy
        </h2>
        <p className="mb-4">
          This Privacy Policy outlines how Spoqen ("the Company," "it")
          collects, uses, discloses, and protects the personal information of
          individuals ("Data Subjects," "Users") who use Spoqen (the "Service").
          The purpose of this document is to provide transparency regarding the
          Company's data handling practices. Use of the Service signifies
          acceptance of the terms described herein. Individuals who do not agree
          with these terms should refrain from using the Service.
        </p>
        <p className="mb-4">
          The Service incorporates artificial intelligence (AI) to provide its
          functionalities. The Company is committed to explaining how this
          technology interacts with personal information. This policy reflects
          the Company's current data practices and understanding of applicable
          privacy laws. Given the dynamic nature of AI technology and data
          privacy regulations, this Privacy Policy may be updated periodically.
          Users are encouraged to review it regularly. The "Last Updated" date
          indicates the most recent revision.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          2. Information Collected
        </h2>
        <p className="mb-4">
          The Company collects various types of personal information to provide
          and improve the Service. The collection practices are designed to be
          purposeful and transparent. This information can be broadly
          categorized as follows:
        </p>
        <h3 className="mb-2 mt-4 text-xl font-bold">
          Information Provided Directly by Users:
        </h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Account Registration Data:</strong> When Users create an
            account, the Company collects information such as name, email
            address, phone number, and, if applicable, payment details for
            subscription services.
          </li>
          <li>
            <strong>Voicemail Content:</strong> The core of the Service involves
            processing audio recordings of voicemails and the AI-generated
            transcriptions of these voicemails. This content is inherently
            personal and may contain sensitive information depending on the
            caller and the message left.
          </li>
          <li>
            <strong>Contact Lists or Address Book Information:</strong> If Users
            grant the Service access to their contact lists or address book,
            this information may be used for features such as caller
            identification or syncing contacts with the Service.
          </li>
          <li>
            <strong>Communications with Customer Support:</strong> Records of
            interactions with the Company's support team, including the content
            of inquiries and responses, are maintained.
          </li>
          <li>
            <strong>User Settings and Preferences:</strong> Information related
            to User configurations, preferences for Service features, and other
            settings are collected to personalize the experience.
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          Information Collected Automatically:
        </h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Usage Data:</strong> The Company gathers information about
            how Users interact with the Service. This includes features
            utilized, the timing and frequency of use, and performance metrics
            related to the AI functionalities. Where feasible, this data is
            anonymized or aggregated.
          </li>
          <li>
            <strong>Device Information:</strong> Details about the User's
            device, such as device type, operating system version, and unique
            device identifiers, are collected to optimize Service delivery and
            for troubleshooting.
          </li>
          <li>
            <strong>IP Address and General Location Data:</strong> The IP
            address of the User's device is collected, from which general
            geographic location may be inferred. This is used for security
            purposes, analytics, and service customization.
          </li>
          <li>
            <strong>Log Data:</strong> The Service automatically records certain
            information in server logs, including access times, system activity,
            and error logs, which are essential for monitoring, security, and
            improving service stability.
          </li>
          <li>
            <strong>Cookies and Similar Tracking Technologies:</strong> If the
            Service includes a web-based interface or application, cookies and
            similar technologies may be used to enhance user experience, for
            authentication, and for analytics. A separate Cookie Policy, if
            applicable, will provide more detailed information.
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          Information from Third Parties:
        </h3>
        <p className="mb-4">
          The Company may receive information from third-party services if Users
          choose to integrate the Service with other platforms and explicitly
          authorize such data transfers. The nature of this information will
          depend on the third-party service and the User's privacy settings on
          that platform.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          Specifics on Voicemail Data and Call Recordings:
        </h3>
        <p className="mb-4">
          It is explicitly stated that voicemails left for Users are recorded
          and processed by the Service's AI systems. This processing includes
          transcription and potentially other analytical features.
        </p>
        <p className="mb-4">
          The act of a caller leaving a voicemail for a User of the Service
          inherently involves recording the caller's voice. The User, by
          employing the Service, consents to their incoming voicemails being
          recorded and processed. For callers, particularly those in
          jurisdictions requiring two-party or all-party consent for call
          recording, the Service may offer configurable options for Users to
          provide appropriate notice to their callers (e.g., a customizable
          pre-voicemail announcement). Compliance with such consent requirements
          for incoming calls ultimately rests with the User, who must ensure
          their use of the Service aligns with applicable laws in their
          jurisdiction and the jurisdictions of their callers. The Service
          operates based on the User's direction to record messages left for
          them.
        </p>
        <p className="mb-4">
          The handling of voicemail content requires special attention due to
          its dual nature: it is provided by callers at the User's implicit
          direction (by having a voicemail service) and automatically collected
          and processed by the Service. This content can be highly sensitive,
          potentially containing Personally Identifiable Information (PII) and,
          under frameworks like the California Privacy Rights Act (CPRA),
          Sensitive Personal Information (SPI).
        </p>
        <p className="mb-4">
          Furthermore, the AI's operation involves a form of implicit data
          collection. As the AI processes voicemails (e.g., transcribing speech,
          identifying keywords, assessing sentiment), it generates operational
          data and learns from these interactions. This operational data, even
          if not directly "provided" by the User, is a byproduct of the
          Service's functionality and may be used for service improvement, a
          practice that is detailed further in this policy.
        </p>

        <h4 className="mb-2 mt-4 text-lg font-bold">
          Table 1: Information Collected and Primary Purposes
        </h4>
        <div className="space-y-4 text-sm">
          <div className="rounded-md border p-3">
            <p>
              <strong>Category of Information:</strong> Account Information
            </p>
            <p>
              <strong>Examples:</strong> Name, email, phone number, payment
              details
            </p>
            <p>
              <strong>Source(s):</strong> User
            </p>
            <p>
              <strong>Primary Purpose(s) of Collection:</strong> Service
              provision, account management, billing, communication
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Category of Information:</strong> Voicemail Audio
            </p>
            <p>
              <strong>Examples:</strong> Audio recordings of messages left by
              callers
            </p>
            <p>
              <strong>Source(s):</strong> Caller (via User's service)
            </p>
            <p>
              <strong>Primary Purpose(s) of Collection:</strong> Core voicemail
              functionality (storage, playback), AI processing (transcription,
              analysis)
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Category of Information:</strong> Voicemail Transcripts
            </p>
            <p>
              <strong>Examples:</strong> Text versions of voicemails generated
              by AI
            </p>
            <p>
              <strong>Source(s):</strong> AI (derived from Voicemail Audio)
            </p>
            <p>
              <strong>Primary Purpose(s) of Collection:</strong> Core voicemail
              functionality (display, search), AI feature enhancement
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Category of Information:</strong> Contact List Data (if
              provided)
            </p>
            <p>
              <strong>Examples:</strong> Names, phone numbers from User's
              address book
            </p>
            <p>
              <strong>Source(s):</strong> User
            </p>
            <p>
              <strong>Primary Purpose(s) of Collection:</strong> Caller
              identification, contact syncing
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Category of Information:</strong> Usage Data
            </p>
            <p>
              <strong>Examples:</strong> Features used, interaction times, AI
              performance metrics
            </p>
            <p>
              <strong>Source(s):</strong> Automated
            </p>
            <p>
              <strong>Primary Purpose(s) of Collection:</strong> Service
              improvement, feature optimization, understanding user engagement,
              security monitoring
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Category of Information:</strong> Device Information
            </p>
            <p>
              <strong>Examples:</strong> Device type, OS, unique identifiers
            </p>
            <p>
              <strong>Source(s):</strong> Automated
            </p>
            <p>
              <strong>Primary Purpose(s) of Collection:</strong> Service
              optimization for different devices, troubleshooting
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Category of Information:</strong> Caller Information
              (metadata)
            </p>
            <p>
              <strong>Examples:</strong> Caller's phone number (Caller ID)
            </p>
            <p>
              <strong>Source(s):</strong> Telecommunication Network
            </p>
            <p>
              <strong>Primary Purpose(s) of Collection:</strong> Displaying
              caller information, enabling call-back, spam filtering
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Category of Information:</strong> AI Operational Data
            </p>
            <p>
              <strong>Examples:</strong> Intermediate processing data, AI
              confidence scores, error/correction data
            </p>
            <p>
              <strong>Source(s):</strong> AI (during service operation)
            </p>
            <p>
              <strong>Primary Purpose(s) of Collection:</strong> Service
              improvement, AI model refinement, quality assurance
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          3. How Information Is Used
        </h2>
        <p className="mb-4">
          The Company uses the collected personal information for several
          purposes, always striving to align with the principles of purpose
          limitation and data minimization.
        </p>
        <h3 className="mb-2 mt-4 text-xl font-bold">
          To Provide and Improve the Services:
        </h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Core Functionality:</strong> Delivering essential voicemail
            services, including the recording, storage, and retrieval of
            voicemails.
          </li>
          <li>
            <strong>AI-Powered Features:</strong> Providing advanced
            functionalities driven by AI, such as automated voicemail
            transcription, summarization of lengthy messages, identification of
            potential spam calls, voice analytics (if offered, e.g., sentiment
            analysis for User's own review), and smart reply suggestions. The
            specific AI features available may evolve as the Service is
            enhanced.
          </li>
          <li>
            <strong>Personalization:</strong> Customizing the User experience,
            which might include prioritizing voicemails based on learned
            importance or allowing for personalized greetings, where such
            features are available.
          </li>
          <li>
            <strong>AI Model Training and Refinement:</strong> User data,
            particularly voicemail audio and transcripts, may be used to train
            and improve the AI models that power the Service. This is crucial
            for enhancing accuracy, expanding capabilities (e.g., understanding
            more accents or languages), and developing new features. When data
            is used for model training, the Company employs measures to protect
            privacy, such as de-identification, aggregation, or other
            anonymization techniques where feasible, before the data is used for
            broader model improvement. Specific choices regarding the use of
            data for general model training are detailed in Section 11. The use
            of User data to improve the AI models, which enhances the Service's
            core technology, is a significant aspect of the Service. It is
            important to note that under certain data privacy laws, such as the
            CCPA/CPRA, the "improvement of technologies" through the use of
            personal information can be considered a "valuable consideration,"
            potentially implicating definitions of "sale" or "sharing" even if
            no monetary exchange occurs. The Company's practices regarding these
            definitions are addressed in Section 5 and Section 6.
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">For Communication:</h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            Sending service-related notifications, including updates to the
            Service, security alerts, and billing information.
          </li>
          <li>Responding to User inquiries and providing customer support.</li>
          <li>
            Sending marketing communications about the Company's products or
            services, but only where Users have consented or where otherwise
            permitted by law, and always with clear opt-out mechanisms.
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          For Security and Fraud Prevention:
        </h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            Protecting the security and integrity of the Service, its
            infrastructure, and User data.
          </li>
          <li>
            Detecting, preventing, and investigating fraudulent, unauthorized,
            or illegal activities.
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          To Comply with Legal Obligations:
        </h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            Responding to lawful requests from public authorities, such as
            subpoenas or court orders.
          </li>
          <li>
            Complying with applicable laws, regulations, and legal processes.
          </li>
        </ul>
        <p className="mb-4">
          The Company is committed to using data only for the specified,
          explicit, and legitimate purposes for which it was collected. Data
          collection is limited to what is necessary to achieve these purposes.
          The specific AI applications (e.g., transcription, spam filtering) are
          disclosed to provide Users with a clearer understanding of how their
          data is processed by AI systems, aligning with transparency
          principles. While the Company strives for accuracy and fairness in its
          AI models, it acknowledges the ongoing challenges in mitigating bias
          in AI systems and is committed to efforts in this area.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          4. Legal Basis for Processing Personal Information (GDPR & other
          relevant laws)
        </h2>
        <p className="mb-4">
          The processing of personal information by the Company is grounded in
          specific legal bases, particularly under the General Data Protection
          Regulation (GDPR) if applicable to the User, and similar principles in
          other data protection laws. Every processing activity is tied to a
          lawful justification.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">Consent:</h3>
        <p className="mb-4">
          The Company relies on User consent for certain processing activities.
          This includes:
        </p>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            Sending direct marketing communications via email or other
            electronic means.
          </li>
          <li>
            The recording of incoming calls (voicemails) where all-party consent
            is required by applicable law, noting that the User of the Service
            provides their consent by using the Service to receive voicemails,
            and is responsible for ensuring any necessary consent from callers.
          </li>
          <li>
            Processing Sensitive Personal Information (SPI), as defined by
            applicable laws like CPRA, if such data is processed for purposes
            requiring explicit consent and not covered by another lawful basis.
          </li>
          <li>
            Using personal data for AI model training purposes that go beyond
            the direct provision or improvement of the Service for that specific
            User, or where explicit control over such use is provided to the
            User.
          </li>
        </ul>
        <p className="mb-4">
          Consent is obtained through clear, affirmative action, and Users have
          the right to withdraw their consent at any time, without affecting the
          lawfulness of processing based on consent before its withdrawal.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">Contractual Necessity:</h3>
        <p className="mb-4">
          Much of the data processing is necessary for the performance of the
          contract between the User and the Company for the provision of the AI
          Voicemail Assistant Service. This includes, for example:
        </p>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            Collecting account information to set up and manage the User's
            account.
          </li>
          <li>
            Recording, storing, transcribing, and delivering voicemails as per
            the core functionality of the Service.
          </li>
          <li>Providing customer support related to the Service.</li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">Legitimate Interests:</h3>
        <p className="mb-4">
          The Company processes certain personal information based on its
          legitimate interests, provided these interests are not overridden by
          the fundamental rights and freedoms of the Data Subject. A balancing
          test is performed for such processing. Legitimate interests include:
        </p>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            Improving and developing the Service, including enhancing the
            accuracy and capabilities of the AI models through the analysis of
            usage patterns and, where appropriate and safeguarded, voicemail
            data (e.g., using de-identified or aggregated data). The use of
            personal data for general AI model training based on legitimate
            interest is subject to rigorous assessment to ensure User rights are
            protected, and may be supplemented or replaced by consent depending
            on the nature and sensitivity of the data and the specifics of the
            training process.
          </li>
          <li>
            Ensuring the security and integrity of the Service, preventing
            fraud, and protecting the Company's legal rights.
          </li>
          <li>
            Conducting internal analytics and reporting using aggregated or
            anonymized data to understand service usage and business
            performance.
          </li>
        </ul>
        <p className="mb-4">
          The specific legitimate interests pursued are documented and regularly
          reviewed.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">Legal Obligations:</h3>
        <p className="mb-4">
          The Company may process personal information where it is necessary to
          comply with a legal obligation to which it is subject. This includes
          responding to lawful requests from law enforcement or other government
          authorities, or complying with financial and regulatory reporting
          requirements.
        </p>
        <p className="mb-4">
          The choice of lawful basis for each processing activity, especially
          those involving AI and sensitive voicemail content, is carefully
          considered. For instance, while improving AI models can be a
          legitimate interest, the sensitivity of voicemail data means that
          additional safeguards, such as robust de-identification or obtaining
          explicit consent, are prioritized, particularly for uses that are not
          directly tied to the immediate service delivery for that User.
          Transparency in communicating these lawful bases is a key commitment.
        </p>

        <h4 className="mb-2 mt-4 text-lg font-bold">
          Table 2: Our Purposes for Using Your Information and Legal Bases
          (Illustrative GDPR Focus)
        </h4>
        <div className="space-y-4 text-sm">
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> Account Creation and
              Management
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Account Information
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Contractual Necessity
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> Voicemail Recording,
              Storage, and Retrieval
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Voicemail Audio, Caller Information (metadata)
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Contractual Necessity
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> AI-Powered Voicemail
              Transcription
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Voicemail Audio, Voicemail Transcripts
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Contractual Necessity (for
              providing the transcription feature)
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> AI-Powered Features
              (e.g., Summarization, Spam Detection)
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Voicemail Audio, Voicemail Transcripts, Usage Data
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Contractual Necessity (if
              core to service); Legitimate Interest (for enhancement, with
              safeguards); Consent (for certain advanced/optional features)
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> General AI Model
              Improvement (beyond individual User service)
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Voicemail Audio (potentially de-identified/aggregated),
              Transcripts (potentially de-identified/aggregated), AI Operational
              Data
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Legitimate Interest (with
              robust safeguards, LIA, and user controls/opt-outs); Consent
              (especially for identifiable or sensitive data)
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> Sending
              Service-Related Communications (non-marketing)
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Account Information (email, phone number)
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Contractual Necessity;
              Legitimate Interest (to inform about important service aspects)
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> Sending Marketing
              Communications
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Account Information (email)
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Consent
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> Security Monitoring
              and Fraud Prevention
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Usage Data, IP Address, Account Information
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Legitimate Interest (to
              protect the service and users); Legal Obligation
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> Responding to Legal
              Requests
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Relevant data categories as specified in the legal request
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Legal Obligation
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Processing Activity/Purpose:</strong> Customer Support
            </p>
            <p>
              <strong>Personal Data Categories Involved (Examples):</strong>{' '}
              Account Information, Communications with Support, Usage Data
            </p>
            <p>
              <strong>Legal Basis (GDPR):</strong> Contractual Necessity;
              Legitimate Interest (to improve support quality)
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          5. How Information Is Shared
        </h2>
        <p className="mb-4">
          The Company does not share personal information with third parties
          except in the circumstances outlined below, and always with a
          commitment to protecting User privacy.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          With Service Providers and Sub-processors:
        </h3>
        <p className="mb-4">
          The Company engages third-party vendors and service providers
          (sub-processors) to perform various functions necessary to operate and
          improve the Service. These may include cloud hosting providers (e.g.,
          for storing voicemail data and running AI models), payment processors,
          analytics providers, customer support platform providers, and
          communication tool providers.
        </p>
        <p className="mb-4">
          These service providers are granted access to personal information
          only to the extent necessary to perform their designated functions and
          are contractually obligated to maintain the confidentiality and
          security of the data. They are prohibited from using personal
          information for any other purpose. The Company maintains a list of its
          key sub-processors, which can be made available to Users upon request
          or via a designated link on its website. The selection and vetting of
          sub-processors, particularly those involved in AI infrastructure or
          handling sensitive voice data, is a critical aspect of the Company's
          data governance.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          For Legal Reasons and to Protect Rights:
        </h3>
        <p className="mb-4">
          The Company may disclose personal information if required to do so by
          law, regulation, valid legal process (such as a subpoena, court order,
          or search warrant), or governmental request.
        </p>
        <p className="mb-4">
          Disclosure may also occur to enforce the Company's Terms of Service,
          to investigate potential violations, to detect, prevent, or otherwise
          address fraud, security, or technical issues.
        </p>
        <p className="mb-4">
          Furthermore, information may be shared to protect the rights,
          property, or safety of the Company, its Users, or the public, as
          required or permitted by law. The Company will strive to be
          transparent about government data requests, disclosing information
          only when legally compelled and, where permissible, notifying the
          User.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          In Connection with Business Transfers:
        </h3>
        <p className="mb-4">
          If the Company is involved in a merger, acquisition, financing,
          reorganization, bankruptcy, receivership, sale of company assets, or
          transition of service to another provider, User personal information
          may be sold or transferred as part of such a transaction. Users will
          be notified of any such deal and informed of any choices they may have
          regarding their information, as required by applicable law.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">With User Consent:</h3>
        <p className="mb-4">
          The Company may share personal information with other third parties
          when it has the User's explicit consent to do so.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          "Sale" or "Sharing" of Personal Information (CCPA/CPRA Context):
        </h3>
        <p className="mb-4">
          The California Consumer Privacy Act (CCPA) as amended by the
          California Privacy Rights Act (CPRA) has specific definitions for
          "sale" and "sharing" of personal information. A "sale" is broadly
          defined to include the exchange of personal information for monetary
          or other valuable consideration. "Sharing" is defined to include
          disclosure for cross-context behavioral advertising.
        </p>
        <p className="mb-4">
          The Company's use of personal information, such as voicemail data, to
          train and improve its AI models (which enhances the value of the
          Service and the Company's technology) could potentially be considered
          "sharing" or a "sale" for "valuable consideration" under these broad
          definitions, even if no money is directly exchanged for the data.
          Similarly, the use of certain third-party analytics or advertising
          cookies on any associated web portals might constitute "sharing."
        </p>
        <p className="mb-4">
          The Company is committed to transparency regarding these activities.
          California residents have the right to opt-out of the "sale" or
          "sharing" of their personal information. Instructions on how to
          exercise this right are provided in Section 6 and via a "Do Not Sell
          or Share My Personal Information" link on the Company's website or
          application interface.
        </p>
        <p className="mb-4">
          If the Service utilizes any analytics or tracking technologies that
          contribute to cross-context behavioral advertising, particularly
          through a web portal for managing voicemails, this activity would be
          classified as "sharing" under the CPRA and would necessitate providing
          an opt-out mechanism.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          6. Privacy Rights and Choices
        </h2>
        <p className="mb-4">
          The Company respects the privacy rights of its Users and provides
          mechanisms to exercise these rights in accordance with applicable data
          protection laws.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          General Rights (often aligned with GDPR):
        </h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Right of Access:</strong> Users have the right to request
            information about whether the Company holds personal information
            about them and to obtain a copy of such information.
          </li>
          <li>
            <strong>Right to Rectification:</strong> Users have the right to
            request the correction of inaccurate or incomplete personal data. It
            is important to note that correcting factual inaccuracies that may
            be present in AI-generated content (e.g., a transcript or summary)
            can be technically complex, and while the Company will make
            reasonable efforts, perfect correction within the AI models
            themselves may not always be feasible.
          </li>
          <li>
            <strong>Right to Erasure (Deletion):</strong> Users have the right
            to request the deletion of their personal data under certain
            conditions, such as when the data is no longer necessary for the
            purposes for which it was collected or if consent is withdrawn. The
            technical implications of erasure for AI models are significant;
            while data will be deleted from operational systems, its past
            influence on trained models may not be immediately reversible
            without model retraining, a process that may be undertaken
            periodically.
          </li>
          <li>
            <strong>Right to Restrict Processing:</strong> Users have the right
            to request the limitation of how their personal data is processed in
            specific circumstances.
          </li>
          <li>
            <strong>Right to Data Portability:</strong> Where applicable, Users
            have the right to receive their personal data in a structured,
            commonly used, and machine-readable format and to transmit that data
            to another controller.
          </li>
          <li>
            <strong>Right to Object:</strong> Users have the right to object to
            the processing of their personal data based on legitimate interests
            or for direct marketing purposes. If an objection is made to
            processing for AI model training based on legitimate interests, the
            Company will cease such processing unless compelling legitimate
            grounds override the User's interests, rights, and freedoms, or for
            legal claims.
          </li>
          <li>
            <strong>
              Rights related to Automated Decision-Making and Profiling:
            </strong>
            If the AI Service makes decisions that produce legal effects
            concerning Users or similarly significantly affect them (which is
            generally not the primary function of a voicemail assistant but
            could arise in advanced features like automated blocking based on AI
            analysis), Users have the right to obtain human intervention,
            express their point of view, and contest the decision.
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          Rights under CCPA/CPRA (for California residents):
        </h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Right to Know:</strong> California residents have the right
            to request disclosure of the specific pieces of personal information
            the Company has collected about them; the categories of personal
            information collected; categories of sources from which it was
            collected; the business or commercial purposes for collecting,
            selling, or sharing it; categories of third parties to whom it was
            disclosed, sold, or shared; and categories of information sold or
            shared.
          </li>
          <li>
            <strong>Right to Delete:</strong> California residents have the
            right to request the deletion of their personal information, subject
            to certain exceptions.
          </li>
          <li>
            <strong>Right to Correct:</strong> California residents have the
            right to request the correction of inaccurate personal information.
          </li>
          <li>
            <strong>Right to Opt-Out of Sale/Sharing:</strong> California
            residents have the right to opt-out of the "sale" or "sharing" of
            their personal information. A clear and conspicuous link titled "Do
            Not Sell or Share My Personal Information" will be provided on the
            Company's website and/or within the Service interface, enabling
            Users to exercise this right.
          </li>
          <li>
            <strong>
              Right to Limit Use and Disclosure of Sensitive Personal
              Information (SPI):
            </strong>
            If the Company collects or processes SPI (which voicemail content
            may contain) for purposes beyond those specifically permitted by the
            CPRA (e.g., for certain types of AI model training not strictly
            necessary for service delivery or security), California residents
            have the right to direct the Company to limit its use and disclosure
            of such SPI. A link titled "Limit the Use of My Sensitive Personal
            Information" will be provided where applicable.
          </li>
          <li>
            <strong>Right to Non-Discrimination:</strong> The Company will not
            discriminate against California residents for exercising any of
            their CCPA/CPRA rights.
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">Exercising Your Rights:</h3>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            Users can submit requests to exercise their privacy rights by
            contacting the Company through the channels provided in Section 13
            ("Contact Information").
          </li>
          <li>
            The Company will need to verify the identity of the individual
            making the request before processing it to protect User privacy and
            security. The verification process for an audio-centric service like
            a voicemail assistant may involve confirmation via the registered
            email address or phone number, or other methods appropriate to the
            sensitivity of the data.
          </li>
          <li>
            The Company will respond to verifiable consumer requests within the
            timeframes mandated by applicable law (e.g., 45 days under
            CCPA/CPRA, extendable once).
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          Opt-Out of Marketing Communications:
        </h3>
        <p className="mb-4">
          Users can opt-out of receiving promotional communications from the
          Company by following the unsubscribe instructions in those
          communications or by changing their account settings.
        </p>

        <h3 className="mb-2 mt-4 text-xl font-bold">
          Call Recording Consent Management:
        </h3>
        <p className="mb-4">
          Users are reminded that for jurisdictions requiring two-party or
          all-party consent for call recording, consent from all parties to the
          communication is necessary. If the Service provides features for Users
          to manage announcements or consent mechanisms for their incoming
          voicemails, details will be available within the Service settings or
          support documentation.
        </p>

        <h4 className="mb-2 mt-4 text-lg font-bold">
          Table 3: Your Privacy Rights and How to Exercise Them
        </h4>
        <div className="space-y-4 text-sm">
          <div className="rounded-md border p-3">
            <p>
              <strong>Your Right:</strong> Access Personal Information
            </p>
            <p>
              <strong>Description:</strong> Request a copy of personal
              information held by the Company.
            </p>
            <p>
              <strong>Applicable To (Examples):</strong> All Users
            </p>
            <p>
              <strong>How to Exercise (Examples):</strong> Contact
              admin@spoqen.com; Via Account Portal
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Your Right:</strong> Correct Personal Information
            </p>
            <p>
              <strong>Description:</strong> Request correction of inaccurate
              personal information.
            </p>
            <p>
              <strong>Applicable To (Examples):</strong> All Users
            </p>
            <p>
              <strong>How to Exercise (Examples):</strong> Contact
              admin@spoqen.com; Via Account Portal
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Your Right:</strong> Delete Personal Information
            </p>
            <p>
              <strong>Description:</strong> Request deletion of personal
              information under certain conditions.
            </p>
            <p>
              <strong>Applicable To (Examples):</strong> All Users
            </p>
            <p>
              <strong>How to Exercise (Examples):</strong> Contact
              admin@spoqen.com; Via Account Portal
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Your Right:</strong> Object to Processing
            </p>
            <p>
              <strong>Description:</strong> Object to processing based on
              legitimate interests or for direct marketing.
            </p>
            <p>
              <strong>Applicable To (Examples):</strong> All Users
            </p>
            <p>
              <strong>How to Exercise (Examples):</strong> Contact
              admin@spoqen.com; Unsubscribe links (for marketing)
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Your Right:</strong> Opt-Out of Sale/Sharing (CCPA/CPRA)
            </p>
            <p>
              <strong>Description:</strong> Direct the Company not to "sell" or
              "share" personal information.
            </p>
            <p>
              <strong>Applicable To (Examples):</strong> California Residents
            </p>
            <p>
              <strong>How to Exercise (Examples):</strong> Click "Do Not Sell or
              Share My Personal Information" link; Contact admin@spoqen.com
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Your Right:</strong> Limit Use of Sensitive Info
              (CCPA/CPRA)
            </p>
            <p>
              <strong>Description:</strong> Direct the Company to limit
              use/disclosure of SPI for non-exempt purposes.
            </p>
            <p>
              <strong>Applicable To (Examples):</strong> California Residents
            </p>
            <p>
              <strong>How to Exercise (Examples):</strong> Click "Limit the Use
              of My Sensitive Personal Information" link; Contact
              admin@spoqen.com
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Your Right:</strong> Data Portability
            </p>
            <p>
              <strong>Description:</strong> Receive personal data in a portable
              format.
            </p>
            <p>
              <strong>Applicable To (Examples):</strong> Users covered by GDPR
              (primarily)
            </p>
            <p>
              <strong>How to Exercise (Examples):</strong> Contact
              admin@spoqen.com
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p>
              <strong>Your Right:</strong> Lodge a Complaint with Supervisory
              Authority
            </p>
            <p>
              <strong>Description:</strong> Right to complain to a data
              protection authority if concerns about data handling exist.
            </p>
            <p>
              <strong>Applicable To (Examples):</strong> Users covered by GDPR
              (primarily)
            </p>
            <p>
              <strong>How to Exercise (Examples):</strong> Contact relevant
              local data protection authority.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          7. Data Security
        </h2>
        <p className="mb-4">
          The Company implements and maintains reasonable technical and
          organizational security measures designed to protect personal
          information from unauthorized access, use, disclosure, alteration, or
          destruction. These measures include:
        </p>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Encryption:</strong> Personal information, including
            voicemail audio and transcripts, is encrypted both in transit (e.g.,
            using TLS/SSL) and at rest (e.g., using AES-256 or similar
            standards).
          </li>
          <li>
            <strong>Access Controls:</strong> Strict access controls are
            enforced to limit access to personal information to authorized
            personnel who have a legitimate need to access it for their job
            responsibilities. This includes role-based access controls and
            multi-factor authentication where appropriate.
          </li>
          <li>
            <strong>Pseudonymization and Anonymization:</strong> Where feasible
            and appropriate, techniques such as pseudonymization or
            anonymization are applied, particularly when data is used for
            analytics or AI model training, to reduce the risk of
            re-identification.
          </li>
          <li>
            <strong>Regular Security Assessments:</strong> The Company conducts
            regular security audits, vulnerability assessments, and penetration
            testing to identify and remediate potential security weaknesses.
          </li>
          <li>
            <strong>Secure Software Development:</strong> Security
            considerations are integrated into the software development
            lifecycle.
          </li>
          <li>
            <strong>Physical Security:</strong> Secure data centers with
            appropriate physical security measures are used to host the Service
            and store data.
          </li>
        </ul>
        <p className="mb-4">
          Voice data is inherently sensitive, and AI systems can present novel
          security challenges (e.g., model evasion, data poisoning). The
          Company's security program specifically considers these risks
          associated with AI and voice data processing.
        </p>
        <p className="mb-4">
          Despite these efforts, it is important to acknowledge that no method
          of transmission over the Internet or method of electronic storage is
          100% secure. Therefore, while the Company strives to use commercially
          acceptable means to protect personal information, it cannot guarantee
          its absolute security.
        </p>
        <p className="mb-4">
          Users also play a role in data security. They are responsible for
          maintaining the confidentiality of their account credentials (e.g.,
          passwords) and for securing the devices they use to access the
          Service.
        </p>
        <h3 className="mb-2 mt-4 text-xl font-bold">
          Data Breach Notification Procedures:
        </h3>
        <p className="mb-4">
          In the event of a data breach involving personal information, the
          Company has procedures in place to respond promptly. This includes
          assessing the scope and impact of the breach, taking steps to contain
          and mitigate it, and notifying relevant regulatory authorities (e.g.,
          within 72 hours of becoming aware, as required under GDPR for certain
          breaches) and affected individuals if the breach is likely to result
          in a high risk to their rights and freedoms.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          8. Data Retention
        </h2>
        <p className="mb-4">
          The Company retains personal information, including voicemail
          recordings and transcripts, only for as long as necessary to fulfill
          the purposes for which it was collected and processed. The criteria
          used to determine retention periods include:
        </p>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Provision of the Service:</strong> Data is retained for the
            duration the User maintains an active account and as necessary to
            provide the features of the Service.
          </li>
          <li>
            <strong>Legal and Regulatory Obligations:</strong> Retention periods
            may be dictated by applicable laws and regulations (e.g., for
            financial records, or in response to legal holds).
          </li>
          <li>
            <strong>
              Resolution of Disputes and Enforcement of Agreements:
            </strong>
            Information may be retained as necessary to resolve disputes,
            enforce the Company's terms of service, or defend legal claims.
          </li>
          <li>
            <strong>Business Needs:</strong> For purposes such as AI model
            integrity and improvement, data may be retained. However, this is
            balanced against data minimization principles. For AI model
            training, raw personal data is retained for the shortest period
            necessary, and efforts are made to use de-identified, aggregated, or
            anonymized data for longer-term model evolution. Indefinite
            retention of identifiable user voicemails for potential future model
            training is avoided.
          </li>
          <li>
            <strong>User Choices:</strong> Users may have the ability to delete
            individual voicemails or their entire account. When a User deletes a
            voicemail or their account through the Service interface:
            <ul className="ml-4 mt-2 list-inside list-disc space-y-1">
              <li>
                The data is typically marked for deletion and removed from
                active systems promptly.
              </li>
              <li>
                It may persist in backup archives for a limited period (e.g.,
                30-90 days) before being permanently erased, as per standard
                backup rotation schedules. This backup data is not accessed for
                operational purposes.
              </li>
              <li>
                If data has been used to train AI models, the deletion from
                active systems does not automatically remove its learned
                influence from already trained models. The Company is
                transparent that retraining models to exclude specific past data
                is a complex process and may occur periodically or based on
                aggregated deletion requests.
              </li>
            </ul>
          </li>
        </ul>
        <p className="mb-4">
          The Company is committed to transparency regarding what happens to
          data upon User-initiated deletion versus any backend retention for
          legitimate, specified purposes (such as short-term backups or, if
          explicitly stated and based on a lawful ground, de-identified data for
          long-term AI training).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          9. International Data Transfers
        </h2>
        <p className="mb-4">
          Personal information collected by the Company may be transferred to,
          stored in, and processed in countries other than the User's country of
          residence. These countries may have data protection laws that are
          different from, and potentially less protective than, the laws of the
          User's jurisdiction. AI services often leverage global cloud
          infrastructure, making such transfers common.
        </p>
        <p className="mb-4">
          If the Company transfers personal information originating from the
          European Economic Area (EEA), the United Kingdom (UK), or Switzerland
          to countries that have not been deemed to provide an adequate level of
          data protection by the relevant authorities, it relies on appropriate
          legal safeguards. These safeguards may include:
        </p>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Adequacy Decisions:</strong> Transferring data to countries
            recognized by the European Commission (or relevant UK/Swiss
            authorities) as providing an adequate level of data protection.
          </li>
          <li>
            <strong>Standard Contractual Clauses (SCCs):</strong> Implementing
            SCCs as approved by the European Commission (or relevant UK/Swiss
            authorities) between the Company and the data importer. These
            clauses impose data protection obligations on the data importer.
          </li>
          <li>
            <strong>Binding Corporate Rules (BCRs):</strong> For intra-group
            transfers, BCRs approved by competent data protection authorities
            may be used.
          </li>
          <li>
            <strong>
              EU-U.S. Data Privacy Framework (DPF) and UK/Swiss Extensions:
            </strong>
            If the Company or its relevant sub-processors are certified under
            the DPF and its extensions, this may serve as a valid transfer
            mechanism for data from the EU, UK, and Switzerland to the United
            States.
          </li>
        </ul>
        <p className="mb-4">
          The Company's primary data processing servers may be located in.
          Information about the locations of key sub-processors can be found in
          the Company's sub-processor list. The Company stays informed of legal
          developments concerning international data transfers, such as those
          arising from rulings like Schrems II and subsequent frameworks, to
          ensure ongoing compliance.
        </p>
        <p className="mb-4">
          If a User is located in the EEA or UK and the Company is not
          established in the EU, an EU Representative may be appointed as
          required by GDPR. Contact details for any such representative would be
          provided in Section 13.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          10. Children's Privacy
        </h2>
        <p className="mb-4">
          The Service is not intended for or directed at individuals under the
          age of. The Company does not knowingly collect personal information
          from children under this specified age.
        </p>
        <p className="mb-4">
          If the Company becomes aware that it has inadvertently collected
          personal information from a child under this age without verifiable
          parental consent (where required), it will take steps to delete that
          information promptly. If a parent or guardian believes that their
          child has provided personal information to the Company without their
          consent, they should contact the Company using the details in Section
          13.
        </p>
        <p className="mb-4">
          The California Consumer Privacy Act (CCPA)/CPRA has specific
          requirements for businesses that "sell" or "share" the personal
          information of minors. If the Company has actual knowledge that a User
          is under 16 years of age, it will not sell or share their personal
          information without affirmative authorization (opt-in consent) from
          the minor if they are between 13 and 16, or from their parent or
          guardian if they are under 13. Given the nature of the Service, it is
          not anticipated that it will be used by individuals who would trigger
          these specific opt-in requirements, but the Company remains vigilant.
        </p>
        <p className="mb-4">
          Processing children's voice data, especially for AI model training,
          would raise significant ethical and legal concerns. Therefore, the
          Company strictly prohibits the knowing collection and processing of
          children's voice data for such purposes.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          11. Use of AI and Automated Decision-Making
        </h2>
        <p className="mb-4">
          The Company is committed to transparency regarding its use of
          Artificial Intelligence (AI) in the Service.
        </p>
        <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
          <li>
            <strong>Transparency about AI Use:</strong> The Service utilizes AI
            to process voicemails and provide various features. These
            functionalities include, but are not limited to, automated voicemail
            transcription, summarization of messages, analysis of call patterns
            for spam detection, and potentially other analytical capabilities
            designed to enhance the User experience.
          </li>
          <li>
            <strong>Data Used for AI:</strong> The primary data fueling these AI
            systems are the voicemail audio recordings, the AI-generated
            transcripts of these recordings, and User interactions with
            AI-powered features (e.g., corrections to transcripts, feedback on
            summaries).
          </li>
          <li>
            <strong>Purpose of AI Processing:</strong> AI is employed to deliver
            innovative and efficient voicemail management tools, improve the
            accuracy of transcriptions and other AI outputs, and personalize the
            User experience where appropriate.
          </li>
          <li>
            <strong>AI Model Training:</strong>
            <ul className="ml-4 mt-2 list-inside list-disc space-y-1">
              <li>
                The Company is explicit that User data, including voicemail
                audio and transcripts, may be used to train and improve the AI
                models that underpin the Service. This ongoing training is
                essential for maintaining and enhancing the quality, accuracy,
                and capabilities of the AI.
              </li>
              <li>
                <strong>Lawful Basis:</strong> The legal basis for using User
                data for AI model training is typically explicit consent or
                legitimate interest, coupled with robust privacy safeguards.
                Where legitimate interest is relied upon, it is based on the
                Company's interest in providing a state-of-the-art, continuously
                improving service, balanced against the User's privacy rights.
              </li>
              <li>
                <strong>Privacy-Preserving Techniques:</strong> When User data
                is used for general AI model training (i.e., to improve the
                models for all users, not just for personalizing the individual
                User's service), the Company employs techniques to protect
                privacy. These may include de-identification, pseudonymization,
                aggregation of data, or other methods designed to prevent the
                direct identification of individuals. The Company may also
                explore and implement advanced privacy-enhancing technologies
                such as differential privacy, which adds statistical noise to
                data or model parameters to provide mathematical guarantees
                against re-identification of individual contributions to the
                training dataset.
              </li>
              <li>
                <strong>User Choices:</strong> Users may be provided with
                choices regarding the use of their data for general AI model
                training. This could take the form of an opt-in mechanism or an
                opt-out right, clearly presented within the Service settings or
                account preferences. The trend among leading AI providers is
                towards greater user control over data used for training general
                models, and the Company aims to align with these best practices.
              </li>
            </ul>
          </li>
          <li>
            <strong>Automated Decision-Making:</strong>
            <ul className="ml-4 mt-2 list-inside list-disc space-y-1">
              <li>
                The AI Voicemail Assistant is primarily designed to assist Users
                in managing their voicemails and is not intended to make
                automated decisions that have legal or similarly significant
                effects on Users.
              </li>
              <li>
                However, if future features were to involve such automated
                decision-making (e.g., an AI-driven system that automatically
                blocks callers based on complex analysis, leading to a
                significant impact on the User's ability to receive
                communications), the Company would provide Users with meaningful
                information about the logic involved (in a general,
                understandable manner), the significance, and the envisaged
                consequences of such processing. In such scenarios, Users would
                also be informed of their rights to obtain human intervention,
                express their point of view, and contest the automated decision,
                in line with requirements such as Article 22 of the GDPR.
              </li>
            </ul>
          </li>
          <li>
            <strong>Fairness and Accuracy:</strong>
            <ul className="ml-4 mt-2 list-inside list-disc space-y-1">
              <li>
                The Company recognizes the potential for biases in AI models and
                is committed to ongoing efforts to promote fairness, accuracy,
                and mitigate harmful biases in its AI systems. This includes
                careful dataset selection (where applicable for pre-training),
                model evaluation, and monitoring for performance disparities.
                The challenge of AI "black boxes" is acknowledged, and while
                full algorithmic explainability of complex models can be
                difficult, the Company strives for transparency in how AI is
                generally used and what types of data influence its outputs.
              </li>
              <li>
                Data derived by the AI (e.g., sentiment scores, inferred topics
                from voicemails) is also considered personal data if linked to
                an individual. The use of this AI-derived data will adhere to
                the same principles of purpose limitation and lawful basis as
                other personal data.
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          12. Changes to This Privacy Policy
        </h2>
        <p className="mb-4">
          The Company may update this Privacy Policy from time to time to
          reflect changes in its practices, the Service, legal requirements, or
          advancements in technology. The "Last Updated" date at the top of this
          Policy indicates when it was last revised.
        </p>
        <p className="mb-4">
          Users will be notified of material changes to this Privacy Policy.
          Notification methods may include sending an email to the registered
          email address, providing an in-app notification, or posting a
          prominent notice on the Company's website. Minor updates or
          clarifications may be made without direct notification beyond updating
          the "Last Updated" date.
        </p>
        <p className="mb-4">
          Users are encouraged to review this Privacy Policy periodically to
          stay informed about how their personal information is collected, used,
          and protected. Continued use of the Service after any changes to this
          Privacy Policy constitutes acceptance of the revised terms. For
          material changes that significantly alter data processing practices,
          the Company may seek renewed consent where required by law.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          13. Contact Information
        </h2>
        <p className="mb-4">
          For any questions, concerns, or complaints about this Privacy Policy
          or the Company's data handling practices, or to exercise privacy
          rights, Users may contact the Company through the following channels:
        </p>
        <address className="mb-4 not-italic">
          <strong>Email:</strong>{' '}
          <a
            href="mailto:admin@spoqen.com"
            className="text-blue-600 hover:underline"
          >
            admin@spoqen.com
          </a>
        </address>
        <p className="mb-4">
          If the Company has appointed a Data Protection Officer (DPO) as per
          GDPR requirements, their contact details will be provided here or can
          be obtained by contacting the Privacy Office.
        </p>
        <p className="mb-4">
          If the Company is required to appoint an EU or UK Representative under
          Article 27 of the GDPR, their contact details will be provided here:
        </p>
        <address className="not-italic">
          <strong>EU Representative:</strong> [Details to be provided if
          applicable]
          <br />
          <strong>UK Representative:</strong> [Details to be provided if
          applicable]
        </address>
        <p className="mt-4">
          The Company is committed to addressing privacy inquiries promptly and
          effectively. An easily accessible and responsive privacy contact point
          is critical for building trust, especially for an AI service handling
          sensitive voice data.
        </p>
      </section>

      <section>
        <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
          Final Statement
        </h2>
        <p className="mb-4">
          The Company is dedicated to protecting the privacy of its Users and
          handling personal information responsibly and transparently, in
          accordance with applicable laws and best practices, particularly in
          the evolving landscape of artificial intelligence.
        </p>
      </section>
    </div>
  );
}
