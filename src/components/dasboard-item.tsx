import { Button, buttonVariants } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { KeyMoment, Sentence, keyMomentSchema } from "@/lib/loader";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import * as SliderPrimitive from "@radix-ui/react-slider";
import {
  ComponentRef,
  Dispatch,
  FC,
  Fragment,
  RefObject,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  DotFilledIcon,
  DoubleArrowUpIcon,
  PauseIcon,
  PinLeftIcon,
  PinRightIcon,
  PlayIcon,
  PlusIcon,
  ReloadIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { Slider } from "@/components/ui/slider";
import { calculatePercentage, cn, secondsToTimecode } from "@/lib/utils";
import { useStore, useStoreSlice } from "@/lib/store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface State {
  selectedKeyMoment: number;
  keyMoments: Array<KeyMoment>;
}
type Action =
  | { type: "SELECT_KEY_MOMENT"; payload: number }
  | { type: "MODIFY_KEY_MOMENT"; payload: Partial<KeyMoment> }
  | { type: "ADD_KEY_MOMENT"; payload: { index: number; keyMoment: KeyMoment } }
  | { type: "REMOVE_KEY_MOMENT"; payload: number }
  | { type: "MERGE_KEY_MOMENTS"; payload: number }
  | { type: "MARK_KEY_MOMENT_COMPLETED"; payload: number };
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SELECT_KEY_MOMENT":
      return { ...state, selectedKeyMoment: action.payload };
    case "MODIFY_KEY_MOMENT": {
      const stateCopy = { ...state };
      const keyMomentsCopy = [...state.keyMoments];
      const keyMomentModified = {
        ...keyMomentsCopy[state.selectedKeyMoment],
        ...action.payload,
        isReviewed: false,
      };

      keyMomentsCopy[state.selectedKeyMoment] = keyMomentModified;
      stateCopy.keyMoments = preventRangeOverlap(keyMomentsCopy);
      return stateCopy;
    }
    case "ADD_KEY_MOMENT":
      return {
        ...state,
        keyMoments: [
          ...state.keyMoments.slice(0, action.payload.index),
          action.payload.keyMoment,
          ...state.keyMoments.slice(action.payload.index),
        ],
      };
    case "REMOVE_KEY_MOMENT":
      return {
        ...state,
        selectedKeyMoment:
          state.selectedKeyMoment === state.keyMoments.length - 1
            ? state.selectedKeyMoment - 1
            : state.selectedKeyMoment,
        keyMoments: state.keyMoments.filter((_, i) => i !== action.payload),
      };
    case "MERGE_KEY_MOMENTS": {
      const stateCopy = { ...state };
      const keyMomentsCopy = [...state.keyMoments];
      keyMomentsCopy[action.payload] = mergeKeyMoments(
        keyMomentsCopy[action.payload],
        keyMomentsCopy[action.payload + 1],
      );
      keyMomentsCopy.splice(action.payload + 1, 1);
      stateCopy.keyMoments = keyMomentsCopy;
      return stateCopy;
    }
    case "MARK_KEY_MOMENT_COMPLETED":
      return {
        ...state,
        keyMoments: state.keyMoments.map((keyMoment, i) =>
          i === action.payload ? { ...keyMoment, isReviewed: true } : keyMoment,
        ),
      };
    default:
      return state;
  }
};

function mergeKeyMoments(target: KeyMoment, source: KeyMoment) {
  const targetCopy = { ...target };
  targetCopy.title = `${targetCopy.title}, ${source.title}`;
  targetCopy.concept = `${targetCopy.concept}, ${source.concept}`;
  targetCopy.keyTakeaway = `${targetCopy.keyTakeaway}, ${source.keyTakeaway}`;
  targetCopy.sentenceRange = [
    targetCopy.sentenceRange[0],
    source.sentenceRange[1],
  ];
  targetCopy.isReviewed = false;

  return targetCopy;
}

