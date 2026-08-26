export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm opacity-70 mb-8">Last updated: August 26, 2026, 18:30</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
        <p className="mb-2">
          This Privacy Policy explains what information we collect when you use this application
          (the &quot;Service&quot;), how it is used, and how it is protected. This Service is an
          educational project and data handling is limited to what is necessary for the app to
          function.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="font-medium">Account information:</span> username, email address, and a securely hashed password</li>
          <li><span className="font-medium">Profile data:</span> avatar image, if uploaded</li>
          <li><span className="font-medium">Usage data:</span> friend lists, chat messages, and game scores</li>
          <li><span className="font-medium">Session data:</span> authentication tokens (JWT) used to keep you signed in</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">3. How We Use Your Information</h2>
        <p className="mb-2">Your information is used solely to operate the Service, specifically to:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Authenticate you and maintain your session</li>
          <li>Enable chat and real-time gameplay features</li>
          <li>Display your profile and score to other users, where applicable</li>
          <li>Maintain friend relationships between accounts</li>
        </ul>
        <p className="mt-2">
          We do not sell, rent, or share your personal information with third parties for
          marketing purposes.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">4. Data Storage and Security</h2>
        <p className="mb-2">
          Passwords are stored using secure hashing and are never stored or transmitted in plain
          text. Data is stored in a database dedicated to the Service. While reasonable measures
          are taken to protect your data, no method of electronic storage is completely secure,
          and this Service cannot guarantee absolute security.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">5. Cookies and Tokens</h2>
        <p className="mb-2">
          The Service uses authentication tokens (JWT) to keep you signed in. These may be stored
          in cookies or local storage depending on configuration, and are used only for session
          management, not for tracking or advertising purposes.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">6. Your Rights</h2>
        <p className="mb-2">You may, at any time:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Access or update your account information via your profile settings</li>
          <li>Request deletion of your account and associated data</li>
          <li>Contact the project maintainers with any privacy-related concerns</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">7. Data Retention</h2>
        <p className="mb-2">
          Your data is retained as long as your account remains active. If you request account
          deletion, your personal data will be removed within a reasonable timeframe.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">8. Changes to This Policy</h2>
        <p className="mb-2">
          This Privacy Policy may be updated periodically. Continued use of the Service after any
          changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">9. Contact</h2>
        <p>
          For any questions regarding this Privacy Policy or your data, please contact the project
          maintainers.
        </p>
      </section>
    </main>
  );
}
