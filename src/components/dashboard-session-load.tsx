import { initDatabaseFromText } from "@/lib/loader";
import { useStore } from "@/lib/store";
import { FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";

export const DashboardSessionLoad: FC = () => {
  const { setState, path, setPath, setText } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const handleClick = async () => {
    setIsOpen(false);
    const inputPath = await window.api.getOpenPath(path ? path : undefined);
    if (!inputPath) return;
    setPath(inputPath);
    const text = await window.api.getSession(inputPath);
    setText(text);
    try {
      const data = await initDatabaseFromText(text);
      setState(data);
    } catch (error) {
      toast.error("Error loading session file", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Load session file</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Load Session</DialogTitle>
          <DialogDescription>
            Loading a session file will overwrite your current session. Are you
            sure you wish to proceed?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClick}>Yes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