function preventRangeOverlap(ranges: KeyMoment[]) {
  // Sort in ascending order of start time
  // Then reduce reverse to build a stack adjusting the start times of subsequent ranges
  const sorted = ranges.sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]);
  const stack: KeyMoment[] = [];
  for (const cur of sorted.reverse()) {
    const [start, end] = cur.sentenceRange;
    let next = { ...cur };
    if (stack[0] && end >= stack[0].sentenceRange[0]) {
      while (stack[0] && end >= stack[0].sentenceRange[1]) {
        next = mergeKeyMoments(next, stack[0]);
        next.sentenceRange = [start, end];
        stack.shift();
      }
      stack[0].sentenceRange[0] = end + 1;
    }
    stack.unshift(next);
  }

  return stack;
}

interface DashboardItemContext {
  sentences: Sentence[];
  state: State;
  dispatch: Dispatch<Action>;
  videoRef: RefObject<ComponentRef<"video">>;
}
const context = createContext<DashboardItemContext | null>(null);
const useDashboardItemContext = () => {
  const ctx = useContext(context);
  if (!ctx)
    throw new Error(
      "useDashboardItemContext must be used within a DashboardItemProvider",
    );
  return ctx;
};
const DashboardItemProvider = context.Provider;

export const DashboardItem: FC = () => {
  const { editMid } = useStore();
  if (!editMid) throw new Error("mid should not be null here");
  const {
    state: { name, videoUrl, sentences, keyMoments: origKeyMoments },
    setState: updateList,
    save,
  } = useStoreSlice(editMid); // mid shoul not be null here
  const [state, dispatch] = useReducer(reducer, {
    selectedKeyMoment: 0,
    keyMoments: origKeyMoments,
  });
  const videoRef = useRef<ComponentRef<"video">>(null);

  useEffect(() => {
    updateList(state.keyMoments);
  }, [state.keyMoments, updateList]);

  return (
    <DashboardItemProvider value={{ sentences, state, dispatch, videoRef }}>
      <div className="h-full flex flex-col">
        <Header name={name} />
        <ResizablePanelGroup direction="horizontal" className="grow">
          <ResizablePanel
            defaultSize={30}
            minSize={20}
            maxSize={40}
            className="py-2"
          >
            <KeyMomentsList />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            defaultSize={30}
            minSize={20}
            maxSize={40}
            className="py-2"
          >
            <SentenceList />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40}>
            <AspectRatio ratio={16 / 9} className="bg-muted">
              <video
                src={videoUrl}
                controls
                className="size-full object-cover"
                ref={videoRef}
              ></video>
            </AspectRatio>
            {state.keyMoments.length > 0 && <KeyMomentRangeControls />}
            <VideoControls />
            <VideoFooter save={save} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DashboardItemProvider>
  );
};

function VideoFooter({ save }: { save: () => void }) {
  useEffect(() => {
    const handleSaveKey = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handleSaveKey);
    return () => window.removeEventListener("keydown", handleSaveKey);
  }, []);
  return (
    <div className="p-4 flex justify-end items-center">
      <Button onClick={save}>Save</Button>
    </div>
  );
}

