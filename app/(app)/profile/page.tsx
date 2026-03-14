"use client";

export const dynamic = "force-dynamic";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import type React from "react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/auth-context";

// Option type interfaces
interface Option {
	id: string;
	label: string;
	icon?: string;
}

interface PersonalityOption {
	id: string;
	label: string;
}

// Options from PreferenceOnboarding (keep in sync)
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

// Form interfaces
interface ProfileForm {
	firstName: string;
	lastName: string;
}

interface PreferencesForm {
	intents: string[];
	activities: string[];
	comfortPreference: string;
	availability: string[];
	personalityType: string;
}

// Data interfaces
interface CurrentUser {
	_id: Id<"users">;
	firstName?: string;
	lastName?: string;
	email?: string;
	profileImageUrl?: string;
	profileImageId?: Id<"_storage">;
	createdAt?: number;
	hasCompletedPreferences?: boolean;
	intents?: string[];
	activities?: string[];
	comfortPreference?: string;
	availability?: string[];
	personalityType?: string;
}

interface UserStats {
	connections: number;
	eventsCreated: number;
	communitiesJoined: number;
}

// View state type
type ActiveView = "main" | "editProfile" | "editPreferences" | "myEvents";

// Event interface
interface UserEvent {
	_id: Id<"events">;
	title: string;
	activity: string;
	description?: string;
	dateTime: number;
	isLive: boolean;
	imageUrl?: string | null;
	goingCount: number;
	spotsLeft: number | null;
	attendeeCount: number;
	peopleNeeded?: number;
	createdAt: number;
}

