import { Handle, Position } from "@xyflow/react"

type EventNodeProps = {
  id: string
  data: { label: string }
}

const EventNode = ({ id, data }: EventNodeProps) => {
  return (
    <div className="bg-blue-200 border border-blue-500 rounded p-2">
      <Handle type="target" position={Position.Left} id="a" />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} id="b" />
    </div>
  )
}

export default EventNode