function Header({ name }: { name: string }) {
  const { setEditMid } = useStore();
  return (
    <div className="px-6 py-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Button variant="link" onClick={() => setEditMid(null)}>
                Dashboard
              </Button>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

function VideoControls() {
  const { sentences, state, videoRef, dispatch } = useDashboardItemContext();
  const activeTimeRange = useMemo(() => {
    if (!state.keyMoments[state.selectedKeyMoment]) return [0, 1];
    const activeSentenceRange =
      state.keyMoments[state.selectedKeyMoment].sentenceRange;

    return [
      sentences[activeSentenceRange[0]].timeRange[0],
      sentences[activeSentenceRange[1]].timeRange[1],
    ];
  }, [sentences, state.keyMoments, state.selectedKeyMoment]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const isKeymomentModeRef = useRef(false);
  const triggerKeymomentModeRef = useRef(false);

  const handleSliderValueChange = useDebouncedCallback(([value]: number[]) => {
    setCurrentTime(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  }, 100);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      if (triggerKeymomentModeRef.current) {
        triggerKeymomentModeRef.current = false;
        isKeymomentModeRef.current = true;
      } else {
        isKeymomentModeRef.current = false;
      }
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeupdate = () => {
      setCurrentTime(video.currentTime);
      if (
        isKeymomentModeRef.current &&
        video.currentTime >= activeTimeRange[1]
      ) {
        video.pause();
        video.currentTime = activeTimeRange[0];
      }
    };
    video.addEventListener("timeupdate", handleTimeupdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeupdate);
    };
  }, [videoRef, activeTimeRange]);

  const handlePrevious = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const sentence = sentences.findIndex((s) => s.timeRange[1] >= currentTime);
    if (sentence < 1) return;
    video.currentTime = sentences[sentence - 1].timeRange[0];
  };
  const handleNext = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const sentence = sentences.findIndex((s) => s.timeRange[1] >= currentTime);
    if (sentence < 0 || sentence >= sentences.length - 1) return;
    video.currentTime = sentences[sentence + 1].timeRange[0];
  };
  const handlePinStart = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const sentence = sentences.findIndex((s) => s.timeRange[1] >= currentTime);
    dispatch({
      type: "MODIFY_KEY_MOMENT",
      payload: {
        sentenceRange: [
          sentence,
          state.keyMoments[state.selectedKeyMoment].sentenceRange[1],
        ],
      },
    });
  };
  const handlePinEnd = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const sentence = sentences.findIndex((s) => s.timeRange[1] >= currentTime);
    dispatch({
      type: "MODIFY_KEY_MOMENT",
      payload: {
        sentenceRange: [
          state.keyMoments[state.selectedKeyMoment].sentenceRange[0],
          sentence,
        ],
      },
    });
  };
  return (
    <>
      <div className="flex items-center p-4 gap-2">
        <Slider
          min={activeTimeRange[0]}
          max={activeTimeRange[1]}
          step={0.01}
          value={[currentTime]}
          onValueChange={handleSliderValueChange}
        />
      </div>

      <div className="flex items-center justify-center p-4 gap-2">
        {isPlaying ? (
          <Button
            size="rounded-icon"
            className="shrink-0"
            variant="secondary"
            onClick={() => videoRef.current?.pause()}
          >
            <PauseIcon />
          </Button>
        ) : (
          <Button
            size="rounded-icon"
            className="shrink-0"
            onClick={() => {
              triggerKeymomentModeRef.current = true;
              const video = videoRef.current;
              if (!video) return;
              if (
                video.currentTime < activeTimeRange[0] ||
                video.currentTime > activeTimeRange[1]
              )
                video.currentTime = activeTimeRange[0];
              void video.play();
            }}
          >
            <PlayIcon />
          </Button>
        )}
        <Button
          variant="secondary"
          size="rounded-icon"
          className="shrink-0"
          onClick={() => {
            if (videoRef.current)
              videoRef.current.currentTime = activeTimeRange[0];
          }}
        >
          <ReloadIcon />
        </Button>
        <Tooltip>
          <TooltipTrigger
            onClick={handlePrevious}
            className={buttonVariants({
              variant: "secondary",
              size: "rounded-icon",
            })}
          >
            <CaretLeftIcon />
          </TooltipTrigger>
          <TooltipContent>Previous Sentence</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            onClick={handleNext}
            className={buttonVariants({
              variant: "secondary",
              size: "rounded-icon",
            })}
          >
            <CaretRightIcon />
          </TooltipTrigger>
          <TooltipContent>Next Sentence</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            onClick={handlePinStart}
            className={buttonVariants({
              variant: "secondary",
              size: "rounded-icon",
            })}
          >
            <PinLeftIcon />
          </TooltipTrigger>
          <TooltipContent>
            Pin start of active key moment to the current sentence.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            onClick={handlePinEnd}
            className={buttonVariants({
              variant: "secondary",
              size: "rounded-icon",
            })}
          >
            <PinRightIcon />
          </TooltipTrigger>
          <TooltipContent>
            Pin end of active key moment to the current sentence.
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}

