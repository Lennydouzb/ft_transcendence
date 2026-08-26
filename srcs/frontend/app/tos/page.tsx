export default function TosPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm opacity-70 mb-8">Last updated: August 26, 2026, 18:30</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
        <p className="mb-2">
          By creating an account or using this application (the &quot;Service&quot;), you agree to be
          bound by these Terms of Service. If you do not agree to these terms, please do not use
          the Service.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. Description of Service</h2>
        <p className="mb-2">
          The Service is a web application that allows users to create an account, add friends,
          chat with other users in real time, and play online games. The Service is provided as
          part of an educational project and is not intended for commercial use.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">3. Accounts</h2>
        <p className="mb-2">
          You must provide accurate information when creating an account and are responsible for
          maintaining the confidentiality of your password. You are responsible for all activity
          that occurs under your account. You must notify us promptly if you become aware of any
          unauthorized use of your account.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">4. User Conduct</h2>
        <p className="mb-2">When using the Service, you agree not to:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Harass, threaten, or abuse other users in chat or gameplay</li>
          <li>Upload or share content that is illegal, offensive, or infringes on others&apos; rights</li>
          <li>Attempt to gain unauthorized access to other accounts or the Service&apos;s infrastructure</li>
          <li>Use bots, scripts, or exploits to cheat in games or manipulate scores</li>
          <li>Impersonate another person or entity</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">5. User Content</h2>
        <p className="mb-2">
          You retain ownership of any content you upload (such as your avatar or chat messages).
          By uploading content, you grant the Service a limited license to store and display that
          content solely for the purpose of operating the Service.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">6. Termination</h2>
        <p className="mb-2">
          We reserve the right to suspend or terminate your account at any time if you violate
          these Terms or engage in behavior that disrupts the Service or harms other users.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">7. Disclaimer</h2>
        <p className="mb-2">
          The Service is provided &quot;as is&quot; without warranties of any kind, express or implied.
          As an educational project, the Service may be unstable, incomplete, or discontinued at
          any time without notice.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">8. Changes to These Terms</h2>
        <p className="mb-2">
          These Terms may be updated from time to time. Continued use of the Service after any
          changes constitutes acceptance of the new Terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">9. Contact</h2>
        <p>
          For any questions regarding these Terms, please contact the project maintainers.
        </p>
      </section>
    </main>
  );
}
