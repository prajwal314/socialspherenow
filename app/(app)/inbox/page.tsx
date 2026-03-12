"use client";

import { useMutation, useQuery } from "convex/react";
import {
	type ChangeEvent,
	type FormEvent,
	useEffect,
	useRef,
	useState,
} from "react";

export const dynamic = "force-dynamic";

import BottomNav from "@/components/BottomNav";
import CommunityDetailModal from "@/components/CommunityDetailModal";
import Navbar from "@/components/Navbar";
import UserProfileModal from "@/components/UserProfileModal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/auth-context";

// ==================== INTERFACES ====================

interface ActivityFilter {
	id: string;
	label: string;
	icon: string | null;
}

interface ConnectionSource {
	activity: string;
	eventId?: string;
	activitySearchId?: string;
}

interface EventDetails {
	title?: string;
	activity?: string;
	dateTime?: number;
	description?: string;
	imageUrl?: string;
}

interface ActivityDetails {
	id?: Id<"activitySearches">;
	activityType?: string;
	userName?: string;
}

interface CommunityDetails {
	id?: Id<"communities">;
	name?: string;
	imageUrl?: string;
	memberCount?: number;
}

interface OtherUser {
	id: string;
	name: string;
	profileImageUrl?: string;
}

// Chat as returned from getUserChatsWithDetails query
interface Chat {
	_id: Id<"chats">;
	_creationTime: number;
	type: "direct" | "community" | "event" | "activity" | "group";
	participantIds?: string[];
	communityId?: Id<"communities">;
	groupId?: Id<"communityGroups">;
	activitySearchId?: Id<"activitySearches">;
	eventId?: Id<"events">;
	adminId?: string;
	name?: string;
	description?: string;
	lastMessageAt?: number;
	lastMessagePreview?: string;
	createdAt: number;
	// Enriched fields from getUserChatsWithDetails
	displayName: string;
	displayImage?: string | null;
	otherUserId?: string;
	connectionSource?: ConnectionSource | null;
	memberCount?: number;
	isAdmin?: boolean;
	eventDetails?: EventDetails | null;
	activityType?: string | null;
}

// Selected chat details from getChatWithDetails query
interface SelectedChatDetails {
	_id: Id<"chats">;
	_creationTime: number;
	type: "direct" | "community" | "event" | "activity" | "group";
	participantIds?: string[];
	communityId?: Id<"communities">;
	groupId?: Id<"communityGroups">;
	activitySearchId?: Id<"activitySearches">;
	eventId?: Id<"events">;
	adminId?: string;
	name?: string;
	description?: string;
	lastMessageAt?: number;
	lastMessagePreview?: string;
	createdAt: number;
	// For direct chats
	otherUser?: OtherUser | null;
	// For community chats
	community?: CommunityDetails | null;
	// For event chats
	eventDetails?: EventDetails | null;
	// For activity chats
	activityDetails?: ActivityDetails | null;
	memberCount?: number;
	isAdmin?: boolean;
}

// Message from getChatMessages query
interface Message {
	_id: Id<"messages">;
	_creationTime: number;
	chatId: Id<"chats">;
	senderId: string;
	senderName: string;
	content: string;
	type: "text" | "image" | "system";
	createdAt: number;
	readBy?: string[];
}

// Grouped message item (message or date separator)
interface DateItem {
	type: "date";
	date: string;
	timestamp: number;
}

type GroupedMessage = Message & { kind: "message" };

type GroupedItem = DateItem | GroupedMessage;

// Current user from getByWorkosId query
interface CurrentUser {
	_id: Id<"users">;
	_creationTime: number;
	workosId: string;
	email: string;
	firstName?: string;
	lastName?: string;
	profileImageUrl?: string;
	profileImageId?: Id<"_storage">;
	createdAt: number;
	intents?: string[];
	activities?: string[];
	comfortPreference?: string;
	availability?: string[];
	personalityType?: string;
	hasCompletedPreferences?: boolean;
}

// ==================== CONSTANTS ====================

