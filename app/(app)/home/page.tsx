"use client";

import { useMutation, useQuery } from "convex/react";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import CommunityDetailModal from "@/components/CommunityDetailModal";
import CreateCommunityModal from "@/components/CreateCommunityModal";
import Navbar from "@/components/Navbar";
import UserProfileModal from "@/components/UserProfileModal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

// Activity type labels for partner search
const partnerActivityLabels: Record<string, { label: string; icon: string }> = {
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

interface EventForm {
	activity: string;
	title: string;
	description: string;
	date: string;
	time: string;
	peopleNeeded: string;
}

interface ActiveSearch {
	_id: Id<"activitySearches">;
	userId: string;
	userName?: string;
	activityType: string;
	peopleNeeded?: number;
	spotsLeft?: number;
	peopleJoined?: number;
	preferences?: Record<string, unknown>;
	userDetails?: {
		profileImageUrl?: string;
		personalityType?: string;
	};
}

interface PendingRequest {
	_id: Id<"requests">;
	senderId: string;
	senderName?: string;
	intent?: string;
	activity?: string;
}

interface SentRequest {
	_id: Id<"requests">;
	receiverId: string;
	status: string;
}

interface LiveEvent {
	_id: Id<"events">;
	title: string;
	description?: string;
	activity: string;
	dateTime: number;
	imageUrl?: string;
	creatorId: string;
	creatorName?: string;
	peopleNeeded?: number;
	spotsLeft?: number | null;
	goingCount?: number;
}

interface Community {
	_id: Id<"communities">;
	name: string;
	description: string;
	memberCount: number;
	imageUrl?: string;
}

interface EventDetails {
	_id: Id<"events">;
	title: string;
	description?: string;
	activity: string;
	dateTime: number;
	imageUrl?: string;
	creatorId: string;
	creatorName?: string;
	peopleNeeded?: number;
	spotsLeft?: number;
	goingCount?: number;
	attendeeCount?: number;
	creator?: {
		profileImageUrl?: string;
	};
	attendees?: Array<{
		userName?: string;
	}>;
}

interface CurrentUser {
	_id: Id<"users">;
	firstName?: string;
}

export default function Home() {
	const { user } = useAuth();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
	const [viewingCommunityId, setViewingCommunityId] =
		useState<Id<"communities"> | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<Id<"events"> | null>(null);
	const [isJoining, setIsJoining] = useState(false);
	const [connectingTo, setConnectingTo] =
		useState<Id<"activitySearches"> | null>(null);
	const [viewingProfileUserId, setViewingProfileUserId] =
		useState<Id<"users"> | null>(null);
	const eventImageInputRef = useRef<HTMLInputElement>(null);
	const [eventImageFile, setEventImageFile] = useState<File | null>(null);
	const [eventImagePreview, setEventImagePreview] = useState<string | null>(
		null,
	);

	// Form state for create event
	const [eventForm, setEventForm] = useState<EventForm>({
		activity: "",
		title: "",
		description: "",
		date: "",
		time: "",
		peopleNeeded: "",
	});

	// Queries
	const currentUser = useQuery(
		api.users.getByWorkosId,
		user?.id ? { workosId: user.id } : "skip",
	) as CurrentUser | undefined | null;

	// Get ALL live events (excluding user's own)
	const liveEvents = useQuery(
		api.events.getAllLiveEventsExcludingUser,
		user?.id ? { userId: user.id } : "skip",
	) as LiveEvent[] | undefined | null;

	// Get all active partner searches (excluding user's own)
	const activeSearches = useQuery(
		api.activitySearches.getAllActiveSearches,
		user?.id ? { excludeUserId: user.id } : "skip",
	) as ActiveSearch[] | undefined | null;

	const pendingRequests = useQuery(
		api.requests.getPendingRequests,
		user?.id ? { receiverId: user.id } : "skip",
	) as PendingRequest[] | undefined | null;

	// Get user's sent requests to know who they already connected with
	const sentRequests = useQuery(
		api.requests.getSentRequests,
		user?.id ? { senderId: user.id } : "skip",
	) as SentRequest[] | undefined | null;

	// Get all communities created by other users
	const communities = useQuery(
		api.communities.getCommunitiesByOthers,
		user?.id ? { excludeUserId: user.id } : "skip",
	) as Community[] | undefined | null;

	const userCommunityIds = useQuery(
		api.communities.getUserCommunityIds,
		user?.id ? { userId: user.id } : "skip",
	) as Id<"communities">[] | undefined | null;

	// Mutations
	const acceptRequest = useMutation(api.requests.acceptRequest);
	const declineRequest = useMutation(api.requests.declineRequest);
	const createRequest = useMutation(api.requests.createRequest);
	const createEvent = useMutation(api.events.createEvent);
	const joinCommunity = useMutation(api.communities.joinCommunity);
	const joinEvent = useMutation(api.events.joinEvent);
	const leaveEvent = useMutation(api.events.leaveEvent);
	const getOrCreateCommunityChat = useMutation(
		api.chats.getOrCreateCommunityChat,
	);
	const generateUploadUrl = useMutation(api.files.generateUploadUrl);

	// Query for selected event details
	const eventDetails = useQuery(
		api.events.getEventWithDetails,
		selectedEvent ? { eventId: selectedEvent } : "skip",
	) as EventDetails | undefined | null;

	const userEventAttendance = useQuery(
		api.events.isUserAttending,
		selectedEvent && user?.id
			? { eventId: selectedEvent, userId: user.id }
			: "skip",
	) as boolean | undefined | null;

	const getGreeting = (): string => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 18) return "Good afternoon";
		return "Good evening";
	};

	const formatDateTime = (timestamp: number): string => {
		const date = new Date(timestamp);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	const handleAcceptRequest = async (requestId: Id<"requests">) => {
		try {
			await acceptRequest({ requestId });
		} catch (error) {
			console.error("Failed to accept request:", error);
		}
	};

	const handleDeclineRequest = async (requestId: Id<"requests">) => {
		try {
			await declineRequest({ requestId });
		} catch (error) {
			console.error("Failed to decline request:", error);
		}
	};

	const handleJoinCommunity = async (communityId: Id<"communities">) => {
		if (!user?.id) return;
		try {
			await joinCommunity({ userId: user.id, communityId });
			// Create or get community chat when joining
			await getOrCreateCommunityChat({ communityId });
		} catch (error) {
			console.error("Failed to join community:", error);
		}
	};

	const handleViewEvent = (eventId: Id<"events">) => {
		setSelectedEvent(eventId);
	};

	const handleJoinEvent = async (status: "going" | "interested" = "going") => {
		if (!user?.id || !currentUser || !selectedEvent) return;
		setIsJoining(true);
		try {
			await joinEvent({
				eventId: selectedEvent,
				userId: user.id,
				userName: currentUser.firstName || "Anonymous",
				status,
			});
		} catch (error) {
			console.error("Failed to join event:", error);
		} finally {
			setIsJoining(false);
		}
	};

	const handleLeaveEvent = async () => {
		if (!user?.id || !selectedEvent) return;
		setIsJoining(true);
		try {
			await leaveEvent({
				eventId: selectedEvent,
				userId: user.id,
			});
		} catch (error) {
			console.error("Failed to leave event:", error);
		} finally {
			setIsJoining(false);
		}
	};

	const handleConnectWithUser = async (search: ActiveSearch) => {
		if (!user?.id || !currentUser) return;
		setConnectingTo(search._id);
		try {
			await createRequest({
				senderId: user.id,
				senderName: currentUser.firstName || "Anonymous",
				receiverId: search.userId,
				activitySearchId: search._id,
				activity: search.activityType,
				intent:
					partnerActivityLabels[search.activityType]?.label ||
					search.activityType,
			});
		} catch (error) {
			console.error("Failed to send connection request:", error);
		} finally {
			setConnectingTo(null);
		}
	};

	// Check if user has already sent a request to this person
	const hasAlreadySentRequest = (userId: string): boolean => {
		if (!sentRequests) return false;
		return sentRequests.some(
			(req) => req.receiverId === userId && req.status === "pending",
		);
	};

	// Handle event image selection
	const handleEventImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			console.error("Please select an image file");
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			console.error("Image must be less than 5MB");
			return;
		}

		setEventImageFile(file);
		// Create preview URL
		const previewUrl = URL.createObjectURL(file);
		setEventImagePreview(previewUrl);
	};

	// Remove event image
	const handleRemoveEventImage = () => {
		setEventImageFile(null);
		if (eventImagePreview) {
			URL.revokeObjectURL(eventImagePreview);
			setEventImagePreview(null);
		}
		if (eventImageInputRef.current) {
			eventImageInputRef.current.value = "";
		}
	};

	const handleCreateEvent = async (e: FormEvent) => {
		e.preventDefault();
		if (!user?.id || !currentUser) return;

		setIsCreating(true);
		try {
			let imageId: Id<"_storage"> | undefined;

			// Upload image if selected
			if (eventImageFile) {
				const uploadUrl = await generateUploadUrl();
				const result = await fetch(uploadUrl, {
					method: "POST",
					headers: { "Content-Type": eventImageFile.type },
					body: eventImageFile,
				});
				const { storageId } = await result.json();
				imageId = storageId;
			}

			const dateTime = new Date(
				`${eventForm.date}T${eventForm.time}`,
			).getTime();
			const peopleNeeded = eventForm.peopleNeeded
				? parseInt(eventForm.peopleNeeded, 10)
				: undefined;

			await createEvent({
				creatorId: user.id,
				creatorName: currentUser.firstName || "Anonymous",
				activity: eventForm.activity,
				title: eventForm.title,
				description: eventForm.description || undefined,
				imageId,
				peopleNeeded,
				dateTime,
			});
			setIsModalOpen(false);
			setEventForm({
				activity: "",
				title: "",
				description: "",
				date: "",
				time: "",
				peopleNeeded: "",
			});
			handleRemoveEventImage();
		} catch (error) {
			console.error("Failed to create event:", error);
		} finally {
			setIsCreating(false);
		}
	};

	const isFormValid =
		eventForm.activity && eventForm.title && eventForm.date && eventForm.time;
	const isLoading = currentUser === undefined;

	return (
		<div className="min-h-screen bg-[#161621] text-white">
			<Navbar />

			<main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
				{/* Header with gradient background glow */}
				<header className="relative mb-8">
					<div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
					<div className="absolute -top-10 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
					<div className="relative">
						<h1 className="text-2xl sm:text-3xl font-bold">
							{getGreeting()},{" "}
							<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
								{currentUser?.firstName ?? user?.firstName ?? "there"}
							</span>
						</h1>
						<p className="text-gray-400 mt-1">
							Discover events that match your vibe
						</p>
					</div>
				</header>

				{/* Pending Requests Section - Always at TOP */}
				{pendingRequests && pendingRequests.length > 0 && (
					<section className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
							<h2 className="text-lg font-semibold text-white">
								Connection Requests
							</h2>
							<span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
								{pendingRequests.length}
							</span>
						</div>
						<div className="space-y-3">
							{pendingRequests.map((request) => (
								<div
									key={request._id}
									className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 backdrop-blur-sm"
								>
									<div className="flex items-start gap-4">
										<div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg shrink-0">
											{request.senderName?.charAt(0)?.toUpperCase() || "?"}
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-white">
												{request.senderName}
											</p>
											<p className="text-sm text-gray-400 mt-0.5">
												wants to connect for{" "}
												<span className="text-purple-300 capitalize">
													{request.intent || request.activity}
												</span>
											</p>
										</div>
									</div>
									<div className="flex gap-3 mt-4">
										<button
											type="button"
											onClick={() => handleAcceptRequest(request._id)}
											className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
										>
											Accept
										</button>
										<button
											type="button"
											onClick={() => handleDeclineRequest(request._id)}
											className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all duration-200"
										>
											Decline
										</button>
									</div>
								</div>
							))}
						</div>
					</section>
				)}

				{/* Suggested Companions Section */}
				<section className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-semibold text-white">
								Suggested Companions
							</h2>
							{activeSearches && activeSearches.length > 0 && (
								<span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
									{activeSearches.length}
								</span>
							)}
						</div>
					</div>

					{activeSearches && activeSearches.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{activeSearches.slice(0, 6).map((search) => {
								const activityInfo = partnerActivityLabels[
									search.activityType
								] || {
									label: search.activityType,
									icon: "🎯",
								};
								const alreadySent = hasAlreadySentRequest(search.userId);
								const isFull =
									search.peopleNeeded !== undefined && search.spotsLeft === 0;

								return (
									<div
										key={search._id}
										className="group p-5 rounded-2xl bg-[#1e1e2e] border border-white/10 hover:border-cyan-500/30 transition-all duration-300"
									>
										{/* Header with user info */}
										<div className="flex items-start gap-3 mb-4">
											<button
												type="button"
												onClick={() =>
													setViewingProfileUserId(search.userId as Id<"users">)
												}
												className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg shrink-0 hover:ring-2 hover:ring-cyan-500/50 transition-all"
											>
												{search.userDetails?.profileImageUrl ? (
													<img
														src={search.userDetails.profileImageUrl}
														alt=""
														className="w-full h-full rounded-full object-cover"
													/>
												) : (
													search.userName?.charAt(0)?.toUpperCase() || "?"
												)}
											</button>
											<div className="flex-1 min-w-0">
												<button
													type="button"
													onClick={() =>
														setViewingProfileUserId(
															search.userId as Id<"users">,
														)
													}
													className="font-semibold text-white truncate hover:text-cyan-300 transition-colors text-left block"
												>
													{search.userName}
												</button>
												<p className="text-sm text-gray-500">
													{search.userDetails?.personalityType && (
														<span className="capitalize">
															{search.userDetails.personalityType}
														</span>
													)}
												</p>
											</div>
										</div>

										{/* Activity type badge */}
										<div className="flex items-center justify-between mb-3">
											<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 text-cyan-300 text-sm font-medium">
												<span>{activityInfo.icon}</span>
												Looking for {activityInfo.label}
											</span>
											{/* Spots indicator */}
											{search.peopleNeeded && (
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
														search.spotsLeft === 0
															? "bg-red-500/20 text-red-400"
															: search.spotsLeft !== undefined &&
																	search.spotsLeft <= 2
																? "bg-orange-500/20 text-orange-400"
																: "bg-green-500/20 text-green-400"
													}`}
												>
													<svg
														className="w-3 h-3"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
														/>
													</svg>
													{search.peopleJoined || 0}/{search.peopleNeeded}
												</span>
											)}
										</div>

										{/* Spots left message */}
										{search.peopleNeeded && search.spotsLeft !== undefined && (
											<div
												className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${
													search.spotsLeft === 0
														? "bg-red-500/10 text-red-400"
														: search.spotsLeft <= 2
															? "bg-orange-500/10 text-orange-400"
															: "bg-green-500/10 text-green-400"
												}`}
											>
												{search.spotsLeft === 0
													? "All spots filled"
													: search.spotsLeft === 1
														? "Looking for 1 more partner!"
														: `Looking for ${search.spotsLeft} more partners`}
											</div>
										)}

										{/* Preferences - Display first 2 preference values */}
										<div className="space-y-2 mb-4">
											{search.preferences &&
												Object.keys(search.preferences).length > 0 && (
													<div className="flex flex-wrap gap-1.5">
														{Object.entries(search.preferences)
															.slice(0, 3)
															.map(([key, value]) => (
																<span
																	key={key}
																	className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-400 capitalize"
																>
																	{String(value).replace(/-/g, " ")}
																</span>
															))}
														{Object.keys(search.preferences).length > 3 && (
															<span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-500">
																+{Object.keys(search.preferences).length - 3}{" "}
																more
															</span>
														)}
													</div>
												)}
										</div>

										{/* Connect Button */}
										<button
											type="button"
											onClick={() =>
												!alreadySent && !isFull && handleConnectWithUser(search)
											}
											disabled={
												alreadySent || connectingTo === search._id || isFull
											}
											className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all touch-manipulation ${
												isFull
													? "bg-red-500/10 text-red-400 cursor-default"
													: alreadySent
														? "bg-white/5 text-gray-500 cursor-default"
														: connectingTo === search._id
															? "bg-gradient-to-r from-cyan-500/50 to-purple-500/50 text-white"
															: "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]"
											}`}
										>
											{connectingTo === search._id ? (
												<span className="flex items-center justify-center gap-2">
													<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
													Connecting...
												</span>
											) : isFull ? (
												"All Spots Filled"
											) : alreadySent ? (
												"Request Sent"
											) : (
												"Connect"
											)}
										</button>
									</div>
								);
							})}
						</div>
					) : activeSearches === undefined ? (
						<div className="flex items-center justify-center py-12">
							<div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-[#1e1e2e] border border-white/5">
							<div className="w-14 h-14 mb-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
								<span className="text-2xl">🔍</span>
							</div>
							<p className="text-gray-400 text-sm">
								No one is looking for partners right now
							</p>
							<p className="text-gray-500 text-xs mt-1">
								Check back later or start your own search!
							</p>
						</div>
					)}
				</section>

				{/* Live Events Section */}
				<section className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-semibold text-white">Live Events</h2>
							<span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
								<span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
								Live
							</span>
						</div>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-16">
							<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
						</div>
					) : liveEvents && liveEvents.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{liveEvents.map((event) => (
								<div
									key={event._id}
									className="group rounded-2xl bg-[#1e1e2e] border border-white/10 hover:border-purple-500/30 transition-all duration-300 overflow-hidden"
								>
									{/* Event Image */}
									{event.imageUrl && (
										<div className="w-full h-36 bg-white/5">
											<img
												src={event.imageUrl}
												alt={event.title}
												className="w-full h-full object-cover"
											/>
										</div>
									)}

									<div className="p-5">
										<div className="flex items-start justify-between mb-3">
											<span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium flex items-center gap-1.5">
												🎯{event.activity}
											</span>
											{/* Spots indicator */}
											{event.peopleNeeded && (
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
														event.spotsLeft === 0
															? "bg-red-500/20 text-red-400"
															: event.spotsLeft !== undefined &&
																	event.spotsLeft !== null &&
																	event.spotsLeft <= 2
																? "bg-orange-500/20 text-orange-400"
																: "bg-green-500/20 text-green-400"
													}`}
												>
													<svg
														className="w-3 h-3"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
														/>
													</svg>
													{event.goingCount}/{event.peopleNeeded}
												</span>
											)}
										</div>
										<h3 className="text-lg font-semibold mb-2 text-white group-hover:text-purple-300 transition-colors">
											{event.title}
										</h3>
										{event.description && (
											<p className="text-sm text-gray-400 mb-4 line-clamp-2">
												{event.description}
											</p>
										)}
										<div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
											<svg
												className="w-4 h-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={1.5}
													d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
											{formatDateTime(event.dateTime)}
										</div>

										{/* Spots left message */}
										{event.peopleNeeded && event.spotsLeft !== null && (
											<div
												className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium ${
													event.spotsLeft === 0
														? "bg-red-500/10 text-red-400"
														: event.spotsLeft !== undefined &&
																event.spotsLeft <= 2
															? "bg-orange-500/10 text-orange-400"
															: "bg-green-500/10 text-green-400"
												}`}
											>
												{event.spotsLeft === 0
													? "Event is full"
													: event.spotsLeft === 1
														? "1 spot left!"
														: `${event.spotsLeft} spots left`}
											</div>
										)}

										<div className="flex items-center justify-between pt-3 border-t border-white/5">
											<div className="flex items-center gap-2">
												<div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/50 to-cyan-500/50 flex items-center justify-center text-xs font-medium">
													{event.creatorName?.charAt(0)?.toUpperCase() || "?"}
												</div>
												<span className="text-sm text-gray-400">
													{event.creatorName}
												</span>
											</div>
											<button
												type="button"
												onClick={() => handleViewEvent(event._id)}
												className="px-4 py-2 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-purple-500/20 hover:text-purple-300 transition-all"
											>
												View
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-[#1e1e2e] border border-white/5">
							<div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
								<svg
									className="w-8 h-8 text-purple-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<p className="text-gray-300 font-medium mb-1">No events yet</p>
							<p className="text-gray-500 text-sm mb-4">
								Be the first to create one!
							</p>
							<button
								type="button"
								onClick={() => setIsModalOpen(true)}
								className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
							>
								Create Event
							</button>
						</div>
					)}
				</section>

				{/* Communities Section */}
				<section className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-white">
							Discover Communities
						</h2>
					</div>

					{communities && communities.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{communities.slice(0, 6).map((community) => {
								const isJoined = userCommunityIds?.includes(community._id);
								return (
									<div
										key={community._id}
										className="group p-5 rounded-2xl bg-[#1e1e2e] border border-white/10 hover:border-cyan-500/30 transition-all duration-300"
									>
										<div className="flex items-start gap-4 mb-3">
											<button
												type="button"
												onClick={() =>
													isJoined && setViewingCommunityId(community._id)
												}
												className={`w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-2xl shrink-0 ${isJoined ? "hover:ring-2 hover:ring-cyan-500/50 transition-all cursor-pointer" : ""}`}
											>
												{community.imageUrl ? (
													<img
														src={community.imageUrl}
														alt=""
														className="w-full h-full rounded-xl object-cover"
													/>
												) : (
													"👥"
												)}
											</button>
											<div className="flex-1 min-w-0">
												<button
													type="button"
													onClick={() =>
														isJoined && setViewingCommunityId(community._id)
													}
													className={`font-semibold text-white group-hover:text-cyan-300 transition-colors truncate text-left block ${isJoined ? "hover:text-cyan-300 cursor-pointer" : ""}`}
													disabled={!isJoined}
												>
													{community.name}
												</button>
												<p className="text-sm text-gray-500">
													{community.memberCount} members
												</p>
											</div>
										</div>
										<p className="text-sm text-gray-400 mb-4 line-clamp-2">
											{community.description}
										</p>
										<button
											type="button"
											onClick={() =>
												!isJoined && handleJoinCommunity(community._id)
											}
											disabled={isJoined}
											className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
												isJoined
													? "bg-white/5 text-gray-500 cursor-default"
													: "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 hover:from-cyan-500/30 hover:to-purple-500/30"
											}`}
										>
											{isJoined ? "Joined" : "Join Community"}
										</button>
									</div>
								);
							})}
						</div>
					) : communities === undefined ? (
						<div className="flex items-center justify-center py-12">
							<div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-[#1e1e2e] border border-white/5">
							<div className="w-14 h-14 mb-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
								<span className="text-2xl">👥</span>
							</div>
							<p className="text-gray-400 text-sm">
								No community suggestions yet
							</p>
						</div>
					)}
				</section>
			</main>

			{/* Floating Action Buttons */}
			<div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
				{/* Create Community Button */}
				<button
					type="button"
					onClick={() => setIsCommunityModalOpen(true)}
					className="px-5 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-cyan-500/30 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-200"
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
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					Create Community
				</button>

				{/* Create Event Button */}
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="px-5 py-3 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-200"
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
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Create Event
				</button>
			</div>

			{/* Create Community Modal */}
			<CreateCommunityModal
				isOpen={isCommunityModalOpen}
				onClose={() => setIsCommunityModalOpen(false)}
				userId={user?.id ?? undefined}
			/>

			{/* Create Event Modal */}
			{isModalOpen && (
				<>
					<button
						type="button"
						aria-label="Close create event modal"
						className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] touch-manipulation"
						onClick={() => setIsModalOpen(false)}
					/>
					<div className="fixed inset-0 z-[61] overflow-y-auto pointer-events-none">
						<div className="min-h-full flex items-center justify-center p-4 py-8">
							<div className="w-full max-w-md rounded-3xl bg-[#1e1e2e] border border-white/10 shadow-2xl pointer-events-auto">
								{/* Modal Header */}
								<div className="px-6 py-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1e1e2e] rounded-t-3xl z-10">
									<h3 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
										Create Event
									</h3>
									<button
										type="button"
										onClick={() => setIsModalOpen(false)}
										className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
									>
										<svg
											className="w-5 h-5 text-gray-400"
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
								</div>

								{/* Modal Body */}
								<form onSubmit={handleCreateEvent} className="p-6 space-y-5">
									{/* Event Image Upload */}
									<div>
										<label
											htmlFor="event-image"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											Event Image{" "}
											<span className="text-gray-500">(optional)</span>
										</label>
										{eventImagePreview ? (
											<div className="relative rounded-xl overflow-hidden">
												<img
													src={eventImagePreview}
													alt="Event preview"
													className="w-full h-40 object-cover"
												/>
												<button
													type="button"
													onClick={handleRemoveEventImage}
													className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
												>
													<svg
														className="w-4 h-4 text-white"
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
											</div>
										) : (
											<button
												type="button"
												onClick={() => eventImageInputRef.current?.click()}
												className="w-full h-32 rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/30 flex flex-col items-center justify-center gap-2 transition-colors"
											>
												<div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
													<svg
														className="w-5 h-5 text-gray-400"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={1.5}
															d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
														/>
													</svg>
												</div>
												<span className="text-sm text-gray-500">
													Add event image
												</span>
											</button>
										)}
										<input
											id="event-image"
											ref={eventImageInputRef}
											type="file"
											accept="image/*"
											onChange={handleEventImageSelect}
											className="hidden"
										/>
									</div>

									{/* What is this event about */}
									<div>
										<label
											htmlFor="event-activity"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											What is this event about?
										</label>
										<input
											id="event-activity"
											type="text"
											value={eventForm.activity}
											onChange={(e) =>
												setEventForm({ ...eventForm, activity: e.target.value })
											}
											placeholder="e.g., Board game night, Hiking trip, Coding session..."
											className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
										/>
									</div>

									{/* Title */}
									<div>
										<label
											htmlFor="event-title"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											Event Title
										</label>
										<input
											id="event-title"
											type="text"
											value={eventForm.title}
											onChange={(e) =>
												setEventForm({ ...eventForm, title: e.target.value })
											}
											placeholder="e.g., Coffee catch-up at Central Perk"
											className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
										/>
									</div>

									{/* Description */}
									<div>
										<label
											htmlFor="event-description"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											Description{" "}
											<span className="text-gray-500">(optional)</span>
										</label>
										<textarea
											id="event-description"
											value={eventForm.description}
											onChange={(e) =>
												setEventForm({
													...eventForm,
													description: e.target.value,
												})
											}
											placeholder="Share more details about your event..."
											rows={3}
											className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
										/>
									</div>

									{/* Date & Time */}
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label
												htmlFor="event-date"
												className="block text-sm font-medium text-gray-300 mb-2"
											>
												Date
											</label>
											<input
												id="event-date"
												type="date"
												value={eventForm.date}
												onChange={(e) =>
													setEventForm({ ...eventForm, date: e.target.value })
												}
												min={new Date().toISOString().split("T")[0]}
												className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
											/>
										</div>
										<div>
											<label
												htmlFor="event-time"
												className="block text-sm font-medium text-gray-300 mb-2"
											>
												Time
											</label>
											<input
												id="event-time"
												type="time"
												value={eventForm.time}
												onChange={(e) =>
													setEventForm({ ...eventForm, time: e.target.value })
												}
												className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
											/>
										</div>
									</div>

									{/* People Needed */}
									<div>
										<label
											htmlFor="event-people-needed"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											How many people do you need?{" "}
											<span className="text-gray-500">(optional)</span>
										</label>
										<div className="flex items-center gap-3">
											<div className="flex-1">
												<input
													id="event-people-needed"
													type="number"
													min="1"
													max="50"
													value={eventForm.peopleNeeded}
													onChange={(e) =>
														setEventForm({
															...eventForm,
															peopleNeeded: e.target.value,
														})
													}
													placeholder="Leave empty for unlimited"
													className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
												/>
											</div>
											{eventForm.peopleNeeded && (
												<div className="px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
													<span className="text-purple-300 text-sm font-medium">
														{eventForm.peopleNeeded}{" "}
														{Number.parseInt(eventForm.peopleNeeded, 10) === 1
															? "person"
															: "people"}
													</span>
												</div>
											)}
										</div>
										<p className="text-xs text-gray-500 mt-2">
											Event will auto-close when all spots are filled
										</p>
									</div>

									{/* Submit Button */}
									<button
										type="submit"
										disabled={!isFormValid || isCreating}
										className={`w-full py-3.5 rounded-xl font-medium transition-all duration-200 touch-manipulation ${
											isFormValid && !isCreating
												? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
												: "bg-white/10 text-gray-500 cursor-not-allowed"
										}`}
									>
										{isCreating ? (
											<span className="flex items-center justify-center gap-2">
												<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
												Creating...
											</span>
										) : (
											"Create Event"
										)}
									</button>
								</form>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Event Detail Modal */}
			{selectedEvent && (
				<>
					<button
						type="button"
						aria-label="Close event details modal"
						className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] touch-manipulation"
						onClick={() => setSelectedEvent(null)}
					/>
					<div className="fixed inset-0 z-[61] overflow-y-auto pointer-events-none">
						<div className="min-h-full flex items-center justify-center p-4 py-8">
							<div className="w-full max-w-md rounded-3xl bg-[#1e1e2e] border border-white/10 shadow-2xl pointer-events-auto">
								{eventDetails ? (
									<>
										{/* Event Image */}
										{eventDetails.imageUrl && (
											<div className="w-full h-48 bg-white/5">
												<img
													src={eventDetails.imageUrl}
													alt={eventDetails.title}
													className="w-full h-full object-cover"
												/>
											</div>
										)}

										{/* Event Header */}
										<div className="px-6 py-5 border-b border-white/10">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium mb-3">
														🎯{eventDetails.activity}
													</span>
													<h3 className="text-xl font-semibold text-white">
														{eventDetails.title}
													</h3>
												</div>
												<button
													type="button"
													onClick={() => setSelectedEvent(null)}
													className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors ml-4"
												>
													<svg
														className="w-5 h-5 text-gray-400"
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
											</div>
										</div>

										{/* Event Body */}
										<div className="p-6 space-y-5">
											{/* Description */}
											{eventDetails.description && (
												<p className="text-gray-300">
													{eventDetails.description}
												</p>
											)}

											{/* Date & Time */}
											<div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
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
															d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
														/>
													</svg>
												</div>
												<div>
													<p className="text-sm text-gray-400">Date & Time</p>
													<p className="text-white font-medium">
														{formatDateTime(eventDetails.dateTime)}
													</p>
												</div>
											</div>

											{/* Creator */}
											<div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
												<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
													{eventDetails.creator?.profileImageUrl ? (
														<img
															src={eventDetails.creator.profileImageUrl}
															alt=""
															className="w-full h-full rounded-full object-cover"
														/>
													) : (
														eventDetails.creatorName
															?.charAt(0)
															?.toUpperCase() || "?"
													)}
												</div>
												<div>
													<p className="text-sm text-gray-400">Hosted by</p>
													<p className="text-white font-medium">
														{eventDetails.creatorName}
													</p>
												</div>
											</div>

											{/* Attendees */}
											<div className="p-4 rounded-xl bg-white/5">
												<div className="flex items-center justify-between mb-3">
													<p className="text-sm text-gray-400">Attendees</p>
													<span
														className={`px-2 py-0.5 rounded-full text-xs font-medium ${
															eventDetails.peopleNeeded &&
															eventDetails.spotsLeft === 0
																? "bg-red-500/20 text-red-400"
																: eventDetails.peopleNeeded &&
																		eventDetails.spotsLeft !== undefined &&
																		eventDetails.spotsLeft <= 2
																	? "bg-orange-500/20 text-orange-400"
																	: "bg-green-500/20 text-green-400"
														}`}
													>
														{eventDetails.peopleNeeded
															? `${eventDetails.goingCount || 0}/${eventDetails.peopleNeeded} going`
															: `${eventDetails.attendeeCount || 0} going`}
													</span>
												</div>

												{/* Spots left message */}
												{eventDetails.peopleNeeded &&
													eventDetails.spotsLeft !== undefined && (
														<div
															className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${
																eventDetails.spotsLeft === 0
																	? "bg-red-500/10 text-red-400"
																	: eventDetails.spotsLeft <= 2
																		? "bg-orange-500/10 text-orange-400"
																		: "bg-green-500/10 text-green-400"
															}`}
														>
															{eventDetails.spotsLeft === 0
																? "Event is full - no more spots available"
																: eventDetails.spotsLeft === 1
																	? "1 spot left!"
																	: `${eventDetails.spotsLeft} spots left`}
														</div>
													)}
												{eventDetails.attendees &&
												eventDetails.attendees.length > 0 ? (
													<div className="flex items-center gap-2">
														<div className="flex -space-x-2">
															{eventDetails.attendees
																.slice(0, 5)
																.map((attendee) => (
																	<div
																		key={
																			attendee.userName || "unknown-attendee"
																		}
																		className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/50 to-cyan-500/50 border-2 border-[#1e1e2e] flex items-center justify-center text-xs font-medium text-white"
																		title={attendee.userName}
																	>
																		{attendee.userName
																			?.charAt(0)
																			?.toUpperCase() || "?"}
																	</div>
																))}
															{eventDetails.attendees.length > 5 && (
																<div className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#1e1e2e] flex items-center justify-center text-xs font-medium text-gray-400">
																	+{eventDetails.attendees.length - 5}
																</div>
															)}
														</div>
														<span className="text-sm text-gray-400">
															{eventDetails.attendees
																.slice(0, 2)
																.map((a) => a.userName)
																.join(", ")}
															{eventDetails.attendees.length > 2 &&
																` and ${eventDetails.attendees.length - 2} more`}
														</span>
													</div>
												) : (
													<p className="text-sm text-gray-500">
														No one has joined yet. Be the first!
													</p>
												)}
											</div>

											{/* Action Buttons */}
											{eventDetails.creatorId !== user?.id ? (
												<div className="flex gap-3">
													{userEventAttendance ? (
														<button
															type="button"
															onClick={handleLeaveEvent}
															disabled={isJoining}
															className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 transition-all"
														>
															{isJoining ? (
																<span className="flex items-center justify-center gap-2">
																	<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
																	Leaving...
																</span>
															) : (
																"Leave Event"
															)}
														</button>
													) : eventDetails.peopleNeeded &&
														eventDetails.spotsLeft === 0 ? (
														/* Event is full - show disabled state */
														<div className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-center">
															Event is Full
														</div>
													) : (
														<>
															<button
																type="button"
																onClick={() => handleJoinEvent("interested")}
																disabled={isJoining}
																className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all"
															>
																Interested
															</button>
															<button
																type="button"
																onClick={() => handleJoinEvent("going")}
																disabled={isJoining}
																className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
															>
																{isJoining ? (
																	<span className="flex items-center justify-center gap-2">
																		<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
																		Joining...
																	</span>
																) : (
																	"I'm Going!"
																)}
															</button>
														</>
													)}
												</div>
											) : (
												<div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
													<p className="text-purple-300 text-sm">
														This is your event
													</p>
												</div>
											)}
										</div>
									</>
								) : (
									<div className="p-12 flex items-center justify-center">
										<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
									</div>
								)}
							</div>
						</div>
					</div>
				</>
			)}

			<BottomNav />

			{/* User Profile Modal */}
			{viewingProfileUserId && (
				<UserProfileModal
					targetUserId={viewingProfileUserId}
					currentUserId={currentUser?._id || null}
					onClose={() => setViewingProfileUserId(null)}
				/>
			)}

			{/* Community Detail Modal */}
			{viewingCommunityId && (
				<CommunityDetailModal
					communityId={viewingCommunityId}
					userId={currentUser?._id || null}
					onClose={() => setViewingCommunityId(null)}
				/>
			)}
		</div>
	);
}
