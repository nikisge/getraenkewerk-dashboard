import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./TaskCard";
import { DashboardTask } from "@/hooks/useDashboardTasksAdmin";
import { GripVertical } from "lucide-react";

interface DraggableTaskCardProps {
  task: DashboardTask;
  onComplete: (taskId: string, taskType: string, action: string, churnReason?: string) => void;
}

export function DraggableTaskCard({ task, onComplete }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.task_id || "",
    data: {
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute left-2 top-2 z-10 cursor-grab active:cursor-grabbing p-1 bg-muted/80 rounded hover:bg-muted"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {/* Task Card - clickable */}
      <TaskCard task={task} onComplete={onComplete} />
    </div>
  );
}
