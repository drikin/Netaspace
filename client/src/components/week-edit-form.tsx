import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { updateWeekSchema, type UpdateWeek, type Week } from "@shared/schema";
import { formatDateTimeForInput } from "@/lib/date-format";
import { Edit } from "lucide-react";

interface WeekEditFormProps {
  week: Week;
}

export function WeekEditForm({ week }: WeekEditFormProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UpdateWeek>({
    resolver: zodResolver(updateWeekSchema),
    defaultValues: {
      title: week.title,
      liveRecordingDate: formatDateTimeForInput(week.liveRecordingDate || ""),
      liveUrl: week.liveUrl || "",
    },
  });

  // Update form values when week prop changes
  React.useEffect(() => {
    form.reset({
      title: week.title,
      liveRecordingDate: formatDateTimeForInput(week.liveRecordingDate || ""),
      liveUrl: week.liveUrl || "",
    });
  }, [week.id, week.title, week.liveRecordingDate, week.liveUrl, form]);

  const updateWeekMutation = useMutation({
    mutationFn: async (values: UpdateWeek) => {
      return apiRequest("PATCH", `/api/weeks/${week.id}`, values);
    },
    onSuccess: (updatedWeek) => {
      toast({ title: "週情報を更新しました" });
      setOpen(false);
      form.reset({
        title: updatedWeek.title,
        liveRecordingDate: formatDateTimeForInput(updatedWeek.liveRecordingDate || ""),
        liveUrl: updatedWeek.liveUrl || "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "更新に失敗しました",
        description: error.message || "週情報の更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (values: UpdateWeek) => {
    await updateWeekMutation.mutateAsync(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700"
        >
          <Edit className="h-4 w-4 mr-1" />
          編集
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>週情報の編集</DialogTitle>
          <DialogDescription>
            タイトル、ライブ収録日、ライブURLを編集できます
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タイトル *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="週のタイトルを入力"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="liveRecordingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ライブ収録日時</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-gray-500">
                    未入力の場合は「TBD」と表示されます
                  </p>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="liveUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ライブURL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://youtube.com/live/..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-gray-500">
                    未入力の場合はライブ配信パネルが非表示になります
                  </p>
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={updateWeekMutation.isPending}
              >
                {updateWeekMutation.isPending ? "更新中..." : "更新"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}