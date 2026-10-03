import type { Doc } from "./_generated/dataModel";

type User = Pick<
	Doc<"users">,
	"workosId" | "intents" | "activities" | "availability"
>;

type ActivitySearch = Pick<
	Doc<"activitySearches">,
	"userId" | "activityType" | "preferences"
>;

const activityPreferenceMap: Record<string, string[]> = {
	roommate: ["activities"],
	travel_mate: ["travel"],
	date: ["friends"],
	turf_partner: ["activities"],
	dinner_partner: ["activities", "food"],
	cofounder: ["business"],
	study_partner: ["study"],
	work_partner: ["work"],
	coffee_buddy: ["coffee"],
	movie_buddy: ["movies"],
	gym_partner: ["activities"],
	gaming_buddy: ["activities"],
};

const hasActivityPreference = (user: User, activityType: string): boolean => {
	const requiredPreferences = activityPreferenceMap[activityType];
	if (!requiredPreferences) return true;

	const selectedPreferences = [
		...(user.activities ?? []),
		...(user.intents ?? []),
	];

	return requiredPreferences.some((preference) =>
		selectedPreferences.includes(preference),
	);
};

const hasAvailabilityOverlap = (first: User, second: User): boolean => {
	if (!first.availability?.length || !second.availability?.length) return true;
	return first.availability.some((time) => second.availability?.includes(time));
};

const haveSearchPreferenceOverlap = (
	first: ActivitySearch,
	second: ActivitySearch,
): boolean => {
	if (!first.preferences || !second.preferences) return true;

	const firstPreferences = first.preferences as Record<string, unknown>;
	const secondPreferences = second.preferences as Record<string, unknown>;

	return Object.keys(firstPreferences).every((key) => {
		if (!(key in secondPreferences)) return true;
		const firstValue = firstPreferences[key];
		const secondValue = secondPreferences[key];
		return (
			firstValue === secondValue ||
			firstValue === "flexible" ||
			secondValue === "flexible" ||
			firstValue === "doesnt-matter" ||
			secondValue === "doesnt-matter"
		);
	});
};

export const usersAreCompatible = (
	sender: User,
	receiver: User,
	search: ActivitySearch,
	receiverSearch?: ActivitySearch,
): boolean => {
	if (sender.workosId === receiver.workosId) return false;
	if (!hasActivityPreference(sender, search.activityType)) return false;
	if (!hasActivityPreference(receiver, search.activityType)) return false;
	if (!hasAvailabilityOverlap(sender, receiver)) return false;
	if (receiverSearch && !haveSearchPreferenceOverlap(search, receiverSearch)) {
		return false;
	}

	return true;
};

export const searchMatchesUser = (
	search: ActivitySearch,
	user: User,
): boolean => {
	if (search.userId === user.workosId) return false;
	return hasActivityPreference(user, search.activityType);
};