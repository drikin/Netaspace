import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlusIcon, Calendar, RefreshCw, Pencil } from "lucide-react";
import { Week, WeekWithTopics } from "@shared/schema";

import { formatLiveRecordingDate } from "@/lib/date-format";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { WeekEditForm } from "@/components/week-edit-form";

interface WeekSelectorProps {
  week: WeekWithTopics | Week | null;
  isLoading?: boolean;
}

const weekSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  liveRecordingDate: z.string().optional(),
  liveUrl: z.string().optional(),
});

const editWeekSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
});

type WeekFormValues = z.infer<typeof weekSchema>;
type EditWeekFormValues = z.infer<typeof editWeekSchema>;

const WeekSelector: React.FC<WeekSelectorProps> = ({ week, isLoading = false }) => {
  const { isAdmin } = useAuth();
  const [isCreateWeekDialogOpen, setIsCreateWeekDialogOpen] = useState(false);
  const [isSwitchWeekDialogOpen, setIsSwitchWeekDialogOpen] = useState(false);
  const [isEditWeekDialogOpen, setIsEditWeekDialogOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all weeks for switching
  const { data: weeks } = useQuery<Week[]>({
    queryKey: ["/api/weeks"],
    enabled: isAdmin,
  });

  // Form for creating new week
  const weekForm = useForm<WeekFormValues>({
    resolver: zodResolver(weekSchema),
    defaultValues: {
      title: "",
      liveRecordingDate: "",
      liveUrl: "",
    },
  });

  // Form for editing week
  const editWeekForm = useForm<EditWeekFormValues>({
    resolver: zodResolver(editWeekSchema),
    defaultValues: {
      title: "",
    },
  });

  // Create week mutation
  const createWeekMutation = useMutation({
    mutationFn: async (values: WeekFormValues) => {
      const response = await fetch("/api/weeks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error("Failed to create week");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "週を作成しました" });
      setIsCreateWeekDialogOpen(false);
      weekForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/weeks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
    },
    onError: () => {
      toast({ title: "週の作成に失敗しました", variant: "destructive" });
    },
  });

  // Switch week mutation
  const switchWeekMutation = useMutation({
    mutationFn: async (weekId: number) => {
      const response = await fetch(`/api/weeks/${weekId}/setActive`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to switch week");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "週を切り替えました" });
      setIsSwitchWeekDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
    },
    onError: () => {
      toast({ title: "週の切り替えに失敗しました", variant: "destructive" });
    },
  });

  // Update week mutation
  const updateWeekMutation = useMutation({
    mutationFn: async ({ weekId, title }: { weekId: number; title: string }) => {
      const response = await fetch(`/api/weeks/${weekId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("Failed to update week");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "週のタイトルを更新しました" });
      setIsEditWeekDialogOpen(false);
      setEditingWeek(null);
      editWeekForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/weeks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
    },
    onError: () => {
      toast({ title: "週のタイトルの更新に失敗しました", variant: "destructive" });
    },
  });

  const handleCreateWeek = async (values: WeekFormValues) => {
    await createWeekMutation.mutateAsync(values);
  };

  const handleSwitchWeek = async (weekId: number) => {
    await switchWeekMutation.mutateAsync(weekId);
  };

  const handleEditWeek = (week: Week) => {
    setEditingWeek(week);
    editWeekForm.setValue("title", week.title);
    setIsEditWeekDialogOpen(true);
  };

  const handleUpdateWeek = async (values: EditWeekFormValues) => {
    if (!editingWeek) return;
    await updateWeekMutation.mutateAsync({
      weekId: editingWeek.id,
      title: values.title,
    });
  };
  if (isLoading) {
    return (
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-5 w-32 mt-1 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{week?.title || "今週のネタ候補"}</h1>
          {isAdmin && week && (
            <WeekEditForm week={week} />
          )}
        </div>
        {week ? (
          <p className="mt-1 text-sm text-blue-600 font-medium">
            ライブ収録: {formatLiveRecordingDate(week.liveRecordingDate || '')}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-600">
            アクティブな週がありません
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <>
            <Dialog open={isSwitchWeekDialogOpen} onOpenChange={setIsSwitchWeekDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  週を切り替え
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>週を切り替え</DialogTitle>
                  <DialogDescription>
                    アクティブにする週を選択してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {weeks && weeks.length > 0 ? (
                    weeks.map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <h4 className="font-medium">{w.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            ライブ収録: {formatLiveRecordingDate(w.liveRecordingDate || '')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditWeek(w)}
                            title="タイトルを編集"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {w.isActive ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                              アクティブ
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSwitchWeek(w.id)}
                              disabled={switchWeekMutation.isPending}
                            >
                              アクティブにする
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground">週がありません</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateWeekDialogOpen} onOpenChange={setIsCreateWeekDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  新しい週を作成
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>新しい週を作成</DialogTitle>
                  <DialogDescription>
                    翌週のネタページを作成してください
                  </DialogDescription>
                </DialogHeader>
                <Form {...weekForm}>
                  <form onSubmit={weekForm.handleSubmit(handleCreateWeek)} className="space-y-4">
                    <FormField
                      control={weekForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>タイトル</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="例: 2025年7月第1週"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={weekForm.control}
                      name="liveRecordingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ライブ収録日時（任意）</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              placeholder="収録日時を選択"
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-sm text-gray-500">
                            例: 2025年7月20日 20:00 - 未設定の場合は「TBD」と表示されます
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={weekForm.control}
                      name="liveUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ライブ配信URL（任意）</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://youtube.com/live/..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-sm text-gray-500">
                            設定するとライブ配信パネルが表示されます
                          </p>
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col gap-2">
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createWeekMutation.isPending}
                      >
                        {createWeekMutation.isPending ? "作成中..." : "週を作成"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        新しい週を作成すると、ユーザーはその期間のネタを投稿できるようになります。
                      </p>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditWeekDialogOpen} onOpenChange={setIsEditWeekDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>週のタイトルを編集</DialogTitle>
                  <DialogDescription>
                    週のタイトルを変更します
                  </DialogDescription>
                </DialogHeader>
                <Form {...editWeekForm}>
                  <form onSubmit={editWeekForm.handleSubmit(handleUpdateWeek)} className="space-y-4">
                    <FormField
                      control={editWeekForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>タイトル</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="例: 2025年7月第1週"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={updateWeekMutation.isPending}
                      >
                        {updateWeekMutation.isPending ? "更新中..." : "更新"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </>
        )}
        <Link href="/submit">
        <Button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary relative group"
          title="ネタを投稿 (キーボードショートカット: N)"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          ネタを投稿
          {/* Tooltip for keyboard shortcut */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            <kbd className="px-1 py-0.5 text-xs font-semibold bg-gray-700 rounded">N</kbd> を押してネタを投稿
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </Button>
        </Link>
      </div>
    </div>
  );
};

export default WeekSelector;
