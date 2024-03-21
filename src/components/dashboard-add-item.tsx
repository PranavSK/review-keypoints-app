import { FC, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  VideoInfoJSON,
  parseInfoJSON,
  videoInfoJSONSchema,
} from "@/lib/loader";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { getVideoDuration } from "@/lib/utils";

export const DashboardAddItem: FC = () => {
  const form = useForm<VideoInfoJSON>({
    resolver: zodResolver(videoInfoJSONSchema),
  });
  const [open, onOpenChange] = useState(false);
  const { setState, setText } = useStore();

  const handleSubmit: SubmitHandler<VideoInfoJSON> = (data) => {
    onOpenChange(false);
    toast.promise(
      async () => {
        const stateItem = await parseInfoJSON(data);
        const seconds = await getVideoDuration(stateItem.videoUrl);
        stateItem.duration = seconds;
        setText((text) => text + "\n" + JSON.stringify(data));
        setState((state) => ({
          ...state,
          [stateItem.mid]: stateItem,
        }));
      },
      {
        loading: "Adding task item...",
        success: "Task item added",
        error: (error) => {
          console.error(error);
          return `Error adding task item: ${error}.`;
        },
      },
    );
  };
  return (
    <Dialog {...{ open, onOpenChange }}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Task Item</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[725px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>Add Task Item</DialogTitle>
              <DialogDescription>
                Add a task item to your list.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="MID"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel>MID</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex flex-col gap-1">
                        <Input {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Video Name"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel>Video Name</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex flex-col gap-1">
                        <Input {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Grade"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel>Grade</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex flex-col gap-1">
                        <Input {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Subject"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex flex-col gap-1">
                        <Input {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Chapter"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel>Chapter</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex flex-col gap-1">
                        <Input {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Video Path"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel>Video Path</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex flex-col gap-1">
                        <Input type="url" {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Sentences Path"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel>Sentences Path</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex flex-col gap-1">
                        <Input type="url" {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="SRT Path"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel>SRT Path</FormLabel>
                    <FormControl>
                      <div className="col-span-3 flex flex-col gap-1">
                        <Input type="url" {...field} />
                        <FormMessage />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
