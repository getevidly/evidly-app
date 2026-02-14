import { Breadcrumb } from '../components/Breadcrumb';

export function PrivacyPolicy() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Privacy Policy' }]} />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 14, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Information We Collect</h2>
            <p>We collect information you provide directly, including: name, email address, company information, and payment details. We also collect operational data you input into the platform such as temperature logs, checklist completions, documents, photos, and compliance records.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. How We Use Your Information</h2>
            <p>We use your information to: (a) provide and improve the EvidLY Service; (b) calculate compliance scores and generate reports; (c) send notifications about expiring documents and compliance alerts; (d) provide customer support; (e) process payments; (f) comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Data Storage and Security</h2>
            <p>Your data is stored securely using Supabase infrastructure with encryption at rest and in transit. We implement industry-standard security measures including role-based access control, audit logging, and regular security assessments. Data is stored in the United States.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with: (a) service providers who assist in operating the platform (hosting, payment processing); (b) health inspectors or regulatory bodies at your explicit request; (c) law enforcement when required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Your Rights</h2>
            <p>You have the right to: (a) access your data at any time through the platform; (b) export your data in standard formats (CSV, PDF); (c) request deletion of your account and data; (d) opt out of marketing communications; (e) correct inaccurate information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Cookies and Analytics</h2>
            <p>We use essential cookies to maintain your session and preferences. We use analytics tools to understand how the platform is used and to improve the Service. You can manage cookie preferences through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. California Privacy Rights (CCPA)</h2>
            <p>California residents have additional rights under the CCPA, including the right to know what personal information is collected, the right to delete personal information, and the right to opt-out of the sale of personal information. We do not sell personal information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Children's Privacy</h2>
            <p>EvidLY is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the platform. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Contact Us</h2>
            <p>For privacy-related inquiries:<br />EvidLY, LLC<br />Email: privacy@evidly.com<br />Stockton, California</p>
          </section>
        </div>
      </div>
    </>
  );
}
