import { useState } from 'react'
import { useAuth } from '@workos-inc/authkit-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'

// Predefined activities (platform-defined, not user-created)
const predefinedActivities = [
  {
    id: 'roommate',
    label: 'Find Roommate',
    icon: '🏠',
    description: 'Find someone to share living space with',
    gradient: 'from-orange-500 to-pink-500',
  },
  {
    id: 'travel_mate',
    label: 'Find Travel Mate',
    icon: '✈️',
    description: 'Find a companion for your next adventure',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'date',
    label: 'Find Date',
    icon: '💕',
    description: 'Meet someone special for a date',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    id: 'turf_partner',
    label: 'Find Turf Partner',
    icon: '⚽',
    description: 'Find players for sports activities',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    id: 'dinner_partner',
    label: 'Dinner Partner',
    icon: '🍽️',
    description: 'Find someone to dine with tonight',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: 'cofounder',
    label: 'Find Cofounder',
    icon: '🚀',
    description: 'Find a business partner for your startup',
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'study_partner',
    label: 'Study Partner',
    icon: '📚',
    description: 'Find someone to study or learn with',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'work_partner',
    label: 'Work Partner',
    icon: '💻',
    description: 'Find someone to co-work with',
    gradient: 'from-slate-500 to-zinc-500',
  },
  {
    id: 'coffee_buddy',
    label: 'Coffee Buddy',
    icon: '☕',
    description: 'Find someone for a casual coffee chat',
    gradient: 'from-amber-600 to-yellow-500',
  },
  {
    id: 'movie_buddy',
    label: 'Movie Buddy',
    icon: '🎬',
    description: 'Find someone to watch movies with',
    gradient: 'from-red-500 to-pink-500',
  },
  {
    id: 'gym_partner',
    label: 'Gym Partner',
    icon: '💪',
    description: 'Find a workout buddy',
    gradient: 'from-lime-500 to-green-500',
  },
  {
    id: 'gaming_buddy',
    label: 'Gaming Buddy',
    icon: '🎮',
    description: 'Find someone to game with',
    gradient: 'from-violet-500 to-purple-500',
  },
]

