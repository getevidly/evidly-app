import { Breadcrumb } from '../components/Breadcrumb';

export function TermsOfService() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Terms of Service' }]} />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#1E2D4D]/70 mb-1">Last updated: May 11, 2026</p>
        <p className="text-sm text-[#1E2D4D]/70 mb-8">Effective: May 11, 2026</p>

        <div className="prose prose-sm max-w-none text-[#1E2D4D]/80 space-y-6">
          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">1. Acceptance of Terms</h2>
            <p>By accessing or using EvidLY ("Service"), operated by EvidLY, LLC, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">2. Description of Service</h2>
            <p>EvidLY provides a commercial kitchen compliance management platform including temperature monitoring, checklist management, document storage, vendor management, HACCP plan tracking, and AI-powered compliance insights. The Service is designed to help food service operations maintain compliance with health and safety regulations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">3. User Accounts</h2>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify EvidLY immediately of any unauthorized use of your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">4. Subscription and Billing</h2>
            <p>Access to EvidLY requires a paid subscription. Subscription begins immediately upon signup — there is no free trial period.</p>
            <p className="mt-3"><strong>Founder Pricing.</strong> Accounts created before August 7, 2026 receive Founder Pricing, which locks the subscription rate at the price in effect at the time of signup for the lifetime of the continuous subscription. Founder Pricing is forfeited upon cancellation; re-subscription after cancellation will be at the then-current Standard pricing.</p>
            <p className="mt-3"><strong>Billing.</strong> Subscription fees are billed monthly or annually as selected during signup. Annual billing provides a discount equivalent to two months free compared to monthly billing. Annual subscriptions commit the subscriber for a 12-month term. Monthly subscriptions renew each calendar month. Annual subscribers who cancel mid-term forfeit any remaining months but are not issued a refund; the subscription continues to run, and the subscriber retains access, through the end of the paid 12-month term.</p>
            <p className="mt-3"><strong>Risk-Free Guarantee.</strong> The Risk-Free Guarantee provides a 60-calendar-day window from signup. The first 15 days constitute the setup period; the remaining 45 days constitute the usage period. Subscribers who satisfy all criteria below and remain dissatisfied may request a 100% refund of subscription fees at any point within the 60-day window:</p>
            <p className="mt-2 pl-4">(a) <strong>Locations.</strong> All locations declared at signup must be entered in the Service within 15 calendar days of signup. Single-location and multi-location organizations alike must reach 100% of declared locations.</p>
            <p className="mt-2 pl-4">(b) <strong>Team member activation.</strong> Within 15 calendar days of signup, team members must be invited and activated per the following thresholds based on total user accounts on the subscription plan:</p>
            <ul className="list-disc pl-10 mt-1 space-y-1">
              <li>1 to 5 accounts: 100% of accounts invited and activated</li>
              <li>6 to 9 accounts: 75% of accounts invited and activated</li>
              <li>10 or more accounts: 50% of accounts invited and activated</li>
            </ul>
            <p className="pl-4 mt-1">Solo-operator subscriptions (1 account) satisfy this requirement upon activation of the owner's account.</p>
            <p className="mt-2 pl-4">(c) <strong>Food safety activity.</strong> Food safety activity must be logged on at least 36 days within the 60-day Risk-Free Guarantee window. Food safety activity is defined as: a temperature log entry OR a checklist entry.</p>
            <p className="mt-3">If criteria (a) and (b) are not satisfied by the end of the 15-day setup period, the Risk-Free Guarantee is forfeited regardless of subsequent activity. Criterion (c) is measured through the end of the 60-day window.</p>
            <p className="mt-3">Eligibility status is tracked automatically by the Service. Subscribers may check their current eligibility status at any time.</p>
            <p className="mt-3"><strong>Setup Fees.</strong> Setup fees are non-refundable under all circumstances, including approved Risk-Free Guarantee refunds. Setup fees by tier:</p>
            <ul className="list-disc pl-10 mt-1 space-y-1">
              <li>Founder subscriptions: $250</li>
              <li>Standard subscriptions: $500</li>
              <li>Enterprise subscriptions (10+ locations): custom pricing</li>
            </ul>
            <p className="mt-1">Setup fees cover initial account configuration, location onboarding, and integration setup performed by EvidLY at the start of the subscription. Refunds issued under the Risk-Free Guarantee return all subscription fees paid but exclude the setup fee.</p>
            <p className="mt-3">Outside the 60-day window, or if the Guarantee is forfeited, all fees are non-refundable except as required by law.</p>
            <p className="mt-3"><strong>Price Changes.</strong> EvidLY reserves the right to modify Standard pricing with 30 days written notice. Founder Pricing rates are not subject to increases for the duration of continuous subscription.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">5. Data Ownership</h2>
            <p>You retain ownership of all data you upload to EvidLY, including documents, temperature logs, photos, and other compliance records. EvidLY will not sell, share, or use your data for purposes other than providing the Service. You may export your data at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">6. Privacy</h2>
            <p>Your use of the Service is also governed by our <a href="/privacy" className="text-[#1E2D4D] underline hover:text-[#2A3F6B]">Privacy Policy</a>, which describes how we collect, use, and protect your information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">7. Acceptable Use</h2>
            <p>You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to the Service or its systems; (c) interfere with or disrupt the Service; (d) upload malicious code or content; (e) resell or redistribute the Service without written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">8. Intellectual Property</h2>
            <p>EvidLY and its associated logos, interfaces, features, and content are the intellectual property of EvidLY, LLC. You may not copy, modify, distribute, or create derivative works from the Service without written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">9. Limitation of Liability</h2>
            <p>EvidLY is provided "as is" without warranties of any kind. EvidLY, LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. Our total liability shall not exceed the amount paid by you in the twelve months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">10. Termination</h2>
            <p><strong>Cancellation by Subscriber.</strong> You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing cycle (month or annual term). You retain full access to the Service until the end of that cycle. Upon cancellation, Founder Pricing is permanently forfeited — any future subscription will be at the then-current Standard pricing.</p>
            <p className="mt-3"><strong>Data Export.</strong> Upon termination, you may export your data for 30 days following the end of your final billing cycle. After 30 days, data may be permanently deleted.</p>
            <p className="mt-3"><strong>Termination by EvidLY.</strong> EvidLY reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or fail to pay subscription fees after 14 days of a failed payment attempt.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">11. Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of San Joaquin County, California.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">12. Contact Information</h2>
            <p>EvidLY, LLC<br />Email: legal@evidly.com<br />Stockton, California</p>
          </section>
        </div>
      </div>
    </>
  );
}
