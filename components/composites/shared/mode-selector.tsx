import { MODE_LIST } from "./constants"

export type ModeType = "actions" | "dataChange" | "boundaryCriteria"

interface ModeSelectorProps {
  activeMode: ModeType
  onModeChange: (mode: ModeType) => void
  className?: string
}

export function ModeSelector({ 
  activeMode, 
  onModeChange, 
  className = "" 
}: ModeSelectorProps) {
  return (
    <div className={`flex flex-row gap-2 mb-2 mt-2 ${className}`}>
      {MODE_LIST.map(({ key, icon: Icon, label, activeBg, inactiveBg, iconColor, inactiveIcon }) => (
        <button
          key={key}
          onClick={() => onModeChange(key as ModeType)}
          className={`border rounded-md p-1 shadow transition flex items-center justify-center ${
            activeMode === key ? `${activeBg} border-black` : `${inactiveBg} border-gray-300`
          }`}
          aria-label={label}
          type="button"
        >
          {activeMode === key
            ? <span className={iconColor}><Icon className="w-4 h-4" /></span>
            : <span className={inactiveIcon}><Icon className="w-4 h-4" /></span>
          }
          <span className="ml-1 text-xs font-medium hidden md:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

// Helper function to get rows for a given action node and mode
export function getRowsForMode(actionNode: any, mode: string) {
  if (!actionNode || !actionNode.data || !actionNode.data.modes) return []
  
  if (mode === 'actions') return actionNode.data.modes.actions?.rows || []
  if (mode === 'dataChange') return actionNode.data.modes.dataChanges?.rows || []
  if (mode === 'boundaryCriteria') return actionNode.data.modes.boundaryCriteria?.rows || []
  
  return []
} 