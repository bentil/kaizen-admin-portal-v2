import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
                <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="prose prose-slate max-w-none">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
                    <p className="text-sm text-slate-500 mb-8">Last updated: March 20, 2026</p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Welcome to Kaizen Admin. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you about how we look after your personal data when you visit our website
                            and use our services, and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Data We Collect</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            We may collect, use, store and transfer different kinds of personal data about you, which we have grouped as follows:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li><strong>Identity Data:</strong> includes first name, last name, username, and similar identifiers.</li>
                            <li><strong>Contact Data:</strong> includes email address, phone numbers, and physical addresses.</li>
                            <li><strong>Organization Data:</strong> includes organization name, type, address, and related business information.</li>
                            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, browser type and version,
                                time zone setting and location, browser plug-in types and versions, operating system and platform,
                                and other technology on the devices you use to access this website.</li>
                            <li><strong>Usage Data:</strong> includes information about how you use our website, products, and services.</li>
                            <li><strong>Marketing and Communications Data:</strong> includes your preferences in receiving marketing
                                from us and your communication preferences.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">3. How We Use Your Data</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li>To provide and maintain our service, including to monitor the usage of our service.</li>
                            <li>To notify you about changes to our service.</li>
                            <li>To provide customer support and respond to your inquiries.</li>
                            <li>To gather analysis or valuable information so that we can improve our service.</li>
                            <li>To monitor the usage of our service and detect technical issues.</li>
                            <li>To prevent, detect and address technical issues and security threats.</li>
                            <li>To send you marketing and promotional communications (where you have opted in).</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Data Security</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost,
                            used, or accessed in an unauthorized way, altered, or disclosed. In addition, we limit access to your personal
                            data to those employees, agents, contractors, and other third parties who have a business need to know.
                            They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Cookies</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Our website uses cookies to distinguish you from other users of our website. This helps us to provide you with
                            a good experience when you browse our website and also allows us to improve our site. For detailed information
                            about the cookies we use and your choices regarding cookies, please see our Cookie Settings.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Your Legal Rights</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Under certain circumstances, you have rights under data protection laws in relation to your personal data:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li><strong>Request access</strong> to your personal data.</li>
                            <li><strong>Request correction</strong> of your personal data.</li>
                            <li><strong>Request erasure</strong> of your personal data.</li>
                            <li><strong>Object to processing</strong> of your personal data.</li>
                            <li><strong>Request restriction</strong> of processing your personal data.</li>
                            <li><strong>Request transfer</strong> of your personal data.</li>
                            <li><strong>Right to withdraw consent</strong>.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Data Retention</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for,
                            including for the purposes of satisfying any legal, accounting, or reporting requirements. When we no longer
                            require your personal data, we will securely delete or anonymize it.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Third-Party Services</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We may employ third-party companies and individuals to facilitate our service, provide the service on our behalf,
                            perform service-related services, or assist us in analyzing how our service is used. These third parties have
                            access to your personal data only to perform these tasks on our behalf and are obligated not to disclose or use
                            it for any other purpose.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Children's Privacy</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Our service does not address anyone under the age of 18. We do not knowingly collect personally identifiable
                            information from anyone under the age of 18. If you are a parent or guardian and you are aware that your child
                            has provided us with personal data, please contact us.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Changes to This Privacy Policy</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy
                            Policy on this page and updating the "Last updated" date at the top of this page. You are advised to review this
                            Privacy Policy periodically for any changes.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Contact Us</h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us:
                        </p>
                        <ul className="list-none pl-0 text-slate-600 mt-4 space-y-2">
                            <li>By email: privacy@kaizen-aceit.com</li>
                            <li>By visiting our contact page: <Link href="/contact" className="text-violet-600 hover:text-violet-700">Contact Us</Link></li>
                        </ul>
                    </section>

                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <p className="text-sm text-slate-500">
                            By using our service, you acknowledge that you have read and understood this Privacy Policy.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}