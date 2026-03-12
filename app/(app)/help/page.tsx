"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

interface FAQItem {
	question: string;
	answer: string;
}

const faqItems: FAQItem[] = [
	{
		question: "How does matching work?",
		answer:
			"When you search for an activity partner in Explore, we automatically find users with matching interests and availability. Connection requests are sent to compatible matches, and you can start chatting once both parties accept.",
	},
	{
		question: "How do I start a chat with someone?",
		answer:
			"Chats begin when a connection request is accepted. You can receive requests on your Home page and accept them to start messaging. You can also join community chats by joining a community.",
	},
	{
		question: "How do I change my preferences?",
		answer:
			'Go to your Profile page and tap "Edit Preferences" to update your interests, comfort level, availability, and other settings that help us find better matches for you.',
	},
	{
		question: "How do I create an event?",
		answer:
			'Tap the "+" button on the Home page to create a new event. Fill in the activity type, title, description, date and time. Your event will be visible to other users with matching interests.',
	},
	{
		question: "How do I join a community?",
		answer:
			'Browse communities on the Explore page or Home page. Click "Join Community" on any community card to become a member. You\'ll automatically get access to the community chat.',
	},
	{
		question: "Is my data safe?",
		answer:
			"Yes! We take privacy seriously. Your personal information is encrypted and never shared without your consent. You control what's visible on your profile.",
	},
];

export default function HelpSupport(): React.ReactElement {
	const router = useRouter();
	const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
	const [feedbackText, setFeedbackText] = useState<string>("");
	const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

	const handleSendFeedback = (): void => {
		if (!feedbackText.trim()) return;
		// In a real app, this would send to backend
		console.log("Feedback submitted:", feedbackText);
		setFeedbackSent(true);
		setFeedbackText("");
		setTimeout(() => setFeedbackSent(false), 3000);
	};

	return (
		<div className="min-h-screen bg-[#161621] text-white">
			<Navbar />

			<main className="max-w-2xl mx-auto px-4 pt-20 pb-24">
				{/* Header */}
				<header className="mb-8">
					<button
						type="button"
						onClick={() => router.push("/profile")}
						className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Back to Profile
					</button>
					<h1 className="text-2xl sm:text-3xl font-bold">
						<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
							Help & Support
						</span>
					</h1>
					<p className="text-gray-400 mt-1">Find answers or send us feedback</p>
				</header>

				{/* FAQ Section */}
				<section className="mb-8">
					<h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
						<span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
							<svg
								className="w-4 h-4 text-purple-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</span>
						Frequently Asked Questions
					</h2>
					<div className="space-y-3">
						{faqItems.map((faq, index) => (
							<div
								key={faq.question}
								className="rounded-2xl bg-[#1e1e2e] border border-white/10 overflow-hidden"
							>
								<button
									type="button"
									onClick={() =>
										setExpandedFaq(expandedFaq === index ? null : index)
									}
									className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
								>
									<span className="font-medium text-white pr-4">
										{faq.question}
									</span>
									<svg
										className={`w-5 h-5 text-gray-400 transition-transform duration-200 shrink-0 ${
											expandedFaq === index ? "rotate-180" : ""
										}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</button>
								{expandedFaq === index && (
									<div className="px-4 pb-4">
										<p className="text-gray-400 text-sm leading-relaxed">
											{faq.answer}
										</p>
									</div>
								)}
							</div>
						))}
					</div>
				</section>

				{/* Contact Section */}
				<section className="mb-8">
					<h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
						<span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
							<svg
								className="w-4 h-4 text-cyan-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
						</span>
						Contact Us
					</h2>
					<div className="p-5 rounded-2xl bg-[#1e1e2e] border border-white/10">
						<p className="text-gray-400 text-sm mb-4">
							Can't find what you're looking for? Reach out to us directly.
						</p>
						<div className="space-y-3">
							<a
								href="mailto:support@socialsphere.app"
								className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
							>
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
									<svg
										className="w-5 h-5 text-purple-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.5}
											d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
										/>
									</svg>
								</div>
								<div>
									<p className="text-white font-medium">Email Support</p>
									<p className="text-sm text-gray-500">
										support@socialsphere.app
									</p>
								</div>
							</a>
						</div>
					</div>
				</section>

				{/* Feedback Section */}
				<section>
					<h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
						<span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
							<svg
								className="w-4 h-4 text-green-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
								/>
							</svg>
						</span>
						Send Feedback
					</h2>
					<div className="p-5 rounded-2xl bg-[#1e1e2e] border border-white/10">
						<p className="text-gray-400 text-sm mb-4">
							We'd love to hear your thoughts! Help us improve SocialSphere.
						</p>
						{feedbackSent ? (
							<div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
								<svg
									className="w-10 h-10 text-green-400 mx-auto mb-2"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<p className="text-green-300 font-medium">
									Thank you for your feedback!
								</p>
							</div>
						) : (
							<>
								<textarea
									value={feedbackText}
									onChange={(e) => setFeedbackText(e.target.value)}
									placeholder="Share your thoughts, report bugs, or suggest features..."
									rows={4}
									className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none mb-4"
								/>
								<button
									type="button"
									onClick={handleSendFeedback}
									disabled={!feedbackText.trim()}
									className={`w-full py-3 rounded-xl font-medium transition-all ${
										feedbackText.trim()
											? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
											: "bg-white/10 text-gray-500 cursor-not-allowed"
									}`}
								>
									Send Feedback
								</button>
							</>
						)}
					</div>
				</section>

				{/* App Info */}
				<div className="mt-8 text-center text-gray-500 text-sm">
					<p>SocialSphere v1.0.0</p>
					<p className="mt-1">Made with love for meaningful connections</p>
				</div>
			</main>

			<BottomNav />
		</div>
	);
}
