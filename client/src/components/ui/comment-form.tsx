import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitCommentSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await apiRequest("POST", `/api/topics/${topicId}/comments`, {
        name: values.name,
        content: values.content,
      });

      form.reset();
      onCommentAdded();
      
      toast({
        title: "コメントを投稿しました",
        description: "コメントありがとうございます！",
      });
    } catch (error) {
      console.error("Failed to submit comment:", error);
      toast({
        title: "エラー",
        description: "コメントの投稿に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    }
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
