import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a URL for uploading a file to Convex storage
export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

// Get the public URL for a stored file
export const getImageUrl = query({
	args: { storageId: v.id("_storage") },
	handler: async (ctx, args) => {
		return await ctx.storage.getUrl(args.storageId);
	},
});

// Delete an image from storage
export const deleteImage = mutation({
	args: { storageId: v.id("_storage") },
	handler: async (ctx, args) => {
		await ctx.storage.delete(args.storageId);
		return { success: true };
	},
});