// Activity types for filters (matching Explore.jsx)
const ACTIVITY_FILTERS: ActivityFilter[] = [
	{ id: "all", label: "All", icon: null },
	{ id: "communities", label: "Communities", icon: "👥" },
	{ id: "events", label: "Events", icon: "🎉" },
	{ id: "activities", label: "Activity Groups", icon: "🎯" },
	{ id: "roommate", label: "Roommate", icon: "🏠" },
	{ id: "travel_mate", label: "Travel Mate", icon: "✈️" },
	{ id: "date", label: "Date", icon: "💕" },
	{ id: "turf_partner", label: "Turf Partner", icon: "⚽" },
	{ id: "dinner_partner", label: "Dinner Partner", icon: "🍽️" },
	{ id: "cofounder", label: "Cofounder", icon: "🚀" },
	{ id: "study_partner", label: "Study Partner", icon: "📚" },
	{ id: "work_partner", label: "Work Partner", icon: "💼" },
	{ id: "coffee_buddy", label: "Coffee Buddy", icon: "☕" },
	{ id: "movie_buddy", label: "Movie Buddy", icon: "🎬" },
	{ id: "gym_partner", label: "Gym Partner", icon: "💪" },
	{ id: "gaming_buddy", label: "Gaming Buddy", icon: "🎮" },
];

// ==================== HELPER FUNCTIONS ====================

// Helper to get activity icon
const getActivityIcon = (activityType: string | undefined | null): string => {
	const filter = ACTIVITY_FILTERS.find((f) => f.id === activityType);
	return filter?.icon || "🎯";
};

// ==================== COMPONENT ====================

