import { TaskCard } from "@/features/tasks/components/TaskCard";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DashboardTask } from "@/features/dashboard/hooks/useDashboardTasks";
import { CheckCircle2 } from "lucide-react";

interface TaskListViewProps {
  tasks: DashboardTask[] | undefined;
  isLoading: boolean;
  onTaskComplete: (taskId: string, taskType: string, action: string, churnReason?: string) => void;
}

export function TaskListView({ tasks, isLoading, onTaskComplete }: TaskListViewProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-16 px-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-2xl font-bold text-foreground mb-2">Alles erledigt!</h3>
          <p className="text-muted-foreground text-center">
            Keine offenen Aufgaben
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {tasks.map((task) => (
        <TaskCard 
          key={task.task_id} 
          task={task} 
          onComplete={onTaskComplete}
        />
      ))}
    </div>
  );
}
