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
import { Edit, Sparkles, Loader2 } from "lucide-react";

interface TitleSuggestion {
  title: string;
  reasoning: string;
}

interface WeekEditFormProps {
  week: Week;
}

export function WeekEditForm({ week }: WeekEditFormProps) {
  const [open, setOpen] = React.useState(false);
  const [titleSuggestions, setTitleSuggestions] = React.useState<TitleSuggestion[] | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
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
    setTitleSuggestions(null);
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

  const handleGenerateTitle = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/weeks/${week.id}/generate-title`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.available && data.suggestions?.length > 0) {
        setTitleSuggestions(data.suggestions);
        form.setValue("title", data.suggestions[0].title, { shouldDirty: true });
      } else {
        toast({
          title: "タイトル生成に失敗しました",
          description: data.reason === "not_configured" ? "Grok AIが設定されていません" : "もう一度お試しください",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "タイトル生成に失敗しました",
        description: "ネットワークエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTitleSuggestions(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                  <div className="flex items-center gap-2">
                    <FormLabel>タイトル *</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateTitle}
                      disabled={isGenerating}
                      className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      AI提案
                    </Button>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="週のタイトルを入力"
                      {...field}
                    />
                  </FormControl>
                  {titleSuggestions && titleSuggestions.length > 1 && (
                    <div className="space-y-1 mt-1">
                      <p className="text-xs text-muted-foreground">他の候補:</p>
                      {titleSuggestions.slice(1).map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => form.setValue("title", s.title, { shouldDirty: true })}
                          className="block text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 text-left"
                          title={s.reasoning}
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  )}
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
                onClick={() => handleOpenChange(false)}
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
