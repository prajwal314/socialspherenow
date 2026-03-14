"use client";

import { useMutation, useQuery } from "convex/react";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Community categories matching the backend
const COMMUNITY_CATEGORIES = [
	{ id: "music", label: "Music", icon: "🎵" },
	{ id: "art", label: "Art & Design", icon: "🎨" },
	{ id: "gaming", label: "Gaming", icon: "🎮" },
	{ id: "coding", label: "Coding & Tech", icon: "💻" },
	{ id: "photography", label: "Photography", icon: "📷" },
	{ id: "fitness", label: "Fitness & Health", icon: "💪" },
	{ id: "travel", label: "Travel", icon: "✈️" },
	{ id: "food", label: "Food & Cooking", icon: "🍳" },
	{ id: "books", label: "Books & Reading", icon: "📚" },
	{ id: "movies", label: "Movies & TV", icon: "🎬" },
	{ id: "sports", label: "Sports", icon: "⚽" },
	{ id: "business", label: "Business & Startups", icon: "🚀" },
	{ id: "language", label: "Language Learning", icon: "🗣️" },
	{ id: "pets", label: "Pets & Animals", icon: "🐾" },
	{ id: "crafts", label: "DIY & Crafts", icon: "🛠️" },
	{ id: "science", label: "Science", icon: "🔬" },
	{ id: "fashion", label: "Fashion & Style", icon: "👗" },
	{ id: "anime", label: "Anime & Manga", icon: "🎌" },
	{ id: "other", label: "Other", icon: "✨" },
];

const MAX_COMMUNITIES = 3;

interface CreateCommunityModalProps {
	isOpen: boolean;
	onClose: () => void;
	userId?: string;
}

