import { Dispatch, SetStateAction, createContext, useContext } from "react";
import { KeyMoment, VideoInfo } from "./loader";

export type StoreState = Record<string, VideoInfo>;
const context = createContext<{
  state: StoreState;
  setState: Dispatch<SetStateAction<StoreState>>;
  save: () => void;
} | null>(null);
export const StoreProvider = context.Provider;
export const useStore = () => {
  const store = useContext(context);
  if (!store) throw new Error("useStore must be used within a StoreProvider");
  return store;
};
export const useStoreSlice = (mid: string) => {
  const store = useContext(context);
  if (!store) throw new Error("useStore must be used within a StoreProvider");
  const innerStore = store.state[mid];
  if (!innerStore) throw new Error(`No store found for mid: ${mid}`);
  const innerSetState = (newKeyMoments: KeyMoment[]) => {
    const newState = { ...store.state[mid], keyMoments: newKeyMoments };
    store.setState({ ...store.state, [mid]: newState });
  };
  return { state: innerStore, setState: innerSetState, save: store.save };
};
