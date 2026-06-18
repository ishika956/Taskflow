import { useSortable } from '@dnd-kit/sortable';
import { CSS }         from '@dnd-kit/utilities';
import { useAuth }     from '../context/AuthContext';

const PRIORITY_STYLES = {
  Low:    { dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-500' },
  Medium: { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-600' },
  High:   { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600' },
  Urgent: { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-600' },
};

const AVATAR_BG = ['bg-[#0073bb]','bg-purple-500','bg-pink-500','bg-teal-500','bg-orange-500'];

export default function TaskCard({ task, onClick, userRole, onComplete }) {
  const { user }       = useAuth();
  const isMember       = userRole === 'Member';
  const assignees      = task.assignees || [];
  const isAssignedToMe = assignees.some(a => (a._id || a) === user?._id);
  const isDone         = task.status === 'Done';
  const isOverdue      = task.deadline && new Date(task.deadline) < new Date() && !isDone;
  const p              = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id, disabled: isMember });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes} {...listeners}
      onClick={!isMember ? onClick : undefined}
      className={`bg-white rounded-xl border select-none transition-all duration-150
        ${isMember ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:border-[#0073bb]/40 hover:shadow-md'}
        ${isAssignedToMe && isMember && !isDone ? 'border-[#0073bb]/40 ring-1 ring-[#0073bb]/20' : 'border-gray-200'}
        ${isDragging ? 'shadow-xl rotate-1 scale-105' : 'shadow-sm'}
      `}
    >
      <div className="p-3.5">
        {/* Top row: priority + attachments */}
        <div className="flex items-center justify-between mb-2.5">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${p.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`}/>
            {task.priority}
          </span>
          {task.attachments?.length > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {task.attachments.length}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-gray-800 leading-snug mb-2.5">{task.title}</p>

        {/* Tags */}
        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {task.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-[#0073bb]/8 text-[#0073bb] rounded-md px-1.5 py-0.5 border border-[#0073bb]/15">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
          {task.deadline ? (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          ) : <span />}

          {/* Assignee avatars */}
          {assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 3).map((a, i) => (
                <div key={a._id || i} title={a.name}
                  className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ring-2 ring-white ${AVATAR_BG[i % AVATAR_BG.length]}`}>
                  {a.name?.[0]?.toUpperCase()}
                </div>
              ))}
              {assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-bold ring-2 ring-white">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Member actions */}
      {isMember && isAssignedToMe && !isDone && (
        <div className="px-3.5 pb-3.5">
          <button onClick={e => { e.stopPropagation(); onComplete(task._id); }}
            className="w-full text-xs bg-green-500 hover:bg-green-600 text-white font-medium py-1.5 rounded-lg transition flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Mark as Done
          </button>
        </div>
      )}
      {isMember && isAssignedToMe && isDone && (
        <div className="px-3.5 pb-3.5">
          <div className="w-full text-xs bg-green-50 text-green-600 font-medium py-1.5 rounded-lg text-center border border-green-200 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </div>
        </div>
      )}
      {isMember && !isAssignedToMe && (
        <div className="px-3.5 pb-2.5">
          <p className="text-xs text-gray-300 text-center">View only</p>
        </div>
      )}
    </div>
  );
}