function KeyMomentRangeControls() {
  const { sentences, state, dispatch } = useDashboardItemContext();
  const activeSentenceRange =
    state.keyMoments[state.selectedKeyMoment].sentenceRange;
  const handleSliderValueChange = (value: [number, number]) => {
    dispatch({
      type: "MODIFY_KEY_MOMENT",
      payload: { sentenceRange: [value[0], value[1] - 1] },
    });
  };

  const min = 0;
  const max = sentences.length - 1;

  return (
    <SliderPrimitive.Root
      className="relative flex touch-none select-none w-full"
      min={0}
      max={sentences.length - 1}
      step={1}
      value={[activeSentenceRange[0], activeSentenceRange[1] + 1]}
      onValueChange={handleSliderValueChange}
    >
      <SliderPrimitive.Track
        className="relative h-12 w-full grow overflow-hidden bg-red-600"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {state.keyMoments.map(({ title, sentenceRange }, i) => {
          const start = calculatePercentage(sentenceRange[0], { min, max });
          const end = calculatePercentage(sentenceRange[1] + 1, { min, max });
          return (
            <span
              key={i}
              className="absolute h-full bg-secondary border-x line-clamp-2 px-2"
              style={{ left: `${start}%`, right: `${100 - end}%` }}
              onPointerDown={(e) => {
                e.stopPropagation();
                dispatch({ type: "SELECT_KEY_MOMENT", payload: i });
              }}
            >
              {title}
            </span>
          );
        })}
        <SliderPrimitive.Range className="absolute h-full bg-primary text-primary-foreground line-clamp-2 px-2">
          {state.keyMoments[state.selectedKeyMoment].title}
        </SliderPrimitive.Range>
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-12 w-2 rounded-md border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
      <SliderPrimitive.Thumb className="block h-12 w-2 rounded-md border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
}

function SentenceList() {
  const { sentences, state, videoRef } = useDashboardItemContext();
  const [currrentSentence, setCurentSentence] = useState(0);
  const [currentSentenceProgress, setCurrentSentenceProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeupdate = () => {
      const currentTime = video.currentTime;
      const sentence = sentences.findIndex(
        (s) => s.timeRange[1] >= currentTime,
      );
      setCurentSentence(sentence);
      const duration =
        sentences[sentence].timeRange[1] - sentences[sentence].timeRange[0];
      const progress = currentTime - sentences[sentence].timeRange[0];
      setCurrentSentenceProgress((progress / duration) * 100);
    };
    video.addEventListener("timeupdate", handleTimeupdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeupdate);
    };
  }, [videoRef]);

  const groups = useMemo(() => {
    interface Group {
      keyMomentIndex: number;
      sentences: { sentence: string; sentenceIndex: number }[];
    }
    const groups: Group[] = [];
    let currentGroup: Group = { keyMomentIndex: -1, sentences: [] };
    function pushGroup() {
      if (currentGroup.sentences.length) {
        groups.push(currentGroup);
        currentGroup = { keyMomentIndex: -1, sentences: [] };
      }
    }
    let index = 0;
    for (let i = 0; i < sentences.length; i++) {
      const { value } = sentences[i];
      if (i === state.keyMoments[index]?.sentenceRange[0]) {
        pushGroup();
        currentGroup.keyMomentIndex = index;
        currentGroup.sentences.push({ sentence: value, sentenceIndex: i });
      } else if (i === state.keyMoments[index]?.sentenceRange[1]) {
        currentGroup.sentences.push({ sentence: value, sentenceIndex: i });
        pushGroup();
        index++;
      } else {
        currentGroup.sentences.push({ sentence: value, sentenceIndex: i });
      }
    }
    pushGroup();
    return groups;
  }, [sentences, state.keyMoments]);

  const scrollKeymomentAnchors = useRef<ComponentRef<"li">[]>([]);
  const scrollSentenceAnchors = useRef<ComponentRef<"li">[]>([]);
  const scrollContainer = useRef<ComponentRef<typeof ScrollArea>>(null);

  // useEffect(() => {
  //   const anchor = scrollKeymomentAnchors.current[state.selectedKeyMoment];
  //   const container = scrollContainer.current;
  //   if (!anchor || !container) return;
  //   const { top } = anchor.getBoundingClientRect();
  //   const { top: containerTop, height: containerHeight } =
  //     container.getBoundingClientRect();
  //   const distanceRatio = (top - containerTop) / containerHeight;
  //   anchor.scrollIntoView({
  //     behavior: "smooth",
  //     block: distanceRatio > 0.5 ? "start" : "nearest",
  //   });
  // }, [state.selectedKeyMoment]);

  useEffect(() => {
    const anchor = scrollSentenceAnchors.current[currrentSentence];
    const container = scrollContainer.current;
    if (!anchor || !container) return;

    const { top } = anchor.getBoundingClientRect();
    const { top: containerTop, height: containerHeight } =
      container.getBoundingClientRect();
    const distanceRatio = (top - containerTop) / containerHeight;
    anchor.scrollIntoView({
      behavior: "smooth",
      block: distanceRatio > 0.5 ? "start" : "nearest",
    });
  }, [currrentSentence]);

  return (
    <>
      <h2 className="text-lg font-semibold tracking-tight px-7 h-8">
        Sentences
      </h2>
      <ScrollArea className="px-1 h-[calc(100%-2rem)]" ref={scrollContainer}>
        <ol className="list-decimal px-2 pb-6 flex flex-col gap-2 [&_li]:ml-8 marker:text-secondary-foreground/30">
          {groups.map(({ keyMomentIndex, sentences }, i) => (
            <Fragment key={i}>
              <div
                key={i}
                className={cn(
                  "border-l",
                  keyMomentIndex !== state.selectedKeyMoment &&
                  "text-muted-foreground",
                  keyMomentIndex === -1 && "text-destructive",
                )}
              >
                {/* {keyMomentIndex !== -1 && <span className='font-bold uppercase'>{state.keyMoments[keyMomentIndex].title}</span>} */}
                {sentences.map(({ sentence, sentenceIndex }, j) => (
                  <li
                    key={j}
                    ref={(el) => {
                      if (!el) return;
                      scrollSentenceAnchors.current[sentenceIndex] = el;
                      if (j === 0 && keyMomentIndex > -1)
                        scrollKeymomentAnchors.current[keyMomentIndex] = el;
                    }}
                    className="snap-start relative"
                  >
                    {currrentSentence === sentenceIndex && (
                      <span
                        className="bg-lime-400/40 absolute -left-8 h-full"
                        style={{ right: `${100 - currentSentenceProgress}%` }}
                      />
                    )}
                    {sentence}
                  </li>
                ))}
              </div>
              {i != groups.length - 1 && <Separator />}
            </Fragment>
          ))}
        </ol>
      </ScrollArea>
    </>
  );
}

