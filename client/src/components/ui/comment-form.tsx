import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitCommentSchema, Comment } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface CommentFormProps {
  topicId: number;
  onCommentAdded: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ topicId, onCommentAdded }) => {
  const { toast } = useToast();
  
  // Extended schema with custom validation
  const formSchema = submitCommentSchema.extend({
    name: z.string().min(1, "お名前を入力してください"),
    content: z.string().min(1, "コメントを入力してください"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      content: "",
    },
  });

  // コメント追加のミューテーション（楽観的UI更新対応）
  const addCommentMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      return apiRequest("POST", `/api/topics/${topicId}/comments`, {
        name: data.name,
        content: data.content,
      });
    },
    // 楽観的更新: APIレスポンスを待たずにUIを更新
    onMutate: async (newComment) => {
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: [`/api/topics/${topicId}`] });
      
      // 現在のトピックデータをスナップショットとして保存
      const previousTopicData = queryClient.getQueryData([`/api/topics/${topicId}`]);
      
      // キャッシュを楽観的に更新（新しいコメントを追加）
      queryClient.setQueryData([`/api/topics/${topicId}`], (oldData: any) => {
        if (!oldData) return oldData;
        
        // 楽観的に作成される新しいコメント（仮のID等を設定）
        const optimisticComment: Comment = {
          id: Math.floor(Math.random() * -1000000), // 一時的な負のID
          topicId: topicId,
          name: newComment.name,
          content: newComment.content,
          createdAt: new Date(),
        };
        
        // 新しいコメントを追加したトピックデータを返す
        return {
          ...oldData,
          comments: [...(oldData.comments || []), optimisticComment]
        };
      });
      
      // ロールバック用に前の状態を返す
      return { previousTopicData };
    },
    onError: (err, newComment, context) => {
      // エラー時は以前の状態に戻す
      if (context?.previousTopicData) {
        queryClient.setQueryData([`/api/topics/${topicId}`], context.previousTopicData);
      }
      console.error("Failed to submit comment:", err);
      toast({
        title: "エラー",
        description: "コメントの投稿に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      form.reset();
      onCommentAdded();
      
      toast({
        title: "コメントを投稿しました",
        description: "コメントありがとうございます！",
      });
      
      // 必要なクエリを無効化して再フェッチする
      queryClient.invalidateQueries({ queryKey: [`/api/topics/${topicId}`] });
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // 楽観的UI更新を使ったミューテーション実行
    addCommentMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
        <div className="flex-1">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="mb-2">
                <FormControl>
                  <Input
                    placeholder="お名前"
                    {...field}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="コメントを追加..."
                    rows={2}
                    {...field}
                    className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="mt-3 flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {form.formState.isSubmitting ? "送信中..." : "コメントする"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CommentForm;
