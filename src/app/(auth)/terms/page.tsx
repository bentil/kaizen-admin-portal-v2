import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsAndConditionsPage() {
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
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms and Conditions</h1>
                    <p className="text-sm text-slate-500 mb-8">Last updated: March 20, 2026</p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Agreement to Terms</h2>
                        <p className="text-slate-600 leading-relaxed">
                            These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity, and Kaizen Admin concerning your access to and use of our website and services. You agree that by accessing the Service, you have read, understood, and agreed to be bound by all of these Terms and Conditions.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Intellectual Property Rights</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Unless otherwise indicated, the Service is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Service (collectively, the Content) and the trademarks, service marks, and logos contained therein (the Marks) are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">3. User Representations</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            By using the Service, you represent and warrant that:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li>You have the legal capacity and you agree to comply with these Terms and Conditions.</li>
                            <li>You are not a minor in the jurisdiction in which you reside.</li>
                            <li>You will not access the Service through automated or non-human means.</li>
                            <li>You will not use the Service for any illegal or unauthorized purpose.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">4. User Registration</h2>
                        <p className="text-slate-600 leading-relaxed">
                            You may be required to register with the Service. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Fees and Payment</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We reserve the right to require payment of fees for the use of the Service. You will be required to provide accurate and complete billing information including full name, address, state, zip code, telephone number, and valid payment method information. All payments are non-refundable except as expressly stated in these Terms or our Refund Policy.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Subscription</h2>
                        <p className="text-slate-600 leading-relaxed">
                            The Service may require a paid subscription to access certain features. Your subscription will automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. You may manage your subscription and turn off auto-renewal by going to your Account Settings after purchase.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Prohibited Activities</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            You may not access or use the Service for any purpose other than that for which we make the Service available. Prohibited activities include, but are not limited to:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 space-y-2">
                            <li>Systematically retrieving data or other content from the Service to create or compile a collection without written permission from us.</li>
                            <li>Making any unauthorized use of the Service, including collecting usernames and/or email addresses of users by electronic or other means.</li>
                            <li>Using the Service to advertise or offer to sell goods and services.</li>
                            <li>Circumventing, disabling, or otherwise interfering with security-related features of the Service.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Privacy Policy</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We care about the privacy of our users. Our Privacy Policy explains how we collect, use, and disclose information about you when you access or use our Service. By accessing or using the Service, you agree to the collection, use, and disclosure of your information as set forth in the Privacy Policy.{" "}
                            <Link href="/privacy" className="text-violet-600 hover:text-violet-700">View our Privacy Policy</Link>.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Term and Termination</h2>
                        <p className="text-slate-600 leading-relaxed">
                            These Terms shall remain in full force and effect while you use the Service. We reserve the right to terminate your use or access to the Service at our sole discretion, without notice, at any time.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Limitation of Liability</h2>
                        <p className="text-slate-600 leading-relaxed">
                            IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Governing Law</h2>
                        <p className="text-slate-600 leading-relaxed">
                            These Terms shall be governed by and defined following the laws of the jurisdiction in which the Service is operated. We reserve the right to make changes to these Terms at any time.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">12. Contact Us</h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have any questions about these Terms, please contact us:
                        </p>
                        <ul className="list-none pl-0 text-slate-600 mt-4 space-y-2">
                            <li>By email: legal@kaizen-aceit.com</li>
                            <li>By visiting our contact page: <Link href="/contact" className="text-violet-600 hover:text-violet-700">Contact Us</Link></li>
                        </ul>
                    </section>

                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <p className="text-sm text-slate-500">
                            By using our service, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}