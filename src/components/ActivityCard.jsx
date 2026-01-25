export default function ActivityCard({ activity }) {
  const { type, user, content, timestamp } = activity || {}

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'event_joined':
        return '🎉'
      case 'community_joined':
        return '👥'
      case 'comment':
        return '💬'
      case 'like':
        return '❤️'
      default:
        return '📌'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-start">
        <span className="text-xl mr-3">{getActivityIcon(type)}</span>
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-semibold">{user?.name || 'Someone'}</span>{' '}
            {content || 'performed an action'}
          </p>
          {timestamp && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