export default function Profile() {
	const { user } = useAuth();
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);

	// View states
	const [activeView, setActiveView] = useState<ActiveView>("main");
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [showSuccess, setShowSuccess] = useState<boolean>(false);
	const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
	const [eventToDelete, setEventToDelete] = useState<Id<"events"> | null>(null);
	const [isDeleting, setIsDeleting] = useState<boolean>(false);
	const [imageUploadError, setImageUploadError] = useState<string | null>(null);

	// Edit profile form
	const [profileForm, setProfileForm] = useState<ProfileForm>({
		firstName: "",
		lastName: "",
	});

	// Edit preferences form
	const [preferencesForm, setPreferencesForm] = useState<PreferencesForm>({
		intents: [],
		activities: [],
		comfortPreference: "",
		availability: [],
		personalityType: "",
	});

	// Queries
	const currentUser = useQuery(
		api.users.getByWorkosId,
		user?.id ? { workosId: user.id } : "skip",
	) as CurrentUser | undefined | null;

	const userStats = useQuery(
		api.users.getUserStats,
		user?.id ? { workosId: user.id } : "skip",
	) as UserStats | undefined | null;

	const userEvents = useQuery(
		api.events.getUserEventsWithDetails,
		user?.id ? { userId: user.id } : "skip",
	) as UserEvent[] | undefined | null;

	// Mutations
	const updateProfile = useMutation(api.users.updateProfile);
	const updatePreferences = useMutation(api.users.updatePreferences);
	const generateUploadUrl = useMutation(api.files.generateUploadUrl);
	const updateProfileImage = useMutation(api.users.updateProfileImage);
	const removeProfileImage = useMutation(api.users.removeProfileImage);
	const deleteEvent = useMutation(api.events.deleteEvent);

	// Query for uploaded profile image URL
	const profileImageUrl = useQuery(
		api.files.getImageUrl,
		currentUser?.profileImageId
			? { storageId: currentUser.profileImageId }
			: "skip",
	) as string | undefined | null;

	// Initialize forms when user data loads
	useEffect(() => {
		if (currentUser) {
			setProfileForm({
				firstName: currentUser.firstName || "",
				lastName: currentUser.lastName || "",
			});
			setPreferencesForm({
				intents: currentUser.intents || [],
				activities: currentUser.activities || [],
				comfortPreference: currentUser.comfortPreference || "",
				availability: currentUser.availability || [],
				personalityType: currentUser.personalityType || "ambivert",
			});
		}
	}, [currentUser]);

	const handleSignOut = (): void => {
		window.location.href = "/api/auth/signout";
	};

	const handleSaveProfile = async (): Promise<void> => {
		if (!user?.id || !profileForm.firstName.trim()) return;

		setIsSaving(true);
		try {
			await updateProfile({
				workosId: user.id,
				firstName: profileForm.firstName.trim(),
				lastName: profileForm.lastName.trim() || undefined,
			});
			setShowSuccess(true);
			setTimeout(() => {
				setShowSuccess(false);
				setActiveView("main");
			}, 1500);
		} catch (error) {
			console.error("Failed to update profile:", error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleSavePreferences = async (): Promise<void> => {
		if (!user?.id) return;

		setIsSaving(true);
		try {
			await updatePreferences({
				workosId: user.id,
				intents: preferencesForm.intents,
				activities: preferencesForm.activities,
				comfortPreference: preferencesForm.comfortPreference,
				availability: preferencesForm.availability,
				personalityType: preferencesForm.personalityType,
			});
			setShowSuccess(true);
			setTimeout(() => {
				setShowSuccess(false);
				setActiveView("main");
			}, 1500);
		} catch (error) {
			console.error("Failed to update preferences:", error);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle profile image upload
	const handleImageUpload = async (
		e: ChangeEvent<HTMLInputElement>,
	): Promise<void> => {
		const file = e.target.files?.[0];
		if (!file || !user?.id) return;

		// Clear any previous error
		setImageUploadError(null);

		// Validate file type
		if (!file.type.startsWith("image/")) {
			setImageUploadError("Please select an image file");
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			setImageUploadError("Image must be less than 5MB");
			return;
		}

		setIsUploadingImage(true);
		try {
			// Get upload URL from Convex
			const uploadUrl = await generateUploadUrl();

			// Upload the file
			const result = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});

			const { storageId } = await result.json();

			// Save the storage ID to the user record
			await updateProfileImage({
				workosId: user.id,
				profileImageId: storageId,
			});

			console.log("Profile image uploaded successfully");
		} catch (error) {
			console.error("Failed to upload profile image:", error);
			setImageUploadError("Failed to upload image. Please try again.");
		} finally {
			setIsUploadingImage(false);
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	// Handle remove profile image
	const handleRemoveImage = async (): Promise<void> => {
		if (!user?.id || !currentUser?.profileImageId) return;

		setIsUploadingImage(true);
		try {
			await removeProfileImage({ workosId: user.id });
			console.log("Profile image removed successfully");
		} catch (error) {
			console.error("Failed to remove profile image:", error);
		} finally {
			setIsUploadingImage(false);
		}
	};

	const getInitial = (name: string | null | undefined): string => {
		return name?.charAt(0)?.toUpperCase() || "?";
	};

	const formatDate = (timestamp: number): string => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	};

	const formatEventDateTime = (timestamp: number): string => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	const handleDeleteEvent = async (): Promise<void> => {
		if (!eventToDelete || !user?.id) return;

		setIsDeleting(true);
		try {
			const result = await deleteEvent({
				eventId: eventToDelete,
				userId: user.id,
			});
			if (result.success) {
				setEventToDelete(null);
			} else {
				console.error("Failed to delete event:", result.message);
			}
		} catch (error) {
			console.error("Failed to delete event:", error);
		} finally {
			setIsDeleting(false);
		}
	};

	// Render chip for preferences
	const renderChip = (
		option: Option,
		isSelected: boolean,
		onClick: () => void,
		small: boolean = false,
	): React.ReactElement => (
		<button
			type="button"
			key={option.id}
			onClick={onClick}
			className={`flex items-center gap-2 ${small ? "px-3 py-2" : "px-4 py-3"} rounded-xl border transition-all duration-200 touch-manipulation ${
				isSelected
					? "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/50"
					: "bg-white/5 border-white/10 hover:border-white/20"
			}`}
		>
			{option.icon && (
				<span className={small ? "text-lg" : "text-xl"}>{option.icon}</span>
			)}
			<span className={`font-medium ${small ? "text-sm" : ""}`}>
				{option.label}
			</span>
			{isSelected && <span className="ml-auto text-purple-400 text-sm">✓</span>}
		</button>
	);

	// Main profile view
	const renderMainView = (): React.ReactElement => (
		<div className="space-y-6">
			{/* Profile Header */}
			<div className="relative">
				<div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-3xl blur-xl" />
				<div className="relative p-6 rounded-3xl bg-[#1e1e2e] border border-white/10">
					<div className="flex items-center gap-4">
						{/* Avatar with upload button */}
						<div className="relative group">
							<div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
								{isUploadingImage ? (
									<div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : profileImageUrl ? (
									<img
										src={profileImageUrl}
										alt=""
										className="w-full h-full rounded-full object-cover"
									/>
								) : currentUser?.profileImageUrl ? (
									<img
										src={currentUser.profileImageUrl}
										alt=""
										className="w-full h-full rounded-full object-cover"
									/>
								) : (
									getInitial(currentUser?.firstName || user?.firstName)
								)}
							</div>

							{/* Camera overlay button */}
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={isUploadingImage}
								className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg border-2 border-[#1e1e2e] hover:scale-110 transition-transform touch-manipulation"
							>
								<svg
									className="w-3.5 h-3.5 text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							</button>

							{/* Hidden file input */}
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={handleImageUpload}
								className="hidden"
							/>
						</div>

						{/* Info */}
						<div className="flex-1">
							<h1 className="text-xl font-bold text-white">
								{currentUser?.firstName || user?.firstName}{" "}
								{currentUser?.lastName || user?.lastName}
							</h1>
							<p className="text-gray-400 text-sm">
								{currentUser?.email || user?.email}
							</p>
							{currentUser?.createdAt && (
								<p className="text-gray-500 text-xs mt-1">
									Joined {formatDate(currentUser.createdAt)}
								</p>
							)}
						</div>
					</div>

					{/* Stats */}
					{userStats && (
						<div className="flex items-center justify-around mt-6 pt-6 border-t border-white/10">
							<div className="text-center">
								<p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
									{userStats.connections}
								</p>
								<p className="text-gray-500 text-xs mt-1">Connections</p>
							</div>
							<div className="text-center">
								<p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
									{userStats.eventsCreated}
								</p>
								<p className="text-gray-500 text-xs mt-1">Events</p>
							</div>
							<div className="text-center">
								<p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
									{userStats.communitiesJoined}
								</p>
								<p className="text-gray-500 text-xs mt-1">Communities</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Current Preferences Summary */}
			{currentUser?.hasCompletedPreferences && (
				<div className="p-5 rounded-2xl bg-[#1e1e2e] border border-white/10">
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-semibold text-white">Your Preferences</h2>
						<button
							type="button"
							onClick={() => setActiveView("editPreferences")}
							className="text-sm text-purple-400 hover:text-purple-300 transition-colors touch-manipulation"
						>
							Edit
						</button>
					</div>

					<div className="space-y-4">
						{/* Intents */}
						{currentUser.intents && currentUser.intents.length > 0 && (
							<div>
								<p className="text-xs text-gray-500 mb-2">Looking for</p>
								<div className="flex flex-wrap gap-2">
									{currentUser.intents.map((id) => {
										const option = intentOptions.find((o) => o.id === id);
										return option ? (
											<span
												key={id}
												className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs"
											>
												{option.icon} {option.label}
											</span>
										) : null;
									})}
								</div>
							</div>
						)}

						{/* Activities */}
						{currentUser.activities && currentUser.activities.length > 0 && (
							<div>
								<p className="text-xs text-gray-500 mb-2">Activities</p>
								<div className="flex flex-wrap gap-2">
									{currentUser.activities.map((id) => {
										const option = activityOptions.find((o) => o.id === id);
										return option ? (
											<span
												key={id}
												className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs"
											>
												{option.icon} {option.label}
											</span>
										) : null;
									})}
								</div>
							</div>
						)}

						{/* Comfort & Personality */}
						<div className="flex flex-wrap gap-2">
							{currentUser.comfortPreference && (
								<span className="px-2 py-1 rounded-lg bg-pink-500/20 text-pink-300 text-xs">
									{
										comfortOptions.find(
											(o) => o.id === currentUser.comfortPreference,
										)?.icon
									}{" "}
									{
										comfortOptions.find(
											(o) => o.id === currentUser.comfortPreference,
										)?.label
									}
								</span>
							)}
							{currentUser.personalityType && (
								<span className="px-2 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-white text-xs capitalize">
									{currentUser.personalityType}
								</span>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Menu Items */}
			<div className="space-y-2">
				<button
					type="button"
					onClick={() => setActiveView("myEvents")}
					className="w-full p-4 rounded-2xl bg-[#1e1e2e] border border-white/10 flex items-center gap-4 hover:bg-[#252536] transition-colors text-left touch-manipulation"
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
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<div className="flex-1">
						<p className="font-medium text-white">My Events</p>
						<p className="text-sm text-gray-500">
							View and manage your created events
						</p>
					</div>
					<div className="flex items-center gap-2">
						{userEvents && userEvents.length > 0 && (
							<span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
								{userEvents.length}
							</span>
						)}
						<svg
							className="w-5 h-5 text-gray-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</div>
				</button>

				<button
					type="button"
					onClick={() => setActiveView("editProfile")}
					className="w-full p-4 rounded-2xl bg-[#1e1e2e] border border-white/10 flex items-center gap-4 hover:bg-[#252536] transition-colors text-left touch-manipulation"
				>
					<div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
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
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>
					<div className="flex-1">
						<p className="font-medium text-white">Edit Profile</p>
						<p className="text-sm text-gray-500">
							Update your name and details
						</p>
					</div>
					<svg
						className="w-5 h-5 text-gray-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>

				<button
					type="button"
					onClick={() => setActiveView("editPreferences")}
					className="w-full p-4 rounded-2xl bg-[#1e1e2e] border border-white/10 flex items-center gap-4 hover:bg-[#252536] transition-colors text-left touch-manipulation"
				>
					<div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-cyan-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
							/>
						</svg>
					</div>
					<div className="flex-1">
						<p className="font-medium text-white">Edit Preferences</p>
						<p className="text-sm text-gray-500">
							Change your interests and comfort level
						</p>
					</div>
					<svg
						className="w-5 h-5 text-gray-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>

				<button
					type="button"
					onClick={() => router.push("/help")}
					className="w-full p-4 rounded-2xl bg-[#1e1e2e] border border-white/10 flex items-center gap-4 hover:bg-[#252536] transition-colors text-left touch-manipulation"
				>
					<div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-blue-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div className="flex-1">
						<p className="font-medium text-white">Help & Support</p>
						<p className="text-sm text-gray-500">Get help or send feedback</p>
					</div>
					<svg
						className="w-5 h-5 text-gray-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>

				<button
					type="button"
					onClick={handleSignOut}
					className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 hover:bg-red-500/20 transition-colors text-left mt-4 touch-manipulation"
				>
					<div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-red-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
					</div>
					<div className="flex-1">
						<p className="font-medium text-red-400">Sign Out</p>
						<p className="text-sm text-red-400/60">Log out of your account</p>
					</div>
				</button>
			</div>
		</div>
	);

	// Edit profile view
	const renderEditProfileView = (): React.ReactElement => (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => setActiveView("main")}
					className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors touch-manipulation"
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
				<h1 className="text-xl font-bold text-white">Edit Profile</h1>
			</div>

			{showSuccess ? (
				<div className="py-16 text-center">
					<div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
						<svg
							className="w-10 h-10 text-green-400"
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
					</div>
					<h3 className="text-xl font-semibold text-white">Profile Updated!</h3>
				</div>
			) : (
				<>
					{/* Avatar with upload */}
					<div className="flex justify-center">
						<div className="relative">
							<div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
								{isUploadingImage ? (
									<div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : profileImageUrl ? (
									<img
										src={profileImageUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : currentUser?.profileImageUrl ? (
									<img
										src={currentUser.profileImageUrl}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									getInitial(profileForm.firstName || currentUser?.firstName)
								)}
							</div>

							{/* Camera overlay button */}
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={isUploadingImage}
								className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg border-2 border-[#161621] hover:scale-110 transition-transform touch-manipulation"
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
										d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							</button>

							{/* Hidden file input - reuses the same ref */}
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={handleImageUpload}
								className="hidden"
							/>
						</div>
					</div>

					{/* Remove image button */}
					{(profileImageUrl || currentUser?.profileImageId) && (
						<div className="flex justify-center">
							<button
								type="button"
								onClick={handleRemoveImage}
								disabled={isUploadingImage}
								className="text-sm text-red-400 hover:text-red-300 transition-colors touch-manipulation"
							>
								Remove photo
							</button>
						</div>
					)}

					{/* Image upload error message */}
					{imageUploadError && (
						<p className="text-sm text-red-400 text-center">{imageUploadError}</p>
					)}

					{/* Form */}
					<div className="space-y-4">
						<div>
							<label
								htmlFor="profile-first-name"
								className="block text-sm font-medium text-gray-300 mb-2"
							>
								First Name
							</label>
							<input
								id="profile-first-name"
								type="text"
								value={profileForm.firstName}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									setProfileForm({ ...profileForm, firstName: e.target.value })
								}
								placeholder="Enter your first name"
								className="w-full px-4 py-3 rounded-xl bg-[#1e1e2e] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
							/>
						</div>

						<div>
							<label
								htmlFor="profile-last-name"
								className="block text-sm font-medium text-gray-300 mb-2"
							>
								Last Name
							</label>
							<input
								id="profile-last-name"
								type="text"
								value={profileForm.lastName}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									setProfileForm({ ...profileForm, lastName: e.target.value })
								}
								placeholder="Enter your last name"
								className="w-full px-4 py-3 rounded-xl bg-[#1e1e2e] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
							/>
						</div>

						<div>
							<label
								htmlFor="profile-email"
								className="block text-sm font-medium text-gray-300 mb-2"
							>
								Email
							</label>
							<input
								id="profile-email"
								type="email"
								value={currentUser?.email || user?.email || ""}
								disabled
								className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Email is managed by your login provider
							</p>
						</div>
					</div>

					{/* Save Button */}
					<button
						type="button"
						onClick={handleSaveProfile}
						disabled={!profileForm.firstName.trim() || isSaving}
						className={`w-full py-3.5 rounded-xl font-medium transition-all duration-200 touch-manipulation ${
							profileForm.firstName.trim() && !isSaving
								? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
								: "bg-white/10 text-gray-500 cursor-not-allowed"
						}`}
					>
						{isSaving ? (
							<span className="flex items-center justify-center gap-2">
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Saving...
							</span>
						) : (
							"Save Changes"
						)}
					</button>
				</>
			)}
		</div>
	);

	// Edit preferences view
	const renderEditPreferencesView = (): React.ReactElement => (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => setActiveView("main")}
					className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors touch-manipulation"
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
				<h1 className="text-xl font-bold text-white">Edit Preferences</h1>
			</div>

			{showSuccess ? (
				<div className="py-16 text-center">
					<div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
						<svg
							className="w-10 h-10 text-green-400"
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
					</div>
					<h3 className="text-xl font-semibold text-white">
						Preferences Updated!
					</h3>
					<p className="text-gray-400 text-sm mt-2">
						Your feed will now show more relevant content
					</p>
				</div>
			) : (
				<>
					{/* Intents */}
					<div>
						<h2 className="text-sm font-medium text-gray-300 mb-3">
							What are you here for?
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{intentOptions.map((option) =>
								renderChip(
									option,
									preferencesForm.intents.includes(option.id),
									() => {
										const newIntents = preferencesForm.intents.includes(
											option.id,
										)
											? preferencesForm.intents.filter((i) => i !== option.id)
											: [...preferencesForm.intents, option.id];
										setPreferencesForm({
											...preferencesForm,
											intents: newIntents,
										});
									},
									true,
								),
							)}
						</div>
					</div>

					{/* Activities */}
					<div>
						<h2 className="text-sm font-medium text-gray-300 mb-3">
							Activities you enjoy
						</h2>
						<div className="grid grid-cols-2 gap-2">
							{activityOptions.map((option) =>
								renderChip(
									option,
									preferencesForm.activities.includes(option.id),
									() => {
										const newActivities = preferencesForm.activities.includes(
											option.id,
										)
											? preferencesForm.activities.filter(
													(a) => a !== option.id,
												)
											: [...preferencesForm.activities, option.id];
										setPreferencesForm({
											...preferencesForm,
											activities: newActivities,
										});
									},
									true,
								),
							)}
						</div>
					</div>

					{/* Comfort Preference */}
					<div>
						<h2 className="text-sm font-medium text-gray-300 mb-3">
							How do you prefer to connect?
						</h2>
						<div className="grid grid-cols-1 gap-2">
							{comfortOptions.map((option) =>
								renderChip(
									option,
									preferencesForm.comfortPreference === option.id,
									() =>
										setPreferencesForm({
											...preferencesForm,
											comfortPreference: option.id,
										}),
									true,
								),
							)}
						</div>
					</div>

					{/* Availability */}
					<div>
						<h2 className="text-sm font-medium text-gray-300 mb-3">
							When are you available?
						</h2>
						<div className="grid grid-cols-2 gap-2">
							{availabilityOptions.map((option) =>
								renderChip(
									option,
									preferencesForm.availability.includes(option.id),
									() => {
										const newAvailability =
											preferencesForm.availability.includes(option.id)
												? preferencesForm.availability.filter(
														(a) => a !== option.id,
													)
												: [...preferencesForm.availability, option.id];
										setPreferencesForm({
											...preferencesForm,
											availability: newAvailability,
										});
									},
									true,
								),
							)}
						</div>
					</div>

					{/* Personality Type */}
					<div>
						<h2 className="text-sm font-medium text-gray-300 mb-3">
							How would you describe yourself?
						</h2>
						<div className="flex items-center justify-center gap-1 p-1 bg-white/5 rounded-xl">
							{personalityOptions.map((option) => (
								<button
									type="button"
									key={option.id}
									onClick={() =>
										setPreferencesForm({
											...preferencesForm,
											personalityType: option.id,
										})
									}
									className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 touch-manipulation ${
										preferencesForm.personalityType === option.id
											? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
											: "text-gray-400 hover:text-white"
									}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>

					{/* Save Button */}
					<button
						type="button"
						onClick={handleSavePreferences}
						disabled={isSaving}
						className={`w-full py-3.5 rounded-xl font-medium transition-all duration-200 touch-manipulation ${
							!isSaving
								? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
								: "bg-white/10 text-gray-500 cursor-not-allowed"
						}`}
					>
						{isSaving ? (
							<span className="flex items-center justify-center gap-2">
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Saving...
							</span>
						) : (
							"Save Preferences"
						)}
					</button>
				</>
			)}
		</div>
	);

	// My Events view
	const renderMyEventsView = (): React.ReactElement => (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => setActiveView("main")}
					className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors touch-manipulation"
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
				<h1 className="text-xl font-bold text-white">My Events</h1>
			</div>

			{/* Events List */}
			{userEvents === undefined ? (
				<div className="flex items-center justify-center py-16">
					<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
				</div>
			) : userEvents === null || userEvents.length === 0 ? (
				<div className="py-16 text-center">
					<div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
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
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<h3 className="text-xl font-semibold text-white mb-2">
						No events yet
					</h3>
					<p className="text-gray-400 text-sm">
						Create your first event to connect with others
					</p>
					<button
						type="button"
						onClick={() => router.push("/home")}
						className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all touch-manipulation"
					>
						Create Event
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{userEvents.map((event) => {
						const isEnded = !event.isLive;
						return (
							<div
								key={event._id}
								className={`p-4 rounded-2xl bg-[#1e1e2e] border transition-all ${
									isEnded
										? "border-white/5 opacity-60"
										: "border-white/10 hover:border-white/20"
								}`}
							>
								<div className="flex gap-4">
									{/* Event Image */}
									<div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex-shrink-0 overflow-hidden">
										{event.imageUrl ? (
											<img
												src={event.imageUrl}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center text-3xl">
												{activityOptions.find((a) => a.id === event.activity)
													?.icon || ""}
											</div>
										)}
									</div>

									{/* Event Info */}
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-2">
											<h3 className="font-semibold text-white truncate">
												{event.title}
											</h3>
											<span
												className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
													isEnded
														? "bg-gray-500/20 text-gray-400"
														: "bg-green-500/20 text-green-400"
												}`}
											>
												{isEnded ? "Ended" : "Live"}
											</span>
										</div>

										<p className="text-sm text-gray-400 mt-1">
											{activityOptions.find((a) => a.id === event.activity)
												?.label || event.activity}
										</p>

										<p className="text-xs text-gray-500 mt-1">
											{formatEventDateTime(event.dateTime)}
										</p>

										<div className="flex items-center gap-3 mt-2">
											<span className="text-xs text-gray-400">
												{event.goingCount} going
												{event.spotsLeft !== null && (
													<>
														{" "}
														&bull;{" "}
														{event.spotsLeft > 0
															? `${event.spotsLeft} spots left`
															: "Full"}
													</>
												)}
											</span>
										</div>
									</div>
								</div>

								{/* Delete Button */}
								<div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
									<button
										type="button"
										onClick={() => setEventToDelete(event._id)}
										className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors touch-manipulation"
									>
										Delete Event
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);

	return (
		<div className="min-h-screen bg-[#161621] text-white">
			<Navbar />

			<main className="max-w-2xl mx-auto px-4 pt-20 pb-24">
				{currentUser === undefined ? (
					<div className="flex items-center justify-center py-20">
						<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
					</div>
				) : (
					<>
						{activeView === "main" && renderMainView()}
						{activeView === "editProfile" && renderEditProfileView()}
						{activeView === "editPreferences" && renderEditPreferencesView()}
						{activeView === "myEvents" && renderMyEventsView()}
					</>
				)}
			</main>

			{activeView === "main" && <BottomNav />}

			{/* Delete Event Confirmation Modal */}
			{eventToDelete && (
				<div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
					{/* Backdrop */}
					<button
						type="button"
						onClick={() => !isDeleting && setEventToDelete(null)}
						className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto touch-manipulation"
						aria-label="Close modal"
					/>

					{/* Modal Content */}
					<div className="relative w-[90%] max-w-sm mx-auto p-6 rounded-2xl bg-[#1e1e2e] border border-white/10 shadow-2xl pointer-events-auto">
						{/* Warning Icon */}
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
							<svg
								className="w-8 h-8 text-red-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</div>

						<h3 className="text-xl font-semibold text-white text-center mb-2">
							Delete Event?
						</h3>
						<p className="text-gray-400 text-sm text-center mb-6">
							This will permanently delete this event and all associated data
							including the group chat. This action cannot be undone.
						</p>

						{/* Action Buttons */}
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => setEventToDelete(null)}
								disabled={isDeleting}
								className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors touch-manipulation disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDeleteEvent}
								disabled={isDeleting}
								className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors touch-manipulation disabled:opacity-50"
							>
								{isDeleting ? (
									<span className="flex items-center justify-center gap-2">
										<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										Deleting...
									</span>
								) : (
									"Delete"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
