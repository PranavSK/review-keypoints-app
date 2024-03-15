import { Button } from "@/components/ui/button";
import { KeyMoment, initDatabaseFromText, unparseInfoJSON } from "@/lib/loader";
import { StoreProvider, StoreState } from "@/lib/store";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

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
    const data = await initDatabaseFromText(text);
    setState(data);
  };

  const save = () => {
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
    </div>
  );
}
