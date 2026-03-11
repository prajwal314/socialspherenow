"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = 5;
const PROGRESS_STEPS = [1, 2, 3, 4, 5] as const;

interface Option {
	id: string;
	label: string;
	icon?: string;
}

interface PersonalityOption {
	id: string;
	label: string;
}

const intentOptions: Option[] = [
	{ id: "activities", label: "Activities & Hangouts", icon: "🎯" },
	{ id: "friends", label: "Making Friends", icon: "👋" },
	{ id: "communities", label: "Joining Communities", icon: "👥" },
	{ id: "events", label: "Events", icon: "🎉" },
	{ id: "travel", label: "Travel Partners", icon: "✈️" },
	{ id: "business", label: "Business Connections", icon: "💼" },
];

const activityOptions: Option[] = [
	{ id: "coffee", label: "Coffee", icon: "☕" },
	{ id: "movies", label: "Movies", icon: "🎬" },
	{ id: "dinner", label: "Dinner", icon: "🍽️" },
	{ id: "study", label: "Study", icon: "📚" },
	{ id: "work", label: "Work sessions", icon: "💻" },
	{ id: "hangout", label: "Casual hangout", icon: "🛋️" },
	{ id: "walks", label: "Walks / Drives", icon: "🚶" },
];

const comfortOptions: Option[] = [
	{ id: "one-to-one", label: "I prefer 1-to-1", icon: "👤" },
	{ id: "small-groups", label: "I'm okay with small groups", icon: "👥" },
	{ id: "communities-first", label: "I like communities first", icon: "🌐" },
	{ id: "take-time", label: "I take time to open up", icon: "🐢" },
];

const availabilityOptions: Option[] = [
	{ id: "morning", label: "Morning", icon: "🌅" },
	{ id: "evening", label: "Evening", icon: "🌆" },
	{ id: "night", label: "Night", icon: "🌙" },
	{ id: "weekends", label: "Weekends", icon: "📅" },
];

const personalityOptions: PersonalityOption[] = [
	{ id: "introvert", label: "Introvert" },
	{ id: "ambivert", label: "Ambivert" },
	{ id: "extrovert", label: "Extrovert" },
];

