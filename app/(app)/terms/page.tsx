"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const sections = [
	{
		title: "1. Eligibility",
		items: [
			"You must be at least 16 years old to use SocialSphere.",
			"By using this platform, you confirm that you meet this age requirement.",
		],
	},
	{
		title: "2. Purpose of the Platform",
		items: [
			"SocialSphere is designed to help users connect with others for activities, events, and shared interests.",
			"The platform facilitates introductions and connections only and does not guarantee any outcomes.",
		],
	},
	{
		title: "3. User Responsibility",
		items: [
			"You are solely responsible for the information you provide on your profile and during interactions.",
			"You agree to use the platform respectfully and not engage in harmful, abusive, or misleading behavior.",
			"You must not impersonate others or provide false information.",
		],
	},
	{
		title: "4. Offline Interactions Disclaimer",
		items: [
			"SocialSphere only facilitates connections between users. Any interaction, meeting, or activity that occurs outside the platform (offline) is entirely at the users’ own risk.",
			"We are NOT responsible for any incidents, damages, disputes, or consequences that occur after users choose to meet offline.",
			"Users are strongly advised to meet in public places, inform friends or family before meeting, and take necessary personal safety precautions.",
		],
	},
	{
		title: "5. No Guarantee of Matches or Connections",
		items: [
			"SocialSphere does not guarantee that you will find matches, partners, or successful connections.",
			"Matching is based on user-provided preferences and may not always be accurate or suitable.",
		],
	},
	{
		title: "6. Content and Conduct",
		items: [
			"You agree not to post or share offensive, illegal, or harmful content.",
			"You agree not to post spam or promotional content without permission.",
			"SocialSphere reserves the right to remove content or restrict accounts that violate these terms.",
		],
	},
	{
		title: "7. Account Usage",
		items: [
			"You are responsible for maintaining the confidentiality of your account.",
			"Any activity under your account is your responsibility.",
		],
	},
	{
		title: "8. Platform Availability",
		items: [
			"We may update, modify, or discontinue features at any time without prior notice.",
			"We do not guarantee uninterrupted or error-free service.",
		],
	},
	{
		title: "9. Limitation of Liability",
		items: [
			"SocialSphere is not liable for user behavior, misuse of the platform, or any direct or indirect damages resulting from use of the service.",
		],
	},
	{
		title: "10. Acceptance of Terms",
		items: [
			"By clicking “I Agree & Continue”, you confirm that you have read and understood these terms, agree to follow them, and accept all associated risks of using the platform.",
		],
	},
];

export default function TermsPage() {
	const router = useRouter();
	const { user, isLoading: isAuthLoading } = useAuth();
	const acceptTerms = useMutation(api.users.acceptTerms);
	const currentUser = useQuery(
		api.users.getByWorkosId,
		user?.id ? { workosId: user.id } : "skip",
	);
	const [isChecked, setIsChecked] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (currentUser?.termsAcceptedAt) {
			router.replace(
				currentUser.hasCompletedPreferences ? "/home" : "/preferences",
			);
		}
	}, [currentUser, router]);

	const handleContinue = async (): Promise<void> => {
		if (!user?.id || !isChecked) return;

		setIsSaving(true);
		setError(null);
		try {
			await acceptTerms({ workosId: user.id });
			router.replace("/preferences");
		} catch (err) {
			console.error("Failed to save terms acceptance:", err);
			setError("We could not save your acceptance. Please try again.");
			setIsSaving(false);
		}
	};

	if (isAuthLoading || !user || !currentUser) {
		return <div className="min-h-screen bg-transparent" />;
	}

	return (
		<main className="min-h-screen px-4 py-8 text-white sm:px-6 sm:py-12">
			<div className="mx-auto max-w-3xl">
				<header className="mb-8">
					<p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
						SocialSphere
					</p>
					<h1 className="text-3xl font-bold sm:text-4xl">Terms & Conditions</h1>
					<p className="mt-4 max-w-2xl leading-7 text-gray-300">
						Welcome to SocialSphere. By accessing or using this platform, you agree
						to the following terms and conditions. Please read them carefully.
					</p>
				</header>

				<section className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-2xl shadow-black/20 sm:p-8">
					<div className="space-y-7 leading-7 text-gray-300">
						{sections.map((section) => (
							<div key={section.title}>
								<h2 className="mb-2 text-lg font-semibold text-white">
									{section.title}
								</h2>
								<ul className="list-disc space-y-2 pl-5">
									{section.items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							</div>
						))}
					</div>

					<div className="mt-9 border-t border-white/10 pt-6">
						<label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-200">
							<input
								type="checkbox"
								checked={isChecked}
								onChange={(event) => setIsChecked(event.target.checked)}
								className="mt-1 h-5 w-5 shrink-0 accent-[#0c8b96]"
							/>
							<span>
								I confirm that I am 16+ and understand that meeting users offline
								is at my own risk.
							</span>
						</label>
						{error && <p className="mt-4 text-sm text-red-400">{error}</p>}
						<button
							type="button"
							onClick={handleContinue}
							disabled={!isChecked || isSaving}
							className={`mt-6 w-full rounded-full px-6 py-3 font-semibold transition sm:w-auto ${
								isChecked && !isSaving
									? "bg-[#0c8b96] text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-900/30"
									: "cursor-not-allowed bg-white/10 text-gray-500"
							}`}
						>
							{isSaving ? "Saving..." : "I Agree & Continue"}
						</button>
					</div>
				</section>
			</div>
		</main>
	);
}
