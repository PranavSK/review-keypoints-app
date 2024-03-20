import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { KeyMoment, initDatabaseFromText, unparseInfoJSON } from "@/lib/loader";
import { StoreProvider, StoreState, useStore } from "@/lib/store";
import { FC, useState } from "react";
import { toast } from "sonner";
import { DashboardList } from "./dasboard-list";
import { DashboardItem } from "./dasboard-item";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Dashboard: FC = () => {
  const [state, setState] = useState<StoreState>({});
  const [text, setText] = useState<string>("");
  const [path, setPath] = useState<string>("");
  const [editMid, setEditMid] = useState<string | null>(null);

  const save = () => {
    toast.promise(
      async () => {
        const jsonl = unparseInfoJSON(
          text,
          Object.values(state).reduce(
            (acc, info) => {
              acc[info.mid] = info.keyMoments;
              return acc;
            },
            {} as Record<string, KeyMoment[]>,
          ),
        );

        const savePath = path || (await window.api.getSavePath());
        setPath(savePath);
        window.api.saveSession(jsonl, savePath);
        return savePath;
      },
      {
        loading: "Saving session file...",
        success: (data) => `Session file saved at ${data}`,
        error: (error) =>
          `Error saving session file: ${error instanceof Error ? error.message : String(error)}`,
      },
    );
  };

  return (
    <TooltipProvider>
      <div className="h-screen">
        <StoreProvider
          value={{
            state,
            setState,
            save,
            path,
            setPath,
            text,
            setText,
            editMid,
            setEditMid,
          }}
        >
          {editMid ? (
            <DashboardItem />
          ) : Object.entries(state).length ? (
            <DashboardList />
          ) : (
            <div className="container p-8">
              <LoadSessionButton />
            </div>
          )}
        </StoreProvider>
        <Toaster richColors />
        <Button
          className="fixed bottom-4 right-4"
          size="sm"
          variant="outline"
          onClick={() => window.api.openDevTools()}
        >
          DevTools
        </Button>
      </div>
    </TooltipProvider>
  );
};

const LoadSessionButton: FC = () => {
  const { setState, path, setPath, setText } = useStore();
  const handleClick = async () => {
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
  return <Button onClick={handleClick}>Load session file</Button>;
};