export default function PreferenceOnboarding() {
	const router = useRouter();
	const { user } = useAuth();
	const savePreferences = useMutation(api.users.saveUserPreferences);

	const [currentStep, setCurrentStep] = useState<number>(1);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const [intents, setIntents] = useState<string[]>([]);
	const [activities, setActivities] = useState<string[]>([]);
	const [comfortPreference, setComfortPreference] = useState<string>("");
	const [availability, setAvailability] = useState<string[]>([]);
	const [personalityType, setPersonalityType] = useState<string>("ambivert");

	const toggleSelection = (
		value: string,
		list: string[],
		setList: React.Dispatch<React.SetStateAction<string[]>>,
	): void => {
		if (list.includes(value)) {
			setList(list.filter((item) => item !== value));
		} else {
			setList([...list, value]);
		}
	};

	const canProceed = (): boolean => {
		switch (currentStep) {
			case 1:
				return intents.length > 0;
			case 2:
				return activities.length > 0;
			case 3:
				return comfortPreference !== "";
			case 4:
				return availability.length > 0 && personalityType !== "";
			case 5:
				return true;
			default:
				return false;
		}
	};

	const handleNext = (): void => {
		if (currentStep < TOTAL_STEPS) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handleBack = (): void => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleFinish = async (): Promise<void> => {
		if (!user?.id) return;

		setIsLoading(true);
		setError(null);

		try {
			await savePreferences({
				workosId: user.id,
				intents,
				activities,
				comfortPreference,
				availability,
				personalityType,
			});
			router.push("/home");
		} catch (err) {
			console.error("Failed to save preferences:", err);
			setError("Something went wrong. Please try again.");
			setIsLoading(false);
		}
	};

	const renderProgressBar = (): React.ReactNode => (
		<div className="flex items-center gap-2">
			{PROGRESS_STEPS.map((step) => (
				<div
					key={`progress-step-${step}`}
					className={`h-2 flex-1 rounded-full transition-all duration-300 ${
						step <= currentStep
							? "bg-gradient-to-r from-purple-500 to-cyan-500"
							: "bg-white/10"
					}`}
				/>
			))}
		</div>
	);

	const renderChip = (
		option: Option,
		isSelected: boolean,
		onClick: () => void,
	): React.ReactNode => (
		<button
			type="button"
			key={option.id}
			onClick={onClick}
			className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all duration-200 ${
				isSelected
					? "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/50 shadow-lg shadow-purple-500/10"
					: "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
			}`}
		>
			{option.icon && <span className="text-2xl">{option.icon}</span>}
			<span className="font-medium">{option.label}</span>
			{isSelected && <span className="ml-auto text-purple-400">✓</span>}
		</button>
	);

	const renderPersonalitySlider = (): React.ReactNode => (
		<div className="flex items-center justify-center gap-2 p-2 bg-white/5 rounded-2xl">
			{personalityOptions.map((option) => (
				<button
					type="button"
					key={option.id}
					onClick={() => setPersonalityType(option.id)}
					className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
						personalityType === option.id
							? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
							: "text-gray-400 hover:text-white"
					}`}
				>
					{option.label}
				</button>
			))}
		</div>
	);

	const renderStep = (): React.ReactNode => {
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-6">
						<div className="text-center">
							<h2 className="text-2xl sm:text-3xl font-bold mb-2">
								What are you here for?
							</h2>
							<p className="text-gray-400">Select all that apply</p>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{intentOptions.map((option) =>
								renderChip(option, intents.includes(option.id), () =>
									toggleSelection(option.id, intents, setIntents),
								),
							)}
						</div>
					</div>
				);

			case 2:
				return (
					<div className="space-y-6">
						<div className="text-center">
							<h2 className="text-2xl sm:text-3xl font-bold mb-2">
								What kind of activities do you enjoy?
							</h2>
							<p className="text-gray-400">Select all that interest you</p>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{activityOptions.map((option) =>
								renderChip(option, activities.includes(option.id), () =>
									toggleSelection(option.id, activities, setActivities),
								),
							)}
						</div>
					</div>
				);

			case 3:
				return (
					<div className="space-y-6">
						<div className="text-center">
							<h2 className="text-2xl sm:text-3xl font-bold mb-2">
								How do you prefer to connect?
							</h2>
							<p className="text-gray-400">Choose the one that fits you best</p>
						</div>
						<div className="grid grid-cols-1 gap-3">
							{comfortOptions.map((option) =>
								renderChip(option, comfortPreference === option.id, () =>
									setComfortPreference(option.id),
								),
							)}
						</div>
					</div>
				);

			case 4:
				return (
					<div className="space-y-8">
						<div className="text-center">
							<h2 className="text-2xl sm:text-3xl font-bold mb-2">
								When are you mostly active?
							</h2>
							<p className="text-gray-400">Select your preferred times</p>
						</div>
						<div className="grid grid-cols-2 gap-3">
							{availabilityOptions.map((option) =>
								renderChip(option, availability.includes(option.id), () =>
									toggleSelection(option.id, availability, setAvailability),
								),
							)}
						</div>
						<div className="space-y-4">
							<p className="text-center text-gray-400">
								How would you describe yourself?
							</p>
							{renderPersonalitySlider()}
						</div>
					</div>
				);

			case 5:
				return (
					<div className="space-y-8">
						<div className="text-center">
							<h2 className="text-2xl sm:text-3xl font-bold mb-2">
								You&apos;re all set!
							</h2>
							<p className="text-gray-400">
								Here&apos;s a summary of your preferences
							</p>
						</div>
						<div className="space-y-4">
							<div className="p-4 rounded-2xl bg-white/5 border border-white/10">
								<p className="text-sm text-gray-400 mb-2">Looking for</p>
								<div className="flex flex-wrap gap-2">
									{intents.map((id) => {
										const option = intentOptions.find((o) => o.id === id);
										return (
											<span
												key={id}
												className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm"
											>
												{option?.icon} {option?.label}
											</span>
										);
									})}
								</div>
							</div>
							<div className="p-4 rounded-2xl bg-white/5 border border-white/10">
								<p className="text-sm text-gray-400 mb-2">Activities</p>
								<div className="flex flex-wrap gap-2">
									{activities.map((id) => {
										const option = activityOptions.find((o) => o.id === id);
										return (
											<span
												key={id}
												className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-sm"
											>
												{option?.icon} {option?.label}
											</span>
										);
									})}
								</div>
							</div>
							<div className="p-4 rounded-2xl bg-white/5 border border-white/10">
								<p className="text-sm text-gray-400 mb-2">Connection style</p>
								<span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-sm">
									{comfortOptions.find((o) => o.id === comfortPreference)?.icon}{" "}
									{
										comfortOptions.find((o) => o.id === comfortPreference)
											?.label
									}
								</span>
							</div>
							<div className="p-4 rounded-2xl bg-white/5 border border-white/10">
								<p className="text-sm text-gray-400 mb-2">
									Availability & Personality
								</p>
								<div className="flex flex-wrap gap-2">
									{availability.map((id) => {
										const option = availabilityOptions.find((o) => o.id === id);
										return (
											<span
												key={id}
												className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm"
											>
												{option?.icon} {option?.label}
											</span>
										);
									})}
									<span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-white text-sm capitalize">
										{personalityType}
									</span>
								</div>
							</div>
						</div>
						{error && (
							<div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
								{error}
							</div>
						)}
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-[#161621] text-white">
			<div className="max-w-2xl mx-auto px-4 py-8">
				<header className="mb-8">
					<div className="flex items-center justify-between mb-6">
						<span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
							SocialSphere
						</span>
						<span className="text-sm text-gray-400">
							Step {currentStep} of {TOTAL_STEPS}
						</span>
					</div>
					{renderProgressBar()}
				</header>

				<main className="min-h-[60vh] flex flex-col justify-center">
					{renderStep()}
				</main>

				<footer className="flex items-center justify-between gap-4 mt-8 pt-8 border-t border-white/10">
					{currentStep > 1 ? (
						<button
							type="button"
							onClick={handleBack}
							className="px-6 py-3 rounded-full border border-white/20 text-white font-medium hover:bg-white/5 transition-all"
						>
							Back
						</button>
					) : (
						<div />
					)}

					{currentStep < TOTAL_STEPS ? (
						<button
							type="button"
							onClick={handleNext}
							disabled={!canProceed()}
							className={`px-8 py-3 rounded-full font-medium transition-all duration-200 ${
								canProceed()
									? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105"
									: "bg-white/10 text-gray-500 cursor-not-allowed"
							}`}
						>
							Next
						</button>
					) : (
						<button
							type="button"
							onClick={handleFinish}
							disabled={isLoading}
							className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Saving..." : "Finish & Continue"}
						</button>
					)}
				</footer>
			</div>
		</div>
	);
}
