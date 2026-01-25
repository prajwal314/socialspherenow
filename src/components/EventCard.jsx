export default function EventCard({ event }) {
  const { title, date, location, imageUrl, attendees } = event || {}

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{title || 'Untitled Event'}</h3>
        {date && (
          <p className="text-sm text-gray-500 mb-1">
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
        {location && (
          <p className="text-sm text-gray-500 mb-2">{location}</p>
        )}
        {attendees !== undefined && (
          <p className="text-sm text-blue-600">{attendees} attending</p>
        )}
      </div>
    </div>
  )
}
