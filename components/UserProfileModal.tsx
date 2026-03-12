"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Labels for activities and intents
const activityLabels: Record<string, { label: string; icon: string }> = {
	roommate: { label: "Roommate", icon: "🏠" },
	travel_mate: { label: "Travel Mate", icon: "✈️" },
	date: { label: "Date", icon: "💕" },
	turf_partner: { label: "Turf Partner", icon: "⚽" },
	dinner_partner: { label: "Dinner Partner", icon: "🍽️" },
	cofounder: { label: "Cofounder", icon: "🚀" },
	study_partner: { label: "Study Partner", icon: "📚" },
	work_partner: { label: "Work Partner", icon: "💻" },
	coffee_buddy: { label: "Coffee Buddy", icon: "☕" },
	movie_buddy: { label: "Movie Buddy", icon: "🎬" },
	gym_partner: { label: "Gym Partner", icon: "💪" },
	gaming_buddy: { label: "Gaming Buddy", icon: "🎮" },
};

const intentLabels: Record<string, { label: string; icon: string }> = {
	friendship: { label: "Friendship", icon: "🤝" },
	dating: { label: "Dating", icon: "💕" },
	networking: { label: "Networking", icon: "💼" },
	activities: { label: "Activities", icon: "🎯" },
	study: { label: "Study", icon: "📚" },
	travel: { label: "Travel", icon: "✈️" },
};

const availabilityLabels: Record<string, { label: string; icon: string }> = {
	morning: { label: "Morning", icon: "🌅" },
	afternoon: { label: "Afternoon", icon: "☀️" },
	evening: { label: "Evening", icon: "🌆" },
	night: { label: "Night", icon: "🌙" },
	weekends: { label: "Weekends", icon: "📅" },
	flexible: { label: "Flexible", icon: "✨" },
};

const personalityLabels: Record<
	string,
	{ label: string; icon: string; description: string }
> = {
	introvert: {
		label: "Introvert",
		icon: "🌙",
		description: "Prefers quiet, meaningful connections",
	},
	extrovert: {
		label: "Extrovert",
		icon: "☀️",
		description: "Energized by social interactions",
	},
	ambivert: {
		label: "Ambivert",
		icon: "🌗",
		description: "Best of both worlds",
	},
};

interface UserProfileModalProps {
	targetUserId: string | null;
	currentUserId: string | null;
	onClose: () => void;
}

interface UserProfile {
	firstName?: string;
	lastName?: string;
	profileImageUrl?: string;
	personalityType?: string;
	isConnected?: boolean;
	stats?: {
		connections: number;
		eventsCreated: number;
		communitiesJoined: number;
	};
	intents?: string[];
	activities?: string[];
	availability?: string[];
	comfortPreference?: string;
	memberSince?: number;
}

