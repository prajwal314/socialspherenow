import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Community categories matching the backend
const COMMUNITY_CATEGORIES = [
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'art', label: 'Art & Design', icon: '🎨' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'coding', label: 'Coding & Tech', icon: '💻' },
  { id: 'photography', label: 'Photography', icon: '📷' },
  { id: 'fitness', label: 'Fitness & Health', icon: '💪' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'food', label: 'Food & Cooking', icon: '🍳' },
  { id: 'books', label: 'Books & Reading', icon: '📚' },
  { id: 'movies', label: 'Movies & TV', icon: '🎬' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'business', label: 'Business & Startups', icon: '🚀' },
  { id: 'language', label: 'Language Learning', icon: '🗣️' },
  { id: 'pets', label: 'Pets & Animals', icon: '🐾' },
  { id: 'crafts', label: 'DIY & Crafts', icon: '🛠️' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'fashion', label: 'Fashion & Style', icon: '👗' },
  { id: 'anime', label: 'Anime & Manga', icon: '🎌' },
  { id: 'other', label: 'Other', icon: '✨' },
]

export default function CommunityDetailModal({ communityId, userId, onClose }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('about') // 'about' | 'members' | 'groups'
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [error, setError] = useState('')
  const imageInputRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
  })

  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
  })

  // Queries
  const communityDetails = useQuery(
    api.communities.getCommunityDetails,
    communityId ? { communityId } : 'skip'
  )

  const userRole = useQuery(
    api.communities.getUserRole,
    communityId && userId ? { communityId, userId } : 'skip'
  )

  const members = useQuery(
    api.communities.getCommunityMembers,
    communityId ? { communityId } : 'skip'
  )

  const groups = useQuery(
    api.communities.getCommunityGroups,
    communityId && userId ? { communityId, userId } : 'skip'
  )

  // Mutations
  const updateCommunity = useMutation(api.communities.updateCommunity)
  const makeAdmin = useMutation(api.communities.makeAdmin)
  const removeAdmin = useMutation(api.communities.removeAdmin)
  const createGroup = useMutation(api.communities.createGroup)
  const joinGroup = useMutation(api.communities.joinGroup)
  const leaveGroup = useMutation(api.communities.leaveGroup)
  const deleteGroup = useMutation(api.communities.deleteGroup)
  const leaveCommunity = useMutation(api.communities.leaveCommunity)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  const isAdmin = userRole === 'admin'
  const isCreator = communityDetails?.creatorId === userId

  // Initialize edit form when community details load
  useEffect(() => {
    if (communityDetails) {
      setEditForm({
        name: communityDetails.name,
        description: communityDetails.description,
      })
      if (communityDetails.imageUrl) {
        setImagePreview(communityDetails.imageUrl)
      }
    }
  }, [communityDetails])

  const getCategoryInfo = (categoryId) => {
    return COMMUNITY_CATEGORIES.find((c) => c.id === categoryId) || { label: categoryId, icon: '✨' }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  const handleSave = async () => {
    if (!communityId || !userId) return

    setSaving(true)
    setError('')

    try {
      let imageId = undefined

      // Upload new image if selected
      if (imageFile) {
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': imageFile.type },
          body: imageFile,
        })
        const { storageId } = await result.json()
        imageId = storageId
      }

      await updateCommunity({
        communityId,
        userId,
        name: editForm.name,
        description: editForm.description,
        imageId,
      })

      setIsEditing(false)
      setImageFile(null)
    } catch (err) {
      console.error('Failed to update community:', err)
      setError(err.message || 'Failed to update community')
    } finally {
      setSaving(false)
    }
  }

  const handleMakeAdmin = async (targetUserId) => {
    try {
      await makeAdmin({ communityId, userId, targetUserId })
    } catch (err) {
      console.error('Failed to make admin:', err)
      setError(err.message || 'Failed to make admin')
    }
  }

  const handleRemoveAdmin = async (targetUserId) => {
    try {
      await removeAdmin({ communityId, userId, targetUserId })
    } catch (err) {
      console.error('Failed to remove admin:', err)
      setError(err.message || 'Failed to remove admin')
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!groupForm.name.trim()) return

    try {
      await createGroup({
        communityId,
        userId,
        name: groupForm.name,
        description: groupForm.description || undefined,
      })
      setGroupForm({ name: '', description: '' })
      setShowCreateGroup(false)
    } catch (err) {
      console.error('Failed to create group:', err)
      setError(err.message || 'Failed to create group')
    }
  }

  const handleJoinGroup = async (groupId) => {
    try {
      await joinGroup({ groupId, userId })
    } catch (err) {
      console.error('Failed to join group:', err)
      setError(err.message || 'Failed to join group')
    }
  }

  const handleLeaveGroup = async (groupId) => {
    try {
      await leaveGroup({ groupId, userId })
    } catch (err) {
      console.error('Failed to leave group:', err)
      setError(err.message || 'Failed to leave group')
    }
  }

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group? All messages will be lost.')) return

    try {
      await deleteGroup({ groupId, userId })
    } catch (err) {
      console.error('Failed to delete group:', err)
      setError(err.message || 'Failed to delete group')
    }
  }

  const handleLeaveCommunity = async () => {
    if (!confirm('Are you sure you want to leave this community?')) return

    try {
      const result = await leaveCommunity({ communityId, userId })
      if (result.success) {
        onClose()
      } else {
        setError(result.message || 'Failed to leave community')
      }
    } catch (err) {
      console.error('Failed to leave community:', err)
      setError(err.message || 'Failed to leave community')
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!communityId) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div
          className="w-full max-w-lg rounded-3xl bg-[#1e1e2e] border border-white/10 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with image */}
          <div className="relative shrink-0">
            {/* Cover Image */}
            <div className="h-32 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 relative">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              {isEditing && isAdmin && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white hover:bg-black/60 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs">Change Image</span>
                  </div>
                </button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Category badge */}
            {communityDetails && (
              <div className="absolute -bottom-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1e2e] border border-white/10 text-sm">
                  <span>{getCategoryInfo(communityDetails.category).icon}</span>
                  <span className="text-gray-300">
                    {communityDetails.category === 'other'
                      ? communityDetails.customCategory
                      : getCategoryInfo(communityDetails.category).label}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {communityDetails === undefined ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : communityDetails ? (
              <div className="p-6 pt-8">
                {/* Error message */}
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Name and edit button */}
                <div className="flex items-start justify-between mb-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="flex-1 text-xl font-bold bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-white">{communityDetails.name}</h2>
                  )}
                  
                  {isAdmin && !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>

                {/* Member count and created date */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {communityDetails.memberCount} members
                  </span>
                  <span>Created {formatDate(communityDetails.createdAt)}</span>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
                  {['about', 'members', 'groups'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                        activeTab === tab
                          ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {activeTab === 'about' && (
                  <div className="space-y-4">
                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                      {isEditing ? (
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={4}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                        />
                      ) : (
                        <p className="text-gray-300">{communityDetails.description}</p>
                      )}
                    </div>

                    {/* Edit actions */}
                    {isEditing && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setEditForm({
                              name: communityDetails.name,
                              description: communityDetails.description,
                            })
                            setImageFile(null)
                            setImagePreview(communityDetails.imageUrl)
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving || !editForm.name.trim() || !editForm.description.trim()}
                          className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                            !isSaving && editForm.name.trim() && editForm.description.trim()
                              ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg'
                              : 'bg-white/10 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}

                    {/* Leave community button */}
                    {!isEditing && !isCreator && (
                      <button
                        onClick={handleLeaveCommunity}
                        className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
                      >
                        Leave Community
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {members === undefined ? (
                      <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : members && members.length > 0 ? (
                      members.map((member) => (
                        <div
                          key={member._id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold shrink-0">
                            {member.userDetails?.profileImageUrl ? (
                              <img
                                src={member.userDetails.profileImageUrl}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              member.userDetails?.firstName?.charAt(0)?.toUpperCase() || '?'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {member.userDetails?.firstName || 'Unknown'}
                              {member.userId === userId && (
                                <span className="text-gray-500 text-sm ml-1">(You)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                          </div>
                          
                          {/* Admin controls */}
                          {isAdmin && member.userId !== userId && (
                            <div>
                              {member.role === 'admin' ? (
                                member.userId !== communityDetails.creatorId && (
                                  <button
                                    onClick={() => handleRemoveAdmin(member.userId)}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                                  >
                                    Remove Admin
                                  </button>
                                )
                              ) : (
                                <button
                                  onClick={() => handleMakeAdmin(member.userId)}
                                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors"
                                >
                                  Make Admin
                                </button>
                              )}
                            </div>
                          )}
                          
                          {/* Creator badge */}
                          {member.userId === communityDetails.creatorId && (
                            <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs">
                              Creator
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">No members found</p>
                    )}
                  </div>
                )}

                {activeTab === 'groups' && (
                  <div className="space-y-3">
                    {/* Create group button for admins */}
                    {isAdmin && !showCreateGroup && (
                      <button
                        onClick={() => setShowCreateGroup(true)}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-cyan-500/30 text-gray-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Group
                      </button>
                    )}

                    {/* Create group form */}
                    {showCreateGroup && (
                      <form onSubmit={handleCreateGroup} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <input
                          type="text"
                          value={groupForm.name}
                          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                          placeholder="Group name"
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                        />
                        <textarea
                          value={groupForm.description}
                          onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                          placeholder="Description (optional)"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateGroup(false)
                              setGroupForm({ name: '', description: '' })
                            }}
                            className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!groupForm.name.trim()}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                              groupForm.name.trim()
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Create
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Groups list */}
                    {groups === undefined ? (
                      <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : groups && groups.length > 0 ? (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {groups.map((group) => (
                          <div
                            key={group._id}
                            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-white">{group.name}</h4>
                                <p className="text-xs text-gray-500">{group.memberCount} members</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {group.isMember ? (
                                  <button
                                    onClick={() => handleLeaveGroup(group._id)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-white/10 transition-colors"
                                  >
                                    Leave
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleJoinGroup(group._id)}
                                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors"
                                  >
                                    Join
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteGroup(group._id)}
                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            {group.description && (
                              <p className="text-sm text-gray-400">{group.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No groups yet</p>
                        {isAdmin && (
                          <p className="text-gray-600 text-xs mt-1">Create a group to organize discussions</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-gray-500">Community not found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