export default function CreateCommunityModal({
	isOpen,
	onClose,
	userId,
}: CreateCommunityModalProps) {
	const [step, setStep] = useState(1); // 1: category, 2: details
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState("");
	const imageInputRef = useRef<HTMLInputElement>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);

	const [form, setForm] = useState({
		name: "",
		description: "",
		category: "",
		customCategory: "",
	});

	// Queries
	const createdCount = useQuery(
		api.communities.getUserCreatedCommunitiesCount,
		userId ? { userId } : "skip",
	);

	// Mutations
	const createCommunity = useMutation(api.communities.createCommunity);
	const generateUploadUrl = useMutation(api.files.generateUploadUrl);

	const canCreateMore =
		createdCount !== undefined && createdCount < MAX_COMMUNITIES;
	const remainingSlots = MAX_COMMUNITIES - (createdCount ?? 0);

	const handleCategorySelect = (categoryId: string) => {
		setForm({ ...form, category: categoryId });
		if (categoryId !== "other") {
			setForm({ ...form, category: categoryId, customCategory: "" });
		}
	};

	const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setError("Please select an image file");
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			setError("Image must be less than 5MB");
			return;
		}

		setImageFile(file);
		setImagePreview(URL.createObjectURL(file));
		setError("");
	};

	const handleRemoveImage = () => {
		setImageFile(null);
		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
			setImagePreview(null);
		}
		if (imageInputRef.current) {
			imageInputRef.current.value = "";
		}
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!userId || !canCreateMore) return;

		setIsCreating(true);
		setError("");

		try {
			let imageId: Id<"_storage"> | undefined;

			// Upload image if selected
			if (imageFile) {
				const uploadUrl = await generateUploadUrl();
				const result = await fetch(uploadUrl, {
					method: "POST",
					headers: { "Content-Type": imageFile.type },
					body: imageFile,
				});
				const { storageId } = await result.json();
				imageId = storageId;
			}

			await createCommunity({
				name: form.name,
				description: form.description,
				category: form.category,
				customCategory:
					form.category === "other" ? form.customCategory : undefined,
				imageId,
				creatorId: userId,
			});

			// Reset form and close
			resetForm();
			onClose();
		} catch (err) {
			console.error("Failed to create community:", err);
			setError(
				err instanceof Error ? err.message : "Failed to create community",
			);
		} finally {
			setIsCreating(false);
		}
	};

	const resetForm = () => {
		setForm({ name: "", description: "", category: "", customCategory: "" });
		setStep(1);
		setError("");
		handleRemoveImage();
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const isStep1Valid =
		form.category && (form.category !== "other" || form.customCategory.trim());
	const isStep2Valid = form.name.trim() && form.description.trim();

	if (!isOpen) return null;

	return (
		<>
			<button
				type="button"
				aria-label="Close create community modal"
				className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm touch-manipulation"
				onClick={handleClose}
			/>
			<div className="fixed inset-0 z-[61] overflow-y-auto pointer-events-none">
				<div className="min-h-full flex items-center justify-center p-4 py-8">
					<div className="w-full max-w-lg rounded-3xl bg-[#1e1e2e] border border-white/10 shadow-2xl pointer-events-auto">
						{/* Header */}
						<div className="px-6 py-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1e1e2e] rounded-t-3xl z-10">
							<div>
								<h3 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
									Create Community
								</h3>
								<p className="text-sm text-gray-500 mt-1">Step {step} of 2</p>
							</div>
							<button
								type="button"
								onClick={handleClose}
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

						{/* Limit Warning */}
						{!canCreateMore && (
							<div className="px-6 py-4 bg-red-500/10 border-b border-red-500/20">
								<p className="text-red-400 text-sm">
									You have reached the maximum limit of {MAX_COMMUNITIES}{" "}
									communities. You cannot create more.
								</p>
							</div>
						)}

						{canCreateMore && remainingSlots <= 2 && (
							<div className="px-6 py-3 bg-orange-500/10 border-b border-orange-500/20">
								<p className="text-orange-400 text-sm">
									You can create {remainingSlots} more{" "}
									{remainingSlots === 1 ? "community" : "communities"}.
								</p>
							</div>
						)}

						{/* Body */}
						<div className="p-6">
							{error && (
								<div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
									<p className="text-red-400 text-sm">{error}</p>
								</div>
							)}

							{step === 1 && (
								<div className="space-y-5">
									<div>
										<p className="block text-sm font-medium text-gray-300 mb-3">
											Choose a Category
										</p>
										<div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
											{COMMUNITY_CATEGORIES.map((cat) => (
												<button
													key={cat.id}
													type="button"
													onClick={() => handleCategorySelect(cat.id)}
													disabled={!canCreateMore}
													className={`p-3 rounded-xl border text-center transition-all ${
														form.category === cat.id
															? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/50"
															: "bg-white/5 border-white/10 hover:border-white/20"
													} ${!canCreateMore ? "opacity-50 cursor-not-allowed" : ""}`}
												>
													<span className="text-xl block mb-1">{cat.icon}</span>
													<span className="text-xs text-gray-300 line-clamp-1">
														{cat.label}
													</span>
												</button>
											))}
										</div>
									</div>

									{/* Custom Category Input */}
									{form.category === "other" && (
										<div>
											<label
												htmlFor="community-custom-category"
												className="block text-sm font-medium text-gray-300 mb-2"
											>
												Custom Category Name
											</label>
											<input
												id="community-custom-category"
												type="text"
												value={form.customCategory}
												onChange={(e) =>
													setForm({ ...form, customCategory: e.target.value })
												}
												placeholder="Enter your category..."
												className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
											/>
										</div>
									)}

									{/* Next Button */}
									<button
										type="button"
										onClick={() => setStep(2)}
										disabled={!isStep1Valid || !canCreateMore}
										className={`w-full py-3.5 rounded-xl font-medium transition-all duration-200 touch-manipulation ${
											isStep1Valid && canCreateMore
												? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]"
												: "bg-white/10 text-gray-500 cursor-not-allowed"
										}`}
									>
										Next
									</button>
								</div>
							)}

							{step === 2 && (
								<form onSubmit={handleSubmit} className="space-y-5">
									{/* Selected Category Display */}
									<div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
										<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-lg">
											{COMMUNITY_CATEGORIES.find((c) => c.id === form.category)
												?.icon || "✨"}
										</div>
										<div>
											<p className="text-sm text-gray-400">Category</p>
											<p className="text-white font-medium">
												{form.category === "other"
													? form.customCategory
													: COMMUNITY_CATEGORIES.find(
															(c) => c.id === form.category,
														)?.label}
											</p>
										</div>
										<button
											type="button"
											onClick={() => setStep(1)}
											className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-colors"
										>
											Change
										</button>
									</div>

									{/* Community Image */}
									<div>
										<label
											htmlFor="community-image"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											Community Image{" "}
											<span className="text-gray-500">(optional)</span>
										</label>
										{imagePreview ? (
											<div className="relative rounded-xl overflow-hidden">
												<img
													src={imagePreview}
													alt="Community preview"
													className="w-full h-36 object-cover"
												/>
												<button
													type="button"
													onClick={handleRemoveImage}
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
												onClick={() => imageInputRef.current?.click()}
												className="w-full h-28 rounded-xl border-2 border-dashed border-white/10 hover:border-cyan-500/30 flex flex-col items-center justify-center gap-2 transition-colors"
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
													Add community image
												</span>
											</button>
										)}
										<input
											id="community-image"
											ref={imageInputRef}
											type="file"
											accept="image/*"
											onChange={handleImageSelect}
											className="hidden"
										/>
									</div>

									{/* Community Name */}
									<div>
										<label
											htmlFor="community-name"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											Community Name
										</label>
										<input
											id="community-name"
											type="text"
											value={form.name}
											onChange={(e) =>
												setForm({ ...form, name: e.target.value })
											}
											placeholder="e.g., Photography Enthusiasts"
											className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
										/>
									</div>

									{/* Description */}
									<div>
										<label
											htmlFor="community-description"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											Description
										</label>
										<textarea
											id="community-description"
											value={form.description}
											onChange={(e) =>
												setForm({ ...form, description: e.target.value })
											}
											placeholder="What is your community about?"
											rows={3}
											className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
										/>
									</div>

									{/* Buttons */}
									<div className="flex gap-3">
										<button
											type="button"
											onClick={() => setStep(1)}
											className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-colors touch-manipulation active:scale-[0.98]"
										>
											Back
										</button>
										<button
											type="submit"
											disabled={!isStep2Valid || isCreating || !canCreateMore}
											className={`flex-1 py-3 rounded-xl font-medium transition-all duration-200 touch-manipulation ${
												isStep2Valid && !isCreating && canCreateMore
													? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]"
													: "bg-white/10 text-gray-500 cursor-not-allowed"
											}`}
										>
											{isCreating ? (
												<span className="flex items-center justify-center gap-2">
													<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
													Creating...
												</span>
											) : (
												"Create Community"
											)}
										</button>
									</div>
								</form>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