// Questions for the activity modal - activity-specific
const activityQuestions = {
  // 🏠 Find Roommate
  roommate: [
    {
      id: 'preferredLocation',
      label: 'Preferred location',
      type: 'single',
      options: [
        { id: 'same-area', label: 'Same area' },
        { id: 'nearby-area', label: 'Nearby area' },
        { id: 'anywhere-in-city', label: 'Anywhere in city' },
      ],
    },
    {
      id: 'budgetRange',
      label: 'Budget range (per person)',
      type: 'single',
      options: [
        { id: 'low', label: 'Low' },
        { id: 'medium', label: 'Medium' },
        { id: 'high', label: 'High' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'accommodationType',
      label: 'Accommodation type',
      type: 'single',
      options: [
        { id: 'flat', label: 'Flat' },
        { id: 'pg', label: 'PG' },
        { id: 'hostel', label: 'Hostel' },
        { id: 'shared-room', label: 'Shared room' },
      ],
    },
    {
      id: 'cleanlinessLevel',
      label: 'Cleanliness level',
      type: 'single',
      options: [
        { id: 'very-clean', label: 'Very clean' },
        { id: 'moderately-clean', label: 'Moderately clean' },
        { id: 'doesnt-matter', label: "Doesn't matter much" },
      ],
    },
    {
      id: 'sleepingSchedule',
      label: 'Sleeping schedule',
      type: 'single',
      options: [
        { id: 'early-sleeper', label: 'Early sleeper' },
        { id: 'late-night', label: 'Late night' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'lifestylePreference',
      label: 'Lifestyle preference',
      type: 'single',
      options: [
        { id: 'quiet', label: 'Quiet' },
        { id: 'balanced', label: 'Balanced' },
        { id: 'social', label: 'Social' },
      ],
    },
  ],

  // ✈️ Find Travel Mate
  travel_mate: [
    {
      id: 'tripType',
      label: 'Type of trip',
      type: 'single',
      options: [
        { id: 'leisure', label: 'Leisure' },
        { id: 'adventure', label: 'Adventure' },
        { id: 'budget-trip', label: 'Budget trip' },
        { id: 'luxury-trip', label: 'Luxury trip' },
      ],
    },
    {
      id: 'travelDuration',
      label: 'Travel duration',
      type: 'single',
      options: [
        { id: 'weekend', label: 'Weekend' },
        { id: '3-5-days', label: '3–5 days' },
        { id: '1-week-plus', label: '1 week+' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'budgetPreference',
      label: 'Budget preference',
      type: 'single',
      options: [
        { id: 'low', label: 'Low' },
        { id: 'medium', label: 'Medium' },
        { id: 'high', label: 'High' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'travelStyle',
      label: 'Travel style',
      type: 'single',
      options: [
        { id: 'planned', label: 'Planned' },
        { id: 'spontaneous', label: 'Spontaneous' },
        { id: 'balanced', label: 'Balanced' },
      ],
    },
    {
      id: 'companionType',
      label: 'Companion type',
      type: 'single',
      options: [
        { id: 'chill-calm', label: 'Chill & calm' },
        { id: 'fun-energetic', label: 'Fun & energetic' },
        { id: 'doesnt-matter', label: "Doesn't matter" },
      ],
    },
  ],

  // 💕 Find Date
  date: [
    {
      id: 'lookingFor',
      label: 'Looking for',
      type: 'single',
      options: [
        { id: 'casual-date', label: 'Casual date' },
        { id: 'serious-relationship', label: 'Serious relationship' },
        { id: 'meeting-new-people', label: 'Just meeting new people' },
      ],
    },
    {
      id: 'communicationStyle',
      label: 'Preferred communication style',
      type: 'single',
      options: [
        { id: 'slow-meaningful', label: 'Slow & meaningful' },
        { id: 'casual-chatting', label: 'Casual chatting' },
        { id: 'direct-honest', label: 'Direct & honest' },
      ],
    },
    {
      id: 'comfortLevel',
      label: 'Comfort level',
      type: 'single',
      options: [
        { id: '1-to-1-only', label: '1-to-1 only' },
        { id: 'start-with-chat', label: 'Start with chat' },
        { id: 'open-to-meeting', label: 'Open to meeting soon' },
      ],
    },
    {
      id: 'lifestylePreference',
      label: 'Lifestyle preference',
      type: 'single',
      options: [
        { id: 'quiet', label: 'Quiet' },
        { id: 'balanced', label: 'Balanced' },
        { id: 'social', label: 'Social' },
      ],
    },
    {
      id: 'agePreference',
      label: 'Age preference',
      type: 'single',
      options: [
        { id: 'similar-age', label: 'Similar age' },
        { id: 'slightly-older', label: 'Slightly older' },
        { id: 'slightly-younger', label: 'Slightly younger' },
        { id: 'doesnt-matter', label: "Doesn't matter" },
      ],
    },
  ],

  // ⚽ Find Turf Partner
  turf_partner: [
    {
      id: 'sportType',
      label: 'Sport type',
      type: 'single',
      options: [
        { id: 'football', label: 'Football' },
        { id: 'cricket', label: 'Cricket' },
        { id: 'badminton', label: 'Badminton' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'skillLevel',
      label: 'Skill level',
      type: 'single',
      options: [
        { id: 'beginner', label: 'Beginner' },
        { id: 'intermediate', label: 'Intermediate' },
        { id: 'advanced', label: 'Advanced' },
      ],
    },
    {
      id: 'playFrequency',
      label: 'Play frequency',
      type: 'single',
      options: [
        { id: 'occasionally', label: 'Occasionally' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'regularly', label: 'Regularly' },
      ],
    },
    {
      id: 'playStyle',
      label: 'Play style',
      type: 'single',
      options: [
        { id: 'casual-fun', label: 'Casual fun' },
        { id: 'competitive', label: 'Competitive' },
        { id: 'fitness-focused', label: 'Fitness focused' },
      ],
    },
    {
      id: 'groupSize',
      label: 'Preferred group size',
      type: 'single',
      options: [
        { id: '1-2-players', label: '1–2 players' },
        { id: 'small-group', label: 'Small group' },
        { id: 'full-team', label: 'Full team' },
      ],
    },
  ],

  // 🍽️ Dinner Partner
  dinner_partner: [
    {
      id: 'dinnerType',
      label: 'Dinner type',
      type: 'single',
      options: [
        { id: 'casual', label: 'Casual' },
        { id: 'fine-dining', label: 'Fine dining' },
        { id: 'street-food', label: 'Street food' },
        { id: 'home-style', label: 'Home-style' },
      ],
    },
    {
      id: 'timing',
      label: 'Timing',
      type: 'single',
      options: [
        { id: 'early-evening', label: 'Early evening' },
        { id: 'late-night', label: 'Late night' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'conversationStyle',
      label: 'Conversation style',
      type: 'single',
      options: [
        { id: 'light-fun', label: 'Light & fun' },
        { id: 'deep-talks', label: 'Deep talks' },
        { id: 'mostly-quiet', label: 'Mostly quiet' },
      ],
    },
    {
      id: 'comfortLevel',
      label: 'Comfort level',
      type: 'single',
      options: [
        { id: '1-to-1', label: '1-to-1' },
        { id: 'small-group', label: 'Small group' },
        { id: 'either', label: 'Either is fine' },
      ],
    },
    {
      id: 'foodPreference',
      label: 'Food preference',
      type: 'single',
      options: [
        { id: 'veg', label: 'Veg' },
        { id: 'non-veg', label: 'Non-veg' },
        { id: 'doesnt-matter', label: "Doesn't matter" },
      ],
    },
  ],

  // 🚀 Find Cofounder
  cofounder: [
    {
      id: 'lookingForRole',
      label: 'Looking for role',
      type: 'single',
      options: [
        { id: 'technical', label: 'Technical' },
        { id: 'marketing', label: 'Marketing' },
        { id: 'operations', label: 'Operations' },
        { id: 'finance', label: 'Finance' },
      ],
    },
    {
      id: 'startupStage',
      label: 'Startup stage',
      type: 'single',
      options: [
        { id: 'idea-stage', label: 'Idea stage' },
        { id: 'mvp-stage', label: 'MVP stage' },
        { id: 'growing-startup', label: 'Growing startup' },
      ],
    },
    {
      id: 'commitmentLevel',
      label: 'Commitment level',
      type: 'single',
      options: [
        { id: 'part-time', label: 'Part-time' },
        { id: 'full-time', label: 'Full-time' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'workStyle',
      label: 'Work style',
      type: 'single',
      options: [
        { id: 'structured', label: 'Structured' },
        { id: 'flexible', label: 'Flexible' },
        { id: 'fast-paced', label: 'Fast-paced' },
      ],
    },
    {
      id: 'riskTolerance',
      label: 'Risk tolerance',
      type: 'single',
      options: [
        { id: 'low', label: 'Low' },
        { id: 'medium', label: 'Medium' },
        { id: 'high', label: 'High' },
      ],
    },
    {
      id: 'longTermVision',
      label: 'Long-term vision',
      type: 'single',
      options: [
        { id: 'short-term-project', label: 'Short-term project' },
        { id: 'long-term-startup', label: 'Long-term startup' },
      ],
    },
  ],

  // 📚 Study Partner
  study_partner: [
    {
      id: 'studyPurpose',
      label: 'Study purpose',
      type: 'single',
      options: [
        { id: 'exam-preparation', label: 'Exam preparation' },
        { id: 'skill-learning', label: 'Skill learning' },
        { id: 'college-studies', label: 'College studies' },
      ],
    },
    {
      id: 'preferredSubjects',
      label: 'Preferred subjects',
      type: 'single',
      options: [
        { id: 'technical', label: 'Technical' },
        { id: 'theory-based', label: 'Theory-based' },
        { id: 'mixed', label: 'Mixed' },
      ],
    },
    {
      id: 'studyRoutine',
      label: 'Study routine',
      type: 'single',
      options: [
        { id: 'daily', label: 'Daily' },
        { id: 'few-times-a-week', label: 'Few times a week' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'studyStyle',
      label: 'Study style',
      type: 'single',
      options: [
        { id: 'silent-focus', label: 'Silent focus' },
        { id: 'discussion-based', label: 'Discussion-based' },
        { id: 'mixed', label: 'Mixed' },
      ],
    },
    {
      id: 'sessionDuration',
      label: 'Session duration',
      type: 'single',
      options: [
        { id: '1-2-hours', label: '1–2 hours' },
        { id: '2-4-hours', label: '2–4 hours' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
  ],

  // 💻 Work Partner (Co-working)
  work_partner: [
    {
      id: 'workType',
      label: 'Work type',
      type: 'single',
      options: [
        { id: 'freelance', label: 'Freelance' },
        { id: 'office-work', label: 'Office work' },
        { id: 'remote-work', label: 'Remote work' },
        { id: 'startup-work', label: 'Startup work' },
      ],
    },
    {
      id: 'workingHours',
      label: 'Working hours',
      type: 'single',
      options: [
        { id: 'morning', label: 'Morning' },
        { id: 'evening', label: 'Evening' },
        { id: 'night', label: 'Night' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'workStyle',
      label: 'Work style',
      type: 'single',
      options: [
        { id: 'silent-cowork', label: 'Silent co-work' },
        { id: 'occasional-discussion', label: 'Occasional discussion' },
        { id: 'collaborative', label: 'Collaborative' },
      ],
    },
    {
      id: 'sessionFrequency',
      label: 'Session frequency',
      type: 'single',
      options: [
        { id: 'one-time', label: 'One-time' },
        { id: 'regular', label: 'Regular' },
        { id: 'occasional', label: 'Occasional' },
      ],
    },
    {
      id: 'environmentPreference',
      label: 'Environment preference',
      type: 'single',
      options: [
        { id: 'cafe', label: 'Café' },
        { id: 'home', label: 'Home' },
        { id: 'coworking-space', label: 'Co-working space' },
      ],
    },
  ],

  // ☕ Coffee Buddy
  coffee_buddy: [
    {
      id: 'purpose',
      label: 'Purpose',
      type: 'single',
      options: [
        { id: 'casual-chat', label: 'Casual chat' },
        { id: 'networking', label: 'Networking' },
        { id: 'just-company', label: 'Just company' },
      ],
    },
    {
      id: 'conversationStyle',
      label: 'Conversation style',
      type: 'single',
      options: [
        { id: 'light-fun', label: 'Light & fun' },
        { id: 'deep-conversations', label: 'Deep conversations' },
        { id: 'mostly-listening', label: 'Mostly listening' },
      ],
    },
    {
      id: 'timing',
      label: 'Timing',
      type: 'single',
      options: [
        { id: 'morning', label: 'Morning' },
        { id: 'evening', label: 'Evening' },
        { id: 'anytime', label: 'Anytime' },
      ],
    },
    {
      id: 'comfortLevel',
      label: 'Comfort level',
      type: 'single',
      options: [
        { id: '1-to-1', label: '1-to-1' },
        { id: 'small-group', label: 'Small group' },
        { id: 'either', label: 'Either' },
      ],
    },
  ],

  // 🎬 Movie Buddy
  movie_buddy: [
    {
      id: 'moviePreference',
      label: 'Movie preference',
      type: 'single',
      options: [
        { id: 'hollywood', label: 'Hollywood' },
        { id: 'bollywood', label: 'Bollywood' },
        { id: 'regional', label: 'Regional' },
        { id: 'anime', label: 'Anime' },
      ],
    },
    {
      id: 'genrePreference',
      label: 'Genre preference',
      type: 'single',
      options: [
        { id: 'action', label: 'Action' },
        { id: 'romance', label: 'Romance' },
        { id: 'comedy', label: 'Comedy' },
        { id: 'thriller', label: 'Thriller' },
      ],
    },
    {
      id: 'watchingStyle',
      label: 'Watching style',
      type: 'single',
      options: [
        { id: 'theatre', label: 'Theatre' },
        { id: 'ott', label: 'OTT' },
        { id: 'either', label: 'Either' },
      ],
    },
    {
      id: 'discussionPreference',
      label: 'Discussion preference',
      type: 'single',
      options: [
        { id: 'love-discussing', label: 'Love discussing movies' },
        { id: 'casual-talk', label: 'Casual talk' },
        { id: 'just-watch', label: 'Just watch' },
      ],
    },
    {
      id: 'timing',
      label: 'Timing',
      type: 'single',
      options: [
        { id: 'weekday', label: 'Weekday' },
        { id: 'weekend', label: 'Weekend' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
  ],

  // 💪 Gym Partner
  gym_partner: [
    {
      id: 'fitnessGoal',
      label: 'Fitness goal',
      type: 'single',
      options: [
        { id: 'weight-loss', label: 'Weight loss' },
        { id: 'muscle-gain', label: 'Muscle gain' },
        { id: 'general-fitness', label: 'General fitness' },
      ],
    },
    {
      id: 'experienceLevel',
      label: 'Experience level',
      type: 'single',
      options: [
        { id: 'beginner', label: 'Beginner' },
        { id: 'intermediate', label: 'Intermediate' },
        { id: 'advanced', label: 'Advanced' },
      ],
    },
    {
      id: 'workoutTime',
      label: 'Workout time',
      type: 'single',
      options: [
        { id: 'morning', label: 'Morning' },
        { id: 'evening', label: 'Evening' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'workoutStyle',
      label: 'Workout style',
      type: 'single',
      options: [
        { id: 'disciplined', label: 'Disciplined' },
        { id: 'casual', label: 'Casual' },
        { id: 'motivational', label: 'Motivational' },
      ],
    },
    {
      id: 'frequency',
      label: 'Frequency',
      type: 'single',
      options: [
        { id: '3-4-days-week', label: '3–4 days/week' },
        { id: 'daily', label: 'Daily' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
  ],

  // 🎮 Gaming Buddy
  gaming_buddy: [
    {
      id: 'gamingPlatform',
      label: 'Gaming platform',
      type: 'single',
      options: [
        { id: 'mobile', label: 'Mobile' },
        { id: 'pc', label: 'PC' },
        { id: 'console', label: 'Console' },
      ],
    },
    {
      id: 'gameType',
      label: 'Game type',
      type: 'single',
      options: [
        { id: 'casual', label: 'Casual' },
        { id: 'competitive', label: 'Competitive' },
        { id: 'story-based', label: 'Story-based' },
      ],
    },
    {
      id: 'playTime',
      label: 'Play time',
      type: 'single',
      options: [
        { id: 'evening', label: 'Evening' },
        { id: 'night', label: 'Night' },
        { id: 'anytime', label: 'Anytime' },
      ],
    },
    {
      id: 'communicationStyle',
      label: 'Communication style',
      type: 'single',
      options: [
        { id: 'voice-chat', label: 'Voice chat' },
        { id: 'text-only', label: 'Text only' },
        { id: 'both', label: 'Both' },
      ],
    },
    {
      id: 'playFrequency',
      label: 'Play frequency',
      type: 'single',
      options: [
        { id: 'occasionally', label: 'Occasionally' },
        { id: 'regularly', label: 'Regularly' },
        { id: 'daily', label: 'Daily' },
      ],
    },
  ],
}

export default function Explore() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [matchResult, setMatchResult] = useState(null)
  
  // Form state for activity preferences - dynamic based on activity type
  const [preferences, setPreferences] = useState({})
  const [peopleNeeded, setPeopleNeeded] = useState('')

  // Queries
  const currentUser = useQuery(
    api.users.getByWorkosId,
    user?.id ? { workosId: user.id } : 'skip'
  )

  const allCommunities = useQuery(api.communities.getAllCommunities)

  const userCommunityIds = useQuery(
    api.communities.getUserCommunityIds,
    user?.id ? { userId: user.id } : 'skip'
  )

  const userActiveSearches = useQuery(
    api.activitySearches.getUserActiveSearches,
    user?.id ? { userId: user.id } : 'skip'
  )

  // Mutations
  const createActivitySearchAndMatch = useMutation(api.activitySearches.createActivitySearchAndMatch)
  const joinCommunity = useMutation(api.communities.joinCommunity)
  const getOrCreateCommunityChat = useMutation(api.chats.getOrCreateCommunityChat)

  // Filter activities based on search
  const filteredActivities = predefinedActivities.filter((activity) =>
    activity.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort activities - user's preferred activities first
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    const aIsPreferred = currentUser?.activities?.includes(a.id) || 
                         currentUser?.intents?.some(intent => a.id.includes(intent))
    const bIsPreferred = currentUser?.activities?.includes(b.id) ||
                         currentUser?.intents?.some(intent => b.id.includes(intent))
    if (aIsPreferred && !bIsPreferred) return -1
    if (!aIsPreferred && bIsPreferred) return 1
    return 0
  })

  // Sort communities - user's interests first
  const sortedCommunities = allCommunities ? [...allCommunities].sort((a, b) => {
    const aMatches = currentUser?.intents?.includes(a.category)
    const bMatches = currentUser?.intents?.includes(b.category)
    if (aMatches && !bMatches) return -1
    if (!aMatches && bMatches) return 1
    return b.memberCount - a.memberCount
  }) : []

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity)
    setPreferences({})
    setPeopleNeeded('')
    setCurrentStep(0)
    setIsModalOpen(true)
    setShowSuccess(false)
  }

  const handleJoinCommunity = async (communityId) => {
    if (!user?.id) return
    try {
      await joinCommunity({ userId: user.id, communityId })
      // Create or get community chat when joining
      await getOrCreateCommunityChat({ communityId })
    } catch (error) {
      console.error('Failed to join community:', error)
    }
  }

  // Get questions for the selected activity
  const getActivityQuestions = () => {
    if (!selectedActivity) return []
    return activityQuestions[selectedActivity.id] || []
  }

  // Total steps = number of questions + 1 (for peopleNeeded step)
  const getTotalSteps = () => {
    return getActivityQuestions().length + 1
  }

  const canProceed = () => {
    const questions = getActivityQuestions()
    if (currentStep < questions.length) {
      const currentQuestion = questions[currentStep]
      return preferences[currentQuestion.id] !== undefined && preferences[currentQuestion.id] !== ''
    }
    // Last step (peopleNeeded) is optional
    return true
  }

  const handleNext = () => {
    if (currentStep < getTotalSteps() - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSelectOption = (questionId, optionId) => {
    setPreferences((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
  }

  const handleSubmit = async () => {
    if (!user?.id || !currentUser || !selectedActivity) return

    setIsSubmitting(true)
    try {
      const peopleNeededNum = peopleNeeded ? parseInt(peopleNeeded, 10) : undefined
      const result = await createActivitySearchAndMatch({
        userId: user.id,
        userName: currentUser.firstName || 'Anonymous',
        activityType: selectedActivity.id,
        peopleNeeded: peopleNeededNum,
        preferences: preferences,
      })
      setMatchResult(result)
      setShowSuccess(true)
      // Auto close after showing success
      setTimeout(() => {
        setIsModalOpen(false)
        setSelectedActivity(null)
        setShowSuccess(false)
        setMatchResult(null)
      }, 3000)
    } catch (error) {
      console.error('Failed to create activity search:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isActivityActive = (activityId) => {
    return userActiveSearches?.some((search) => search.activityType === activityId)
  }

  const renderModalContent = () => {
    if (showSuccess) {
      const hasMatches = matchResult?.requestsSent > 0
      return (
        <div className="py-12 text-center">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            hasMatches 
              ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20' 
              : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20'
          }`}>
            {hasMatches ? (
              <span className="text-4xl">🎉</span>
            ) : (
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          {hasMatches ? (
            <>
              <h3 className="text-xl font-semibold text-white mb-2">
                {matchResult.requestsSent} Match{matchResult.requestsSent > 1 ? 'es' : ''} Found!
              </h3>
              <p className="text-gray-400 mb-2">
                We've sent connection requests on your behalf
              </p>
              <p className="text-sm text-purple-400">
                Check your Home page for responses
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-white mb-2">You're all set!</h3>
              <p className="text-gray-400">
                {matchResult?.matchesFound > 0 
                  ? 'You already have pending requests with potential matches'
                  : 'We\'ll notify you when we find a match'}
              </p>
            </>
          )}
        </div>
      )
    }

    const questions = getActivityQuestions()
    const totalSteps = getTotalSteps()
    const isLastStep = currentStep === questions.length

    // Last step: People Needed
    if (isLastStep) {
      return (
        <>
          {/* Progress */}
          <div className="flex items-center gap-1 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i <= currentStep
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Question */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-white mb-1">How many partners do you need?</h3>
            <p className="text-sm text-gray-400">Leave empty for unlimited connections</p>
          </div>

          {/* Number Input */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={peopleNeeded}
                  onChange={(e) => setPeopleNeeded(e.target.value)}
                  placeholder="e.g., 3"
                  className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-center text-2xl font-semibold placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
            {peopleNeeded && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 text-center">
                <span className="text-purple-300 font-medium">
                  Looking for {peopleNeeded} {parseInt(peopleNeeded) === 1 ? 'partner' : 'partners'}
                </span>
                <p className="text-xs text-gray-400 mt-1">Your search will auto-close when all spots are filled</p>
              </div>
            )}
            {!peopleNeeded && (
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-gray-400 font-medium">Unlimited partners</span>
                <p className="text-xs text-gray-500 mt-1">Your search will stay open until you close it</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
            <button
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all"
            >
              Back
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                !isSubmitting
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Finding...
                </span>
              ) : (
                'Find Partner'
              )}
            </button>
          </div>
        </>
      )
    }

    // Regular question steps
    const currentQuestion = questions[currentStep]

    return (
      <>
        {/* Progress */}
        <div className="flex items-center gap-1 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= currentStep
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Question */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-1">{currentQuestion.label}</h3>
          <p className="text-sm text-gray-400">Choose one option</p>
        </div>

        {/* Options */}
        <div className={`grid gap-3 mb-6 ${currentQuestion.options.length <= 3 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {currentQuestion.options.map((option) => {
            const isSelected = preferences[currentQuestion.id] === option.id

            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/50'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-sm font-medium text-white">{option.label}</span>
                {isSelected && (
                  <span className="float-right text-purple-400">✓</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
              canProceed()
                ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#161621] text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
        {/* Header */}
        <header className="relative mb-8">
          <div className="absolute -top-20 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Explore
              </span>
            </h1>
            <p className="text-gray-400">Find the perfect partner for any activity</p>
          </div>
        </header>

        {/* Search */}
        <div className="relative mb-8">
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities, communities..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#1e1e2e] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>

        {/* Predefined Activities Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Find Your Partner</h2>
            <span className="text-sm text-gray-500">{sortedActivities.length} activities</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedActivities.map((activity) => {
              const isActive = isActivityActive(activity.id)
              return (
                <button
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border-purple-500/30'
                      : 'bg-[#1e1e2e] border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${activity.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Active
                      </span>
                    </div>
                  )}

                  <div className="relative">
                    <span className="text-3xl block mb-3">{activity.icon}</span>
                    <h3 className="font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
                      {activity.label}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{activity.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Communities Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Communities</h2>
            <span className="text-sm text-gray-500">{sortedCommunities.length} communities</span>
          </div>

          {sortedCommunities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedCommunities.map((community) => {
                const isJoined = userCommunityIds?.includes(community._id)
                const isUserInterest = currentUser?.intents?.includes(community.category)
                
                return (
                  <div
                    key={community._id}
                    className={`group p-5 rounded-2xl border transition-all duration-300 ${
                      isUserInterest
                        ? 'bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/20'
                        : 'bg-[#1e1e2e] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-2xl shrink-0">
                        {community.imageUrl ? (
                          <img 
                            src={community.imageUrl} 
                            alt="" 
                            className="w-full h-full rounded-xl object-cover" 
                          />
                        ) : (
                          '👥'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                          {community.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{community.memberCount} members</span>
                          {isUserInterest && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs">
                              For you
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {community.description}
                    </p>

                    {/* Join Button */}
                    <button
                      onClick={() => !isJoined && handleJoinCommunity(community._id)}
                      disabled={isJoined}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isJoined
                          ? 'bg-white/5 text-gray-500 cursor-default'
                          : 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 hover:from-cyan-500/30 hover:to-purple-500/30'
                      }`}
                    >
                      {isJoined ? 'Joined' : 'Join Community'}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : allCommunities === undefined ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-[#1e1e2e] border border-white/5">
              <div className="w-14 h-14 mb-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-gray-400 text-sm">No communities available yet</p>
              <p className="text-gray-500 text-xs mt-1">Check back soon!</p>
            </div>
          )}
        </section>
      </main>

      {/* Activity Modal */}
      {isModalOpen && selectedActivity && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div className="min-h-full flex items-center justify-center p-4 py-8">
            <div 
              className="w-full max-w-md rounded-3xl bg-[#1e1e2e] border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`px-6 py-5 bg-gradient-to-r ${selectedActivity.gradient} bg-opacity-20 rounded-t-3xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedActivity.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{selectedActivity.label}</h3>
                      <p className="text-sm text-white/70">Tell us about your ideal partner</p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isSubmitting && setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {renderModalContent()}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
