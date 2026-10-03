"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = 12;
const PROGRESS_STEPS = Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1);

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

const conversationOptions: Option[] = [
	{ id: "deep-meaningful", label: "Deep & meaningful", icon: "💬" },
	{ id: "casual-chill", label: "Casual & chill", icon: "☕" },
	{ id: "funny-random", label: "Funny & random", icon: "😂" },
	{ id: "intellectual", label: "Intellectual", icon: "🧠" },
	{ id: "career-business", label: "Career / business", icon: "💼" },
	{ id: "hobbies-interests", label: "Hobbies & interests", icon: "🎨" },
	{ id: "mostly-listen", label: "I mostly listen", icon: "👂" },
];

const weekendOptions: Option[] = [
	{ id: "stay-home", label: "Stay at home", icon: "🏠" },
	{ id: "cafe-hopping", label: "Café hopping", icon: "☕" },
	{ id: "explore-city", label: "Explore the city", icon: "🗺️" },
	{ id: "movies", label: "Movies", icon: "🎬" },
	{ id: "sports", label: "Sports", icon: "⚽" },
	{ id: "gaming", label: "Gaming", icon: "🎮" },
	{ id: "party-nightlife", label: "Party / nightlife", icon: "🎉" },
	{ id: "short-trip", label: "Short trip", icon: "🚗" },
	{ id: "study-work", label: "Study / work", icon: "📚" },
	{ id: "food-hunting", label: "Food hunting", icon: "🍽️" },
];

const spontaneityOptions: Option[] = [
	{ id: "plan-everything", label: "I plan everything", icon: "📋" },
	{ id: "mostly-planned", label: "Mostly planned", icon: "🗓️" },
	{ id: "balanced", label: "Balanced", icon: "⚖️" },
	{ id: "usually-spontaneous", label: "Usually spontaneous", icon: "✨" },
	{ id: "very-spontaneous", label: "Very spontaneous", icon: "🚀" },
];

const peopleOptions: Option[] = [
	{ id: "similar-to-me", label: "Similar to me", icon: "🪞" },
	{ id: "opposite-personality", label: "Opposite personality", icon: "🔄" },
	{ id: "calm-people", label: "Calm people", icon: "🌿" },
	{ id: "energetic-people", label: "Energetic people", icon: "⚡" },
	{ id: "funny-people", label: "Funny people", icon: "😄" },
	{ id: "ambitious-people", label: "Ambitious people", icon: "🎯" },
	{ id: "creative-people", label: "Creative people", icon: "🎨" },
	{ id: "open-minded-people", label: "Open-minded people", icon: "🌎" },
	{ id: "doesnt-matter", label: "Doesn't matter", icon: "🤝" },
];

const meetupOptions: Option[] = [
	{ id: "one-to-one", label: "1-on-1", icon: "👤" },
	{ id: "small-group", label: "Small group (3–4)", icon: "👥" },
	{ id: "medium-group", label: "Medium group (5–8)", icon: "👨‍👩‍👧‍👦" },
	{ id: "large-group", label: "Large group", icon: "🌐" },
	{ id: "depends-on-activity", label: "Depends on the activity", icon: "🎯" },
];

const travelOptions: Option[] = [
	{ id: "under-2-km", label: "Under 2 km", icon: "📍" },
	{ id: "2-5-km", label: "2–5 km", icon: "🚶" },
	{ id: "5-10-km", label: "5–10 km", icon: "🚲" },
	{ id: "10-20-km", label: "10–20 km", icon: "🛴" },
	{ id: "anywhere-city", label: "Anywhere in my city", icon: "🏙️" },
	{ id: "anywhere-nearby", label: "Anywhere nearby", icon: "🗺️" },
];