export default function Inbox() {
	const { user } = useAuth();
	const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(
		null,
	);
	const [messageInput, setMessageInput] = useState<string>("");
	const [isSending, setIsSending] = useState<boolean>(false);
	const [viewingProfileUserId, setViewingProfileUserId] = useState<
		string | null
	>(null);
	const [viewingCommunityId, setViewingCommunityId] =
		useState<Id<"communities"> | null>(null);
	const [activeFilter, setActiveFilter] = useState<string>("all");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const filterScrollRef = useRef<HTMLDivElement>(null);

	// Queries
	const currentUser = useQuery(
		api.users.getByWorkosId,
		user?.id ? { workosId: user.id } : "skip",
	) as CurrentUser | undefined | null;

	const chats = useQuery(
		api.chats.getUserChatsWithDetails,
		user?.id ? { userId: user.id } : "skip",
	) as Chat[] | undefined;

	const selectedChat = useQuery(
		api.chats.getChatWithDetails,
		selectedChatId && user?.id
			? { chatId: selectedChatId, currentUserId: user.id }
			: "skip",
	) as SelectedChatDetails | undefined | null;

	const messages = useQuery(
		api.messages.getChatMessages,
		selectedChatId ? { chatId: selectedChatId, limit: 100 } : "skip",
	) as Message[] | undefined;

	// Mutations
	const sendMessage = useMutation(api.messages.sendMessage);
	const markAsRead = useMutation(api.messages.markMessagesAsRead);

	// Scroll to bottom when messages change
	useEffect(() => {
		if (messages?.length && messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	// Mark messages as read when chat is opened
	useEffect(() => {
		if (selectedChatId && user?.id) {
			markAsRead({ chatId: selectedChatId, userId: user.id });
		}
	}, [selectedChatId, user?.id, markAsRead]);

	// Focus input when chat is selected
	useEffect(() => {
		if (selectedChatId && inputRef.current) {
			inputRef.current.focus();
		}
	}, [selectedChatId]);

	const handleSendMessage = async (
		e: FormEvent<HTMLFormElement>,
	): Promise<void> => {
		e.preventDefault();
		if (!messageInput.trim() || !selectedChatId || !user?.id || !currentUser)
			return;

		setIsSending(true);
		try {
			await sendMessage({
				chatId: selectedChatId,
				senderId: user.id,
				senderName: currentUser.firstName || "Anonymous",
				content: messageInput.trim(),
				type: "text",
			});
			setMessageInput("");
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setIsSending(false);
		}
	};

	const formatTime = (timestamp: number): string => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays === 0) {
			return date.toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			});
		} else if (diffDays === 1) {
			return "Yesterday";
		} else if (diffDays < 7) {
			return date.toLocaleDateString("en-US", { weekday: "short" });
		} else {
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
		}
	};

	const formatMessageTime = (timestamp: number): string => {
		return new Date(timestamp).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	const getInitial = (name: string | undefined | null): string => {
		return name?.charAt(0)?.toUpperCase() || "?";
	};

	// Group messages by date
	const groupMessagesByDate = (msgs: Message[] | undefined): GroupedItem[] => {
		if (!msgs) return [];

		const groups: GroupedItem[] = [];
		let currentDate: string | null = null;

		msgs.forEach((msg) => {
			const msgDate = new Date(msg.createdAt).toDateString();
			if (msgDate !== currentDate) {
				currentDate = msgDate;
				groups.push({ type: "date", date: msgDate, timestamp: msg.createdAt });
			}
			groups.push({ ...msg, kind: "message" });
		});

		return groups;
	};

	const formatDateHeader = (timestamp: number): string => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays === 0) return "Today";
		if (diffDays === 1) return "Yesterday";
		return date.toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
		});
	};

	const groupedMessages = groupMessagesByDate(messages);

	// Filter chats based on active filter
	const getFilteredChats = (): Chat[] => {
		if (!chats) return [];

		if (activeFilter === "all") {
			return chats;
		}

		if (activeFilter === "communities") {
			return chats.filter((chat) => chat.type === "community");
		}

		if (activeFilter === "events") {
			// Event group chats OR direct chats from events
			return chats.filter(
				(chat) =>
					chat.type === "event" ||
					(chat.type === "direct" && chat.connectionSource?.eventId),
			);
		}

		if (activeFilter === "activities") {
			// Activity group chats (with 3+ people)
			return chats.filter((chat) => chat.type === "activity");
		}

		// Filter by specific activity type
		// Includes: direct chats with that activity, AND activity group chats with that activityType
		return chats.filter(
			(chat) =>
				(chat.type === "direct" &&
					chat.connectionSource?.activity === activeFilter) ||
				(chat.type === "activity" && chat.activityType === activeFilter),
		);
	};

	const filteredChats = getFilteredChats();

	// Get available filters based on user's chats
	const getAvailableFilters = (): ActivityFilter[] => {
		if (!chats) return [ACTIVITY_FILTERS[0]];

		const availableIds = new Set<string>(["all"]);

		chats.forEach((chat) => {
			if (chat.type === "community") {
				availableIds.add("communities");
			} else if (chat.type === "event") {
				// Event group chat
				availableIds.add("events");
			} else if (chat.type === "activity") {
				// Activity group chat
				availableIds.add("activities");
				if (chat.activityType) {
					availableIds.add(chat.activityType);
				}
			} else if (chat.type === "direct" && chat.connectionSource) {
				if (chat.connectionSource.eventId) {
					availableIds.add("events");
				}
				if (chat.connectionSource.activity) {
					availableIds.add(chat.connectionSource.activity);
				}
			}
		});

		return ACTIVITY_FILTERS.filter((f) => availableIds.has(f.id));
	};

	const availableFilters = getAvailableFilters();

	// Chat list view
	const renderChatList = () => (
		<div className="flex flex-col h-full">
			{/* Header */}
			<header className="px-4 py-4 border-b border-white/10">
				<h1 className="text-2xl font-bold">
					<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
						Inbox
					</span>
				</h1>
				<p className="text-gray-500 text-sm mt-1">Your conversations</p>
			</header>

			{/* Filter bar */}
			<div className="px-4 py-3 border-b border-white/10">
				<div
					ref={filterScrollRef}
					className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
					style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
				>
					{availableFilters.map((filter) => (
						<button
							type="button"
							key={filter.id}
							onClick={() => setActiveFilter(filter.id)}
							className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all shrink-0 ${
								activeFilter === filter.id
									? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25"
									: "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
							}`}
						>
							{filter.icon && <span>{filter.icon}</span>}
							<span>{filter.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Chat list */}
			<div className="flex-1 overflow-y-auto">
				{chats === undefined ? (
					<div className="flex items-center justify-center py-20">
						<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
					</div>
				) : filteredChats && filteredChats.length > 0 ? (
					<div className="divide-y divide-white/5">
						{filteredChats.map((chat) => (
							<div
								key={chat._id}
								className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
							>
								{/* Avatar - clickable for direct chats to view profile */}
								{chat.type === "direct" && chat.otherUserId ? (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setViewingProfileUserId(chat.otherUserId ?? null);
										}}
										className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 hover:ring-2 hover:ring-purple-500/50 transition-all"
									>
										{chat.displayImage ? (
											<img
												src={chat.displayImage}
												alt=""
												className="w-full h-full rounded-full object-cover"
											/>
										) : (
											getInitial(chat.displayName)
										)}
									</button>
								) : chat.type === "event" ? (
									// Event group chat avatar
									<div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 bg-gradient-to-br from-orange-500 to-pink-500">
										{chat.displayImage ? (
											<img
												src={chat.displayImage}
												alt=""
												className="w-full h-full rounded-full object-cover"
											/>
										) : (
											"🎉"
										)}
									</div>
								) : chat.type === "activity" ? (
									// Activity group chat avatar
									<div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 bg-gradient-to-br from-emerald-500 to-cyan-500">
										{getActivityIcon(chat.activityType)}
									</div>
								) : (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											if (chat.type === "community" && chat.communityId) {
												setViewingCommunityId(chat.communityId);
											}
										}}
										className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${
											chat.type === "community"
												? "bg-gradient-to-br from-cyan-500 to-purple-500 hover:ring-2 hover:ring-cyan-500/50 transition-all"
												: "bg-gradient-to-br from-purple-500 to-pink-500"
										}`}
									>
										{chat.displayImage ? (
											<img
												src={chat.displayImage}
												alt=""
												className="w-full h-full rounded-full object-cover"
											/>
										) : chat.type === "community" ? (
											"👥"
										) : (
											getInitial(chat.displayName)
										)}
									</button>
								)}

								{/* Content - clicking opens chat */}
								<button
									type="button"
									onClick={() => setSelectedChatId(chat._id)}
									className="flex-1 min-w-0 text-left"
								>
									<div className="flex items-center justify-between mb-1">
										<h3 className="font-semibold text-white truncate">
											{chat.displayName}
										</h3>
										{chat.lastMessageAt && (
											<span className="text-xs text-gray-500 shrink-0 ml-2">
												{formatTime(chat.lastMessageAt)}
											</span>
										)}
									</div>
									<p className="text-sm text-gray-400 truncate">
										{chat.lastMessagePreview || "No messages yet"}
									</p>
								</button>

								{/* Type badge - show chat type and admin status */}
								{chat.type === "community" ? (
									<span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs shrink-0">
										Group
									</span>
								) : chat.type === "event" ? (
									<div className="flex flex-col items-end gap-1 shrink-0">
										<span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs">
											Event
										</span>
										{chat.isAdmin && (
											<span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px]">
												Admin
											</span>
										)}
										{chat.memberCount && (
											<span className="text-[10px] text-gray-500">
												{chat.memberCount} member
												{chat.memberCount > 1 ? "s" : ""}
											</span>
										)}
									</div>
								) : chat.type === "activity" ? (
									<div className="flex flex-col items-end gap-1 shrink-0">
										<span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs max-w-[80px] truncate">
											{getActivityIcon(chat.activityType)} Group
										</span>
										{chat.isAdmin && (
											<span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px]">
												Admin
											</span>
										)}
										{chat.memberCount && (
											<span className="text-[10px] text-gray-500">
												{chat.memberCount} member
												{chat.memberCount > 1 ? "s" : ""}
											</span>
										)}
									</div>
								) : chat.connectionSource?.activity ? (
									<span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs shrink-0 max-w-[80px] truncate">
										{ACTIVITY_FILTERS.find(
											(f) => f.id === chat.connectionSource?.activity,
										)?.icon || ""}{" "}
										{ACTIVITY_FILTERS.find(
											(f) => f.id === chat.connectionSource?.activity,
										)?.label || chat.connectionSource?.activity}
									</span>
								) : null}
							</div>
						))}
					</div>
				) : chats && chats.length > 0 ? (
					// Has chats but none match filter
					<div className="flex flex-col items-center justify-center py-20 px-4 text-center">
						<div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
							<svg
								className="w-10 h-10 text-purple-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<h3 className="text-lg font-semibold text-white mb-2">
							No matches for this filter
						</h3>
						<p className="text-gray-500 text-sm max-w-xs">
							Try selecting a different category or view all conversations
						</p>
						<button
							type="button"
							onClick={() => setActiveFilter("all")}
							className="mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
						>
							View All
						</button>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-20 px-4 text-center">
						<div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
							<svg
								className="w-10 h-10 text-purple-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
								/>
							</svg>
						</div>
						<h3 className="text-lg font-semibold text-white mb-2">
							No conversations yet
						</h3>
						<p className="text-gray-500 text-sm max-w-xs">
							Accept connection requests or join communities to start chatting
						</p>
					</div>
				)}
			</div>
		</div>
	);

	// Chat view
	const renderChatView = () => (
		<div className="flex flex-col h-full">
			{/* Chat header */}
			<header className="px-4 py-3 border-b border-white/10 flex items-center gap-3 shrink-0 bg-[#161621]">
				<button
					type="button"
					onClick={() => setSelectedChatId(null)}
					className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
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
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>

				{selectedChat && (
					<>
						{/* Avatar - clickable for direct chats */}
						{selectedChat.type === "direct" && selectedChat.otherUser?.id ? (
							<button
								type="button"
								onClick={() =>
									setViewingProfileUserId(selectedChat.otherUser?.id ?? null)
								}
								className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-purple-500 to-pink-500 hover:ring-2 hover:ring-purple-500/50 transition-all"
							>
								{selectedChat.otherUser?.profileImageUrl ? (
									<img
										src={selectedChat.otherUser.profileImageUrl}
										alt=""
										className="w-full h-full rounded-full object-cover"
									/>
								) : (
									getInitial(selectedChat.otherUser?.name || selectedChat.name)
								)}
							</button>
						) : selectedChat.type === "event" ? (
							// Event group chat avatar
							<div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-gradient-to-br from-orange-500 to-pink-500">
								{selectedChat.eventDetails?.imageUrl ? (
									<img
										src={selectedChat.eventDetails.imageUrl}
										alt=""
										className="w-full h-full rounded-full object-cover"
									/>
								) : (
									"🎉"
								)}
							</div>
						) : selectedChat.type === "activity" ? (
							// Activity group chat avatar
							<div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
								{getActivityIcon(selectedChat.activityDetails?.activityType)}
							</div>
						) : (
							<button
								type="button"
								onClick={() => {
									if (
										selectedChat.type === "community" &&
										selectedChat.communityId
									) {
										setViewingCommunityId(selectedChat.communityId);
									}
								}}
								className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
									selectedChat.type === "community"
										? "bg-gradient-to-br from-cyan-500 to-purple-500 hover:ring-2 hover:ring-cyan-500/50 transition-all cursor-pointer"
										: "bg-gradient-to-br from-purple-500 to-pink-500"
								}`}
							>
								{selectedChat.type === "community"
									? "👥"
									: getInitial(
											selectedChat.otherUser?.name || selectedChat.name,
										)}
							</button>
						)}
						<div className="flex-1 min-w-0">
							{/* Name - clickable for direct chats */}
							{selectedChat.type === "direct" && selectedChat.otherUser?.id ? (
								<button
									type="button"
									onClick={() =>
										setViewingProfileUserId(selectedChat.otherUser?.id ?? null)
									}
									className="font-semibold text-white truncate hover:text-purple-300 transition-colors text-left block"
								>
									{selectedChat.otherUser?.name || "Chat"}
								</button>
							) : selectedChat.type === "event" ? (
								<div>
									<h2 className="font-semibold text-white truncate flex items-center gap-2">
										{selectedChat.eventDetails?.title ||
											selectedChat.name ||
											"Event Group"}
										{selectedChat.isAdmin && (
											<span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px]">
												Admin
											</span>
										)}
									</h2>
									<p className="text-xs text-gray-500">
										{selectedChat.memberCount || 0} members
										{selectedChat.description &&
											` - ${selectedChat.description}`}
									</p>
								</div>
							) : selectedChat.type === "activity" ? (
								<div>
									<h2 className="font-semibold text-white truncate flex items-center gap-2">
										{selectedChat.name ||
											`${selectedChat.activityDetails?.activityType || "Activity"} Group`}
										{selectedChat.isAdmin && (
											<span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px]">
												Admin
											</span>
										)}
									</h2>
									<p className="text-xs text-gray-500">
										{selectedChat.memberCount || 0} members
										{selectedChat.description &&
											` - ${selectedChat.description}`}
									</p>
								</div>
							) : (
								<h2 className="font-semibold text-white truncate">
									{selectedChat.type === "community" ? (
										<button
											type="button"
											onClick={() => {
												if (selectedChat.communityId) {
													setViewingCommunityId(selectedChat.communityId);
												}
											}}
											className="hover:text-cyan-300 transition-colors"
										>
											{selectedChat.community?.name}
										</button>
									) : (
										selectedChat.otherUser?.name || "Chat"
									)}
								</h2>
							)}
							{/* Subtitle for community and direct chats */}
							{selectedChat.type === "community" && (
								<p className="text-xs text-gray-500">
									{selectedChat.community?.memberCount || 0} members - Tap name
									to view details
								</p>
							)}
							{selectedChat.type === "direct" && (
								<p className="text-xs text-gray-500">
									Tap name to view profile
								</p>
							)}
						</div>
					</>
				)}
			</header>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
				{messages === undefined ? (
					<div className="flex items-center justify-center h-full">
						<div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
					</div>
				) : groupedMessages.length > 0 ? (
					<>
						{groupedMessages.map((item) => {
							if (item.type === "date") {
								const dateItem = item;
								return (
									<div
										key={`date-${dateItem.timestamp}`}
										className="flex justify-center py-4"
									>
										<span className="px-3 py-1 rounded-full bg-white/5 text-gray-500 text-xs">
											{formatDateHeader(dateItem.timestamp)}
										</span>
									</div>
								);
							}

							const messageItem = item;
							const isOwnMessage = messageItem.senderId === user?.id;
							const isSystem = messageItem.type === "system";

							if (isSystem) {
								return (
									<div
										key={messageItem._id}
										className="flex justify-center py-2"
									>
										<span className="px-4 py-2 rounded-2xl bg-purple-500/10 text-purple-300 text-sm text-center max-w-xs">
											{messageItem.content}
										</span>
									</div>
								);
							}

							return (
								<div
									key={messageItem._id}
									className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-1`}
								>
									<div
										className={`max-w-[75%] ${isOwnMessage ? "order-2" : ""}`}
									>
										{/* Sender name for group chats (community, event, activity) */}
										{!isOwnMessage &&
											(selectedChat?.type === "community" ||
												selectedChat?.type === "event" ||
												selectedChat?.type === "activity") && (
												<p className="text-xs text-gray-500 mb-1 ml-3">
													{messageItem.senderName}
												</p>
											)}
										<div
											className={`px-4 py-2.5 rounded-2xl ${
												isOwnMessage
													? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-br-md"
													: "bg-[#252536] text-white rounded-bl-md"
											}`}
										>
											<p className="text-sm whitespace-pre-wrap break-words">
												{messageItem.content}
											</p>
										</div>
										<p
											className={`text-xs text-gray-600 mt-1 ${isOwnMessage ? "text-right mr-1" : "ml-3"}`}
										>
											{formatMessageTime(messageItem.createdAt)}
										</p>
									</div>
								</div>
							);
						})}
						<div ref={messagesEndRef} />
					</>
				) : (
					<div className="flex flex-col items-center justify-center h-full text-center">
						<div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
							<span className="text-2xl">👋</span>
						</div>
						<p className="text-gray-400 text-sm">Start the conversation!</p>
					</div>
				)}
			</div>

			{/* Message input */}
			<form
				onSubmit={handleSendMessage}
				className="px-4 py-3 border-t border-white/10 shrink-0 bg-[#161621]"
			>
				<div className="flex items-center gap-3">
					<input
						ref={inputRef}
						type="text"
						value={messageInput}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							setMessageInput(e.target.value)
						}
						placeholder="Type a message..."
						className="flex-1 px-4 py-3 rounded-2xl bg-[#1e1e2e] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
						disabled={isSending}
					/>
					<button
						type="submit"
						disabled={!messageInput.trim() || isSending}
						className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
							messageInput.trim() && !isSending
								? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
								: "bg-white/5 text-gray-600 cursor-not-allowed"
						}`}
					>
						{isSending ? (
							<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						) : (
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
									d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
								/>
							</svg>
						)}
					</button>
				</div>
			</form>
		</div>
	);

	return (
		<div className="min-h-screen bg-[#161621] text-white">
			<Navbar />

			<main className="h-[calc(100vh-8rem)] pt-16">
				{selectedChatId ? renderChatView() : renderChatList()}
			</main>

			{/* Only show bottom nav when not in chat view */}
			{!selectedChatId && <BottomNav />}

			{/* User Profile Modal */}
			{viewingProfileUserId && (
				<UserProfileModal
					targetUserId={viewingProfileUserId}
					currentUserId={user?.id ?? null}
					onClose={() => setViewingProfileUserId(null)}
				/>
			)}

			{/* Community Detail Modal */}
			{viewingCommunityId && (
				<CommunityDetailModal
					communityId={viewingCommunityId}
					userId={user?.id ?? null}
					onClose={() => setViewingCommunityId(null)}
				/>
			)}
		</div>
	);
}
