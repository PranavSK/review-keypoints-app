import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { KeyMoment, initDatabaseFromText, unparseInfoJSON } from "@/lib/loader";
import { StoreProvider, StoreState } from "@/lib/store";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createRootRoute({
  component: Dashboard,
});

function Dashboard() {
  const [state, setState] = useState<StoreState>({});
  const [text, setText] = useState<string>("");
  const [path, setPath] = useState<string>("");

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

  const save = () => {
    let jsonl = "";
    try {
      jsonl = unparseInfoJSON(
        text,
        Object.values(state).reduce(
          (acc, info) => {
            acc[info.mid] = info.keyMoments;
            return acc;
          },
          {} as Record<string, KeyMoment[]>,
        ),
      );
    } catch (error) {
      toast.error("Error saving session file", {
        description: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    window.api.saveSession(jsonl, path);
  };

  return (
    <div className="h-screen">
      {Object.entries(state).length ? (
        <StoreProvider value={{ state, setState, save }}>
          <Outlet />
        </StoreProvider>
      ) : (
        <div className="container p-8">
          <Button onClick={handleClick}>Load session file</Button>
        </div>
      )}
      <Toaster richColors />
      <Button
        className="fixed bottom-4 right-4"
        size="sm"
        variant='outline'
        onClick={() => window.api.openDevTools()}
      >
        DevTools
      </Button>
    </div>
  );
}