const connectionPriorityOptions: Option[] = [
	{ id: "shared-interests", label: "Shared interests", icon: "⭐" },
	{ id: "personality", label: "Personality", icon: "😊" },
	{ id: "location", label: "Location", icon: "📍" },
	{ id: "availability", label: "Availability", icon: "📅" },
	{ id: "similar-lifestyle", label: "Similar lifestyle", icon: "🏡" },
	{ id: "communication-style", label: "Communication style", icon: "💬" },
	{ id: "common-goals", label: "Common goals", icon: "🚀" },
	{ id: "activity-compatibility", label: "Activity compatibility", icon: "🤝" },
	{ id: "age-range", label: "Age range", icon: "🎂" },
];

export default function PreferenceOnboarding() {
	const router = useRouter();
	const { user } = useAuth();
	const savePreferences = useMutation(api.users.saveUserPreferences);
	const currentUser = useQuery(
		api.users.getByWorkosId,
		user?.id ? { workosId: user.id } : "skip",
	) as { _id: Id<"users">; termsAcceptedAt?: number } | undefined | null;

	const [currentStep, setCurrentStep] = useState<number>(1);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const [intents, setIntents] = useState<string[]>([]);
	const [activities, setActivities] = useState<string[]>([]);
	const [comfortPreference, setComfortPreference] = useState<string>("");
	const [availability, setAvailability] = useState<string[]>([]);
	const [personalityType, setPersonalityType] = useState<string>("ambivert");
	const [conversationPreferences, setConversationPreferences] = useState<string[]>([]);
	const [idealWeekend, setIdealWeekend] = useState<string[]>([]);
	const [spontaneity, setSpontaneity] = useState<string>("");
	const [peoplePreference, setPeoplePreference] = useState<string[]>([]);
	const [meetupPreference, setMeetupPreference] = useState<string>("");
	const [travelDistance, setTravelDistance] = useState<string>("");
	const [connectionPriorities, setConnectionPriorities] = useState<string[]>([]);

	useEffect(() => {
		if (currentUser && !currentUser.termsAcceptedAt) {
			router.replace("/terms");
		}
	}, [currentUser, router]);

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
				return conversationPreferences.length > 0;
			case 6:
				return idealWeekend.length > 0;
			case 7:
				return spontaneity !== "";
			case 8:
				return peoplePreference.length > 0;
			case 9:
				return meetupPreference !== "";
			case 10:
				return travelDistance !== "";
			case 11:
				return connectionPriorities.length > 0;
			case 12:
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
				conversationPreferences,
				idealWeekend,
				spontaneity,
				peoplePreference,
				meetupPreference,
				travelDistance,
				connectionPriorities,
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
							? "bg-[#0c8b96] border border-white/40"
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
					? "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/50 shadow-lg shadow-gray-400/10"
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
							? "bg-[#0c8b96] text-white border border-white/20"
							: "text-gray-400 hover:text-white"
					}`}
				>
					{option.label}
				</button>
			))}
		</div>
	);

	const renderMultiSelectQuestion = (
		title: string,
		subtitle: string,
		options: Option[],
		selected: string[],
		setSelected: React.Dispatch<React.SetStateAction<string[]>>,
	): React.ReactNode => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="mb-2 text-2xl font-bold sm:text-3xl">{title}</h2>
				<p className="text-gray-400">{subtitle}</p>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{options.map((option) =>
					renderChip(option, selected.includes(option.id), () =>
						toggleSelection(option.id, selected, setSelected),
					),
				)}
			</div>
		</div>
	);

	const renderSingleSelectQuestion = (
		title: string,
		subtitle: string,
		options: Option[],
		selected: string,
		setSelected: React.Dispatch<React.SetStateAction<string>>,
	): React.ReactNode => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="mb-2 text-2xl font-bold sm:text-3xl">{title}</h2>
				<p className="text-gray-400">{subtitle}</p>
			</div>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{options.map((option) =>
					renderChip(option, selected === option.id, () =>
						setSelected(option.id),
					),
				)}
			</div>
		</div>
	);

	const renderSummarySection = (
		label: string,
		values: string[],
		options: Option[],
		className: string,
	): React.ReactNode => (
		<div className="p-4 border rounded-2xl bg-white/5 border-white/10">
			<p className="mb-2 text-sm text-gray-400">{label}</p>
			<div className="flex flex-wrap gap-2">
				{values.map((id) => {
					const option = options.find((item) => item.id === id);
					return (
						<span
							key={id}
							className={`px-3 py-1 text-sm rounded-full ${className}`}
						>
							{option?.icon} {option?.label}
						</span>
					);
				})}
			</div>
		</div>
	);

	const renderStep = (): React.ReactNode => {
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-6">
						<div className="text-center">
							<h2 className="mb-2 text-2xl font-bold sm:text-3xl">
								What are you here for?
							</h2>
							<p className="text-gray-400">Select all that apply</p>
						</div>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
							<h2 className="mb-2 text-2xl font-bold sm:text-3xl">
								What kind of activities do you enjoy?
							</h2>
							<p className="text-gray-400">Select all that interest you</p>
						</div>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
							<h2 className="mb-2 text-2xl font-bold sm:text-3xl">
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
							<h2 className="mb-2 text-2xl font-bold sm:text-3xl">
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
				return renderMultiSelectQuestion(
					"What kind of conversations do you enjoy?",
					"Select all that sound like you",
					conversationOptions,
					conversationPreferences,
					setConversationPreferences,
				);

			case 6:
				return renderMultiSelectQuestion(
					"What's your ideal weekend?",
					"Pick the moments you enjoy most",
					weekendOptions,
					idealWeekend,
					setIdealWeekend,
				);

			case 7:
				return renderSingleSelectQuestion(
					"How spontaneous are you?",
					"Choose the option that fits you best",
					spontaneityOptions,
					spontaneity,
					setSpontaneity,
				);

			case 8:
				return renderMultiSelectQuestion(
					"What kind of people do you connect with best?",
					"Select all that feel like a good fit",
					peopleOptions,
					peoplePreference,
					setPeoplePreference,
				);

			case 9:
				return renderSingleSelectQuestion(
					"What's your preferred meetup vibe?",
					"Choose your usual comfort zone",
					meetupOptions,
					meetupPreference,
					setMeetupPreference,
				);

			case 10:
				return renderSingleSelectQuestion(
					"How far would you travel to meet someone?",
					"Choose the distance that feels comfortable",
					travelOptions,
					travelDistance,
					setTravelDistance,
				);

			case 11:
				return renderMultiSelectQuestion(
					"What matters most when choosing a connection?",
					"Select all that matter to you",
					connectionPriorityOptions,
					connectionPriorities,
					setConnectionPriorities,
				);

			case 12:
				return (
					<div className="space-y-8">
						<div className="text-center">
							<h2 className="mb-2 text-2xl font-bold sm:text-3xl">
								You&apos;re all set!
							</h2>
							<p className="text-gray-400">
								Here&apos;s a summary of your preferences
							</p>
						</div>
						<div className="space-y-4">
							<div className="p-4 border rounded-2xl bg-white/5 border-white/10">
								<p className="mb-2 text-sm text-gray-400">Looking for</p>
								<div className="flex flex-wrap gap-2">
									{intents.map((id) => {
										const option = intentOptions.find((o) => o.id === id);
										return (
											<span
												key={id}
												className="px-3 py-1 text-sm text-purple-300 rounded-full bg-purple-500/20"
											>
												{option?.icon} {option?.label}
											</span>
										);
									})}
								</div>
							</div>
							{renderSummarySection(
								"Conversation preferences",
								conversationPreferences,
								conversationOptions,
								"bg-purple-500/20 text-purple-300",
							)}
							{renderSummarySection(
								"Ideal weekend",
								idealWeekend,
								weekendOptions,
								"bg-cyan-500/20 text-cyan-300",
							)}
							{renderSummarySection(
								"People you connect with",
								peoplePreference,
								peopleOptions,
								"bg-pink-500/20 text-pink-300",
							)}
							{renderSummarySection(
								"Connection priorities",
								connectionPriorities,
								connectionPriorityOptions,
								"bg-blue-500/20 text-blue-300",
							)}
							<div className="p-4 border rounded-2xl bg-white/5 border-white/10">
								<p className="mb-2 text-sm text-gray-400">Matching preferences</p>
								<div className="flex flex-wrap gap-2">
									{([
										["Spontaneity", spontaneity, spontaneityOptions],
										["Meetup vibe", meetupPreference, meetupOptions],
										["Travel distance", travelDistance, travelOptions],
									] as Array<[string, string, Option[]]>).map(
										([label, value, options]) => {
										const option = (options as Option[]).find(
											(item) => item.id === value,
										);
										return (
											<span
												key={label}
												className="px-3 py-1 text-sm text-white capitalize rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20"
											>
												{label}: {option?.icon} {option?.label}
											</span>
										);
										},
									)}
								</div>
							</div>
							<div className="p-4 border rounded-2xl bg-white/5 border-white/10">
								<p className="mb-2 text-sm text-gray-400">Activities</p>
								<div className="flex flex-wrap gap-2">
									{activities.map((id) => {
										const option = activityOptions.find((o) => o.id === id);
										return (
											<span
												key={id}
												className="px-3 py-1 text-sm rounded-full bg-cyan-500/20 text-cyan-300"
											>
												{option?.icon} {option?.label}
											</span>
										);
									})}
								</div>
							</div>
							<div className="p-4 border rounded-2xl bg-white/5 border-white/10">
								<p className="mb-2 text-sm text-gray-400">Connection style</p>
								<span className="px-3 py-1 text-sm text-pink-300 rounded-full bg-pink-500/20">
									{comfortOptions.find((o) => o.id === comfortPreference)?.icon}{" "}
									{
										comfortOptions.find((o) => o.id === comfortPreference)
											?.label
									}
								</span>
							</div>
							<div className="p-4 border rounded-2xl bg-white/5 border-white/10">
								<p className="mb-2 text-sm text-gray-400">
									Availability & Personality
								</p>
								<div className="flex flex-wrap gap-2">
									{availability.map((id) => {
										const option = availabilityOptions.find((o) => o.id === id);
										return (
											<span
												key={id}
												className="px-3 py-1 text-sm text-blue-300 rounded-full bg-blue-500/20"
											>
												{option?.icon} {option?.label}
											</span>
										);
									})}
									<span className="px-3 py-1 text-sm text-white capitalize rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20">
										{personalityType}
									</span>
								</div>
							</div>
						</div>
						{error && (
							<div className="p-4 text-center text-red-400 border rounded-2xl bg-red-500/10 border-red-500/20">
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
		<div className="min-h-screen text-white bg-transparent">
			<div className="max-w-2xl px-4 py-8 mx-auto">
				<header className="mb-8">
					<div className="flex items-center justify-between mb-6">
						<span className="text-xl font-bold text-[#0c8b96]">
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

				<footer className="flex items-center justify-between gap-4 pt-8 mt-8 border-t rounded-none glass-solid border-white/10">
					{currentStep > 1 ? (
						<button
							type="button"
							onClick={handleBack}
							className="px-6 py-3 font-medium text-white transition-all border rounded-full border-white/20 hover:bg-white/5"
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
									? "bg-[#0c8b96] text-white border border-white/20 hover:shadow-lg hover:shadow-gray-400/25 hover:scale-105"
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
							className="px-8 py-3 rounded-full bg-[#0c8b96] text-white border border-white/20 font-medium hover:shadow-lg hover:shadow-gray-400/25 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Saving..." : "Finish & Continue"}
						</button>
					)}
				</footer>
			</div>
		</div>
	);
}