function KeyMomentsList() {
  const { state, dispatch } = useDashboardItemContext();
  return (
    <ResizablePanelGroup direction="vertical">
      <div className="flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold tracking-tight h-8">
          Key Moments
        </h2>
        {state.keyMoments.length == 0 && <InsertKeymoment at={0} />}
      </div>
      <ResizablePanel defaultSize={25}>
        <ScrollArea className="px-1 h-full">
          <RadioGroup
            value={`${state.selectedKeyMoment}`}
            onValueChange={(i) =>
              dispatch({ type: "SELECT_KEY_MOMENT", payload: parseInt(i) })
            }
            className="flex flex-col justify-start items-start max-w-full px-5 py-2"
          >
            {state.keyMoments.map((moment, i) => (
              <div key={i} className="group flex flex-col">
                <div className="grid grid-cols-[1rem,1rem,auto,1rem] items-center gap-2">
                  {moment.isReviewed ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <div />
                  )}
                  <RadioGroupItem value={`${i}`} id={`id-${i}`} />
                  <Label htmlFor={`id-${i}`}>
                    {moment.title}{" "}
                    <span>
                      <KeyMomentDuration index={i} />
                    </span>
                  </Label>
                  <Button
                    className="size-4 hidden group-hover:inline-block"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      dispatch({ type: "REMOVE_KEY_MOMENT", payload: i })
                    }
                  >
                    <TrashIcon />
                  </Button>
                </div>
                <div className="flex self-stretch justify-center invisible group-hover:visible">
                  <InsertKeymoment at={i + 1} />
                  {i != state.keyMoments.length - 1 && (
                    <MergeKeyMoments at={i} />
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle />
      {state.keyMoments.length && (
        <ResizablePanel>
          <KeyMomentEditor momentIndex={state.selectedKeyMoment} />
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
}

function KeyMomentDuration({ index }: { index: number }) {
  const { sentences, state } = useDashboardItemContext();

  const activeSentenceRange = state.keyMoments[index].sentenceRange;
  const duration =
    sentences[activeSentenceRange[1]].timeRange[1] -
    sentences[activeSentenceRange[0]].timeRange[0];

  return (
    <span className="text-xs text-muted-foreground">
      {secondsToTimecode(duration)}
    </span>
  );
}

const defaultKeyMoment = keyMomentSchema.parse({});
interface KeyMomentEditorProps {
  momentIndex: number;
}
function KeyMomentEditor({ momentIndex }: KeyMomentEditorProps) {
  const { sentences, state, dispatch } = useDashboardItemContext();
  const sentenceCount = sentences.length;
  const moment = state.keyMoments[momentIndex];

  const form = useForm<KeyMoment>({
    resolver: zodResolver(keyMomentSchema),
    defaultValues: moment,
  });

  useEffect(() => {
    form.reset(moment);
  }, [moment, momentIndex, form]);

  const handleSubmit: SubmitHandler<z.infer<typeof keyMomentSchema>> = (
    data,
  ) => {
    dispatch({ type: "MODIFY_KEY_MOMENT", payload: data });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full flex flex-col h-full"
      >
        <CardHeader>
          <CardTitle>Edit Selected Key Moment</CardTitle>
        </CardHeader>

        <ScrollArea className="h-full">
          <CardContent className="flex-1 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concept</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keyTakeaway"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Takeaway</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sentenceRange"
              render={({ field: { value, onChange, onBlur, ref } }) => (
                <FormItem>
                  <FormLabel>Sentence Range</FormLabel>
                  <FormControl>
                    <div className="flex flex-row items-center space-x-2">
                      <Label htmlFor="start">Start</Label>
                      <Input
                        id="start"
                        type="number"
                        min="1"
                        max={sentenceCount}
                        value={value[0] + 1}
                        onChange={(e) =>
                          onChange([+e.target.value - 1, value[1]])
                        }
                        onBlur={onBlur}
                        ref={ref}
                      />
                      <Label htmlFor="end">End</Label>
                      <Input
                        id="end"
                        type="number"
                        min="1"
                        max={sentenceCount}
                        value={value[1] + 1}
                        onChange={(e) =>
                          onChange([value[0], +e.target.value - 1])
                        }
                        onBlur={onBlur}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </ScrollArea>
        <CardFooter className="flex justify-end gap-2 pt-1">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="relative"
          >
            {form.formState.isDirty && (
              <DotFilledIcon className="size-6 absolute -top-2 -right-2" />
            )}
            Update
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() =>
              dispatch({
                type: "MARK_KEY_MOMENT_COMPLETED",
                payload: momentIndex,
              })
            }
          >
            Mark Reviewed
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}

function InsertKeymoment({ at }: { at: number }) {
  const { sentences, state, dispatch } = useDashboardItemContext();
  const nextAvailableSentenceRange: [number, number] = useMemo(() => {
    const currentEnd = state.keyMoments[at - 1]?.sentenceRange[1] ?? -1;
    const nextStart =
      (state.keyMoments[at]?.sentenceRange[0] ?? sentences.length) - 1;
    return [currentEnd + 1, nextStart];
  }, [sentences, state.keyMoments, at]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-4"
      onClick={() => {
        if (nextAvailableSentenceRange[1] - nextAvailableSentenceRange[0] >= 0)
          dispatch({
            type: "ADD_KEY_MOMENT",
            payload: {
              index: at,
              keyMoment: {
                ...defaultKeyMoment,
                sentenceRange: nextAvailableSentenceRange,
              },
            },
          });
      }}
    >
      <PlusIcon />
    </Button>
  );
}

function MergeKeyMoments({ at }: { at: number }) {
  const { dispatch } = useDashboardItemContext();
  return (
    <Button
      variant="secondary"
      size="icon"
      className="size-4"
      onClick={() => dispatch({ type: "MERGE_KEY_MOMENTS", payload: at })}
    >
      <DoubleArrowUpIcon />
    </Button>
  );
}
