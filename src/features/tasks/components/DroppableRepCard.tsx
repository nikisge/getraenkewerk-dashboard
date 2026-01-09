import { useDroppable } from "@dnd-kit/core";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Rep } from "@/features/reps/hooks/useReps";
import { cn } from "@/shared/lib/utils";

interface DroppableRepCardProps {
  rep: Rep;
  taskCount: number;
  isSelected: boolean;
  onClick: () => void;
}

export function DroppableRepCard({ rep, taskCount, isSelected, onClick }: DroppableRepCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `rep-${rep.rep_id}`,
    data: {
      rep,
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer",
        isSelected && "bg-primary/10 border-2 border-primary",
        !isSelected && "hover:bg-muted",
        isOver && "scale-105 bg-primary/20 border-2 border-primary shadow-lg"
      )}
      onClick={onClick}
    >
      <Avatar className={cn("transition-transform", isOver && "scale-110")}>
        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${rep.name}`} />
        <AvatarFallback>{getInitials(rep.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-medium">{rep.name}</p>
        <p className="text-sm text-muted-foreground">
          {taskCount} {taskCount === 1 ? "Aufgabe" : "Aufgaben"}
        </p>
      </div>
    </div>
  );
}
