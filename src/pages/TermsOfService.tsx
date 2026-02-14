import { Breadcrumb } from '../components/Breadcrumb';

export function TermsOfService() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Terms of Service' }]} />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 14, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p>By accessing or using EvidLY ("Service"), operated by EvidLY, LLC, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Description of Service</h2>
            <p>EvidLY provides a commercial kitchen compliance management platform including temperature monitoring, checklist management, document storage, vendor management, HACCP plan tracking, and AI-powered compliance insights. The Service is designed to help food service operations maintain compliance with health and safety regulations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. User Accounts</h2>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify EvidLY immediately of any unauthorized use of your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Subscription and Billing</h2>
            <p>Access to EvidLY requires a paid subscription after the free trial period. Subscription fees are billed monthly or annually as selected during signup. All fees are non-refundable except as required by law. EvidLY reserves the right to modify pricing with 30 days notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Data Ownership</h2>
            <p>You retain ownership of all data you upload to EvidLY, including documents, temperature logs, photos, and other compliance records. EvidLY will not sell, share, or use your data for purposes other than providing the Service. You may export your data at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Privacy</h2>
            <p>Your use of the Service is also governed by our <a href="/privacy" className="text-[#1e4d6b] underline hover:text-[#2a6a8f]">Privacy Policy</a>, which describes how we collect, use, and protect your information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Acceptable Use</h2>
            <p>You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to the Service or its systems; (c) interfere with or disrupt the Service; (d) upload malicious code or content; (e) resell or redistribute the Service without written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Intellectual Property</h2>
            <p>EvidLY and its associated logos, interfaces, features, and content are the intellectual property of EvidLY, LLC. You may not copy, modify, distribute, or create derivative works from the Service without written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Limitation of Liability</h2>
            <p>EvidLY is provided "as is" without warranties of any kind. EvidLY, LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. Our total liability shall not exceed the amount paid by you in the twelve months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Termination</h2>
            <p>Either party may terminate the subscription at any time. Upon termination, your access to the Service will end, but you may export your data within 30 days. EvidLY reserves the right to suspend or terminate accounts that violate these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">11. Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of San Joaquin County, California.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">12. Contact Information</h2>
            <p>EvidLY, LLC<br />Email: legal@evidly.com<br />Stockton, California</p>
          </section>
        </div>
      </div>
    </>
  );
}