export default function UserProfileModal({
	targetUserId,
	currentUserId,
	onClose,
}: UserProfileModalProps) {
	const profile = useQuery(
		api.users.getUserProfile,
		targetUserId && currentUserId ? { targetUserId, currentUserId } : "skip",
	) as UserProfile | undefined | null;

	const formatDate = (timestamp: number): string => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	};

	if (!targetUserId) return null;

	return (
		<>
			<button
				type="button"
				aria-label="Close user profile modal"
				className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="fixed inset-0 z-[51] overflow-y-auto">
				<div className="min-h-full flex items-center justify-center p-4 py-8">
					<div className="w-full max-w-md rounded-3xl bg-[#1e1e2e] border border-white/10 shadow-2xl">
						{profile === undefined ? (
							<div className="p-12 flex items-center justify-center">
								<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
							</div>
						) : profile === null ? (
							<div className="p-8 text-center">
								<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
									<svg
										className="w-8 h-8 text-red-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</div>
								<h3 className="text-lg font-semibold text-white mb-2">
									User Not Found
								</h3>
								<p className="text-gray-400 text-sm">
									This user profile is not available.
								</p>
								<button
									type="button"
									onClick={onClose}
									className="mt-4 px-6 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
								>
									Close
								</button>
							</div>
						) : (
							<>
								{/* Header with close button */}
								<div className="relative">
									{/* Gradient background */}
									<div className="h-24 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-t-3xl" />

									{/* Close button */}
									<button
										type="button"
										onClick={onClose}
										className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
									>
										<svg
											className="w-5 h-5 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>

									{/* Profile Image */}
									<div className="absolute left-1/2 -translate-x-1/2 -bottom-12">
										<div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 p-1">
											<div className="w-full h-full rounded-full bg-[#1e1e2e] flex items-center justify-center overflow-hidden">
												{profile.profileImageUrl ? (
													<img
														src={profile.profileImageUrl}
														alt={profile.firstName || "User"}
														className="w-full h-full object-cover"
													/>
												) : (
													<span className="text-3xl font-bold text-white">
														{profile.firstName?.charAt(0)?.toUpperCase() || "?"}
													</span>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Profile Content */}
								<div className="pt-16 pb-6 px-6">
									{/* Name and connection status */}
									<div className="text-center mb-6">
										<h2 className="text-2xl font-bold text-white">
											{profile.firstName}
											{profile.isConnected &&
												profile.lastName &&
												` ${profile.lastName}`}
										</h2>

										{profile.personalityType && (
											<div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-sm">
												<span>
													{personalityLabels[profile.personalityType]?.icon ||
														"🌟"}
												</span>
												<span className="capitalize">
													{profile.personalityType}
												</span>
											</div>
										)}

										{profile.isConnected && (
											<div className="mt-2 flex items-center justify-center gap-1.5 text-green-400 text-sm">
												<svg
													className="w-4 h-4"
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
												Connected
											</div>
										)}
									</div>

									{/* Stats */}
									{profile.stats && (
										<div className="flex items-center justify-center gap-6 mb-6">
											<div className="text-center">
												<p className="text-2xl font-bold text-white">
													{profile.stats.connections}
												</p>
												<p className="text-xs text-gray-500">Connections</p>
											</div>
											{profile.isConnected && (
												<>
													<div className="w-px h-8 bg-white/10" />
													<div className="text-center">
														<p className="text-2xl font-bold text-white">
															{profile.stats.eventsCreated}
														</p>
														<p className="text-xs text-gray-500">Events</p>
													</div>
													<div className="w-px h-8 bg-white/10" />
													<div className="text-center">
														<p className="text-2xl font-bold text-white">
															{profile.stats.communitiesJoined}
														</p>
														<p className="text-xs text-gray-500">Communities</p>
													</div>
												</>
											)}
										</div>
									)}

									{/* Connected users see more details */}
									{profile.isConnected && (
										<div className="space-y-4">
											{/* Looking For / Intents */}
											{profile.intents && profile.intents.length > 0 && (
												<div className="p-4 rounded-xl bg-white/5">
													<h4 className="text-sm font-medium text-gray-400 mb-3">
														Looking for
													</h4>
													<div className="flex flex-wrap gap-2">
														{profile.intents.map((intent) => {
															const info = intentLabels[intent] || {
																label: intent,
																icon: "🎯",
															};
															return (
																<span
																	key={intent}
																	className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 text-sm"
																>
																	<span>{info.icon}</span>
																	<span className="capitalize">
																		{info.label}
																	</span>
																</span>
															);
														})}
													</div>
												</div>
											)}

											{/* Activities */}
											{profile.activities && profile.activities.length > 0 && (
												<div className="p-4 rounded-xl bg-white/5">
													<h4 className="text-sm font-medium text-gray-400 mb-3">
														Interested in
													</h4>
													<div className="flex flex-wrap gap-2">
														{profile.activities.map((activity) => {
															const info = activityLabels[activity] || {
																label: activity,
																icon: "🎯",
															};
															return (
																<span
																	key={activity}
																	className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-300 text-sm"
																>
																	<span>{info.icon}</span>
																	<span className="capitalize">
																		{info.label}
																	</span>
																</span>
															);
														})}
													</div>
												</div>
											)}

											{/* Availability */}
											{profile.availability &&
												profile.availability.length > 0 && (
													<div className="p-4 rounded-xl bg-white/5">
														<h4 className="text-sm font-medium text-gray-400 mb-3">
															Usually available
														</h4>
														<div className="flex flex-wrap gap-2">
															{profile.availability.map((time) => {
																const info = availabilityLabels[time] || {
																	label: time,
																	icon: "📅",
																};
																return (
																	<span
																		key={time}
																		className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm"
																	>
																		<span>{info.icon}</span>
																		<span className="capitalize">
																			{info.label}
																		</span>
																	</span>
																);
															})}
														</div>
													</div>
												)}

											{/* Comfort preference */}
											{profile.comfortPreference && (
												<div className="p-4 rounded-xl bg-white/5">
													<h4 className="text-sm font-medium text-gray-400 mb-2">
														Comfort preference
													</h4>
													<p className="text-white capitalize">
														{profile.comfortPreference === "one-on-one" &&
															"1-on-1 meetings"}
														{profile.comfortPreference === "small-group" &&
															"Small groups (2-4)"}
														{profile.comfortPreference === "any-size" &&
															"Any group size"}
														{![
															"one-on-one",
															"small-group",
															"any-size",
														].includes(profile.comfortPreference) &&
															profile.comfortPreference.replace(/-/g, " ")}
													</p>
												</div>
											)}

											{/* Member since */}
											{profile.memberSince && (
												<div className="text-center pt-4 border-t border-white/5">
													<p className="text-sm text-gray-500">
														Member since {formatDate(profile.memberSince)}
													</p>
												</div>
											)}
										</div>
									)}

									{/* Non-connected users see limited info */}
									{!profile.isConnected && (
										<div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
											<div className="w-10 h-10 mx-auto mb-3 rounded-full bg-yellow-500/20 flex items-center justify-center">
												<svg
													className="w-5 h-5 text-yellow-400"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6a4 4 0 11-8 0 4 4 0 018 0z"
													/>
												</svg>
											</div>
											<p className="text-yellow-300 text-sm font-medium mb-1">
												Limited Profile
											</p>
											<p className="text-yellow-400/70 text-xs">
												Connect with {profile.firstName} to see their full
												profile
											</p>
										</div>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
