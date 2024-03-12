import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { KeyMoment, Sentence } from '@/lib/loader'
import { AspectRatio } from '@radix-ui/react-aspect-ratio'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ComponentRef, Dispatch, RefObject, createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { z } from 'zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CheckIcon, DotFilledIcon, DoubleArrowUpIcon, PauseIcon, PlayIcon, PlusIcon, ReloadIcon, TrashIcon } from '@radix-ui/react-icons'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { calculatePercentage, cn, secondsToTimecode } from '@/lib/utils'
import { useStoreSlice } from '@/lib/store'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

export const Route = createFileRoute('/dashboard/$mid')({ component: DashboardItemComponent, })

interface State {
  selectedKeyMoment: number;
  keyMoments: Array<KeyMoment>;
  completedKeyMomentIndices: Array<number>;
}
type Action =
  { type: 'SELECT_KEY_MOMENT'; payload: number; } |
  { type: 'MODIFY_KEY_MOMENT'; payload: Partial<KeyMoment>; } |
  { type: 'ADD_KEY_MOMENT'; payload: { index: number; keyMoment: KeyMoment; }; } |
  { type: 'REMOVE_KEY_MOMENT'; payload: number; } |
  { type: 'MERGE_KEY_MOMENTS'; payload: number } |
  { type: 'MARK_KEY_MOMENT_COMPLETED'; payload: number; };
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SELECT_KEY_MOMENT':
      return { ...state, selectedKeyMoment: action.payload };
    case 'MODIFY_KEY_MOMENT': {
      const stateCopy = { ...state };
      const keyMomentsCopy = [...state.keyMoments];
      const keyMomentModified = { ...keyMomentsCopy[state.selectedKeyMoment], ...action.payload };

      keyMomentsCopy[state.selectedKeyMoment] = keyMomentModified;
      stateCopy.keyMoments = preventRangeOverlap(keyMomentsCopy);
      return stateCopy;

    }
    case 'ADD_KEY_MOMENT':
      return { ...state, keyMoments: [...state.keyMoments.slice(0, action.payload.index), action.payload.keyMoment, ...state.keyMoments.slice(action.payload.index)] };
    case 'REMOVE_KEY_MOMENT':
      return { ...state, selectedKeyMoment: state.selectedKeyMoment === state.keyMoments.length - 1 ? state.selectedKeyMoment - 1 : state.selectedKeyMoment, keyMoments: state.keyMoments.filter((_, i) => i !== action.payload) };
    case 'MERGE_KEY_MOMENTS': {
      const stateCopy = { ...state };
      const keyMomentsCopy = [...state.keyMoments];
      const target = { ...keyMomentsCopy[action.payload] };
      const next = keyMomentsCopy[action.payload + 1];
      target.title = `${target.title}, ${next.title}`;
      target.concept = `${target.concept}, ${next.concept}`;
      target.keyTakeaway = `${target.keyTakeaway}, ${next.keyTakeaway}`;
      target.sentenceRange = [target.sentenceRange[0], next.sentenceRange[1]];
      keyMomentsCopy[action.payload] = target;
      keyMomentsCopy.splice(action.payload + 1, 1);
      stateCopy.keyMoments = keyMomentsCopy;
      return stateCopy;
    }
    case 'MARK_KEY_MOMENT_COMPLETED':
      return { ...state, completedKeyMomentIndices: [...state.completedKeyMomentIndices, action.payload] };
    default:
      return state;
  }
};

function preventRangeOverlap(ranges: KeyMoment[]) {
  // Sort in ascending order of start time
  // Then reduce reverse to build a stack adjusting the start times of subsequent ranges
  return ranges.sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]).reduceRight((acc, cur) => {
    const [, end] = cur.sentenceRange
    const prev = acc[0]
    if (prev && end > prev.sentenceRange[0]) {
      prev.sentenceRange[0] = end
    }
    acc.unshift(cur)
    return acc
  }, [] as KeyMoment[])
}

interface DashboardItemContext {
  sentences: Sentence[];
  origKeyMoments: KeyMoment[];
  state: State;
  dispatch: Dispatch<Action>;
  videoRef: RefObject<ComponentRef<'video'>>;
}
const context = createContext<DashboardItemContext | null>(null);
const useDashboardItemContext = () => {
  const ctx = useContext(context);
  if (!ctx) throw new Error('useDashboardItemContext must be used within a DashboardItemProvider');
  return ctx;
};
const DashboardItemProvider = context.Provider;

function DashboardItemComponent() {
  const { mid } = Route.useParams()
  const { state: { name, videoUrl, sentences, keyMoments: origKeyMoments }, setState: save } = useStoreSlice(mid)
  const [state, dispatch] = useReducer(reducer, { selectedKeyMoment: 0, keyMoments: origKeyMoments, completedKeyMomentIndices: [] })
  const videoRef = useRef<ComponentRef<'video'>>(null)

  useEffect(() => {
    save(state.keyMoments)
  }, [state.keyMoments, save])

  return <DashboardItemProvider value={{ sentences, origKeyMoments, state, dispatch, videoRef }}>
    <div className='h-full flex flex-col' >
      <div className='px-6 py-2'>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href='/'>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to='/dashboard/'>Dashboard</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <ResizablePanelGroup direction='horizontal' className='grow'>
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className='py-2'>
          <KeyMomentsList />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className='py-2'>
          <SentenceList />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40}>
          <AspectRatio ratio={16 / 9} className='bg-muted'>
            <video src={videoUrl} controls className='size-full object-cover' ref={videoRef}></video>
          </AspectRatio>
          <KeyMomentRangeControls />
          <KeyMomentVideoControls />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  </DashboardItemProvider>
}

function KeyMomentVideoControls() {
  const { sentences, state, videoRef } = useDashboardItemContext()
  const activeSentenceRange = state.keyMoments[state.selectedKeyMoment].sentenceRange
  const activeTimeRange = useMemo(() => [sentences[activeSentenceRange[0]].timeRange[0], sentences[activeSentenceRange[1]].timeRange[1]], [sentences, activeSentenceRange])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [videoRef])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = activeTimeRange[0]
    const handleTimeupdate = () => {
      setCurrentTime(video.currentTime)
      if (video.currentTime >= activeTimeRange[1]) {
        video.pause()
        video.currentTime = activeTimeRange[0]
      }
    }
    video.addEventListener('timeupdate', handleTimeupdate)
    return () => {
      video.removeEventListener('timeupdate', handleTimeupdate)
    }
  }, [videoRef, activeTimeRange])

  return <div className="flex items-center p-4 gap-2">
    {
      isPlaying
        ? <Button size='rounded-icon' className='shrink-0' variant='secondary' onClick={() => videoRef.current?.pause()}><PauseIcon /></Button>
        : <Button size='rounded-icon' className='shrink-0' onClick={() => { void videoRef.current?.play() }}><PlayIcon /></Button>
    }
    <Button variant='secondary' size='rounded-icon' className='shrink-0' onClick={() => { if (videoRef.current) videoRef.current.currentTime = activeTimeRange[0] }}><ReloadIcon /></Button>
    <Slider min={activeTimeRange[0]} max={activeTimeRange[1]} step={0.01} value={[currentTime]} onValueChange={([value]) => {
      setCurrentTime(value)
      if (videoRef.current) {
        videoRef.current.currentTime = value
      }
    }} />
  </div>
}

function KeyMomentRangeControls() {
  const { sentences, state, dispatch } = useDashboardItemContext()
  const activeSentenceRange = state.keyMoments[state.selectedKeyMoment].sentenceRange
  const handleSliderValueChange = (value: [number, number]) => {
    dispatch({ type: 'MODIFY_KEY_MOMENT', payload: { sentenceRange: value } })
  }

  const min = 0
  const max = sentences.length - 1

  return <SliderPrimitive.Root className='relative flex touch-none select-none w-full' min={0} max={sentences.length - 1} step={1} value={activeSentenceRange} onValueChange={handleSliderValueChange}>
    <SliderPrimitive.Track className='relative h-12 w-full grow overflow-hidden bg-red-600' onPointerDown={(e) => e.stopPropagation()}>
      {state.keyMoments.map(({ title, sentenceRange }, i) => {
        const start = calculatePercentage(sentenceRange[0], { min, max })
        const end = calculatePercentage(sentenceRange[1], { min, max })
        return <span key={i} className='absolute h-full bg-secondary border-x line-clamp-2 px-2' style={{ left: `${start}%`, right: `${100 - end}%` }} onPointerDown={(e) => {
          e.stopPropagation()
          dispatch({ type: 'SELECT_KEY_MOMENT', payload: i })
        }}>{title}</span>
      })}
      <SliderPrimitive.Range className='absolute h-full bg-primary text-primary-foreground line-clamp-2 px-2'>{state.keyMoments[state.selectedKeyMoment].title}</SliderPrimitive.Range>
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className='block h-12 w-2 rounded-md border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50' />
    <SliderPrimitive.Thumb className='block h-12 w-2 rounded-md border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50' />
  </SliderPrimitive.Root>
}

function SentenceList() {
  const { sentences, state } = useDashboardItemContext()

  const groups = useMemo(() => {
    interface Group { keyMomentIndex: number, sentences: string[] }
    const groups: Group[] = []
    let currentGroup: Group = { keyMomentIndex: -1, sentences: [] }
    function pushGroup() {
      if (currentGroup.sentences.length) {
        groups.push(currentGroup)
        currentGroup = { keyMomentIndex: -1, sentences: [] }
      }
    }
    let index = 0
    for (let i = 0; i < sentences.length; i++) {
      const { value } = sentences[i];
      if (i === state.keyMoments[index].sentenceRange[0]) {
        pushGroup()
        currentGroup.keyMomentIndex = index
        currentGroup.sentences.push(value)
      } else if (i === state.keyMoments[index].sentenceRange[1]) {
        currentGroup.sentences.push(value)
        pushGroup()
        index++
      } else {
        currentGroup.sentences.push(value)
      }
    }
    pushGroup()
    return groups
  }, [sentences, state.keyMoments])

  const scrollAnchor = useRef<ComponentRef<'li'>>(null)
  const scrollContainer = useRef<ComponentRef<typeof ScrollArea>>(null)

  useEffect(() => {
    const anchor = scrollAnchor.current
    const container = scrollContainer.current
    if (!anchor || !container) return
    const { top } = anchor.getBoundingClientRect()
    const { top: containerTop, height: containerHeight } = container.getBoundingClientRect()
    const distanceRatio = (top - containerTop) / containerHeight
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth', block: distanceRatio > 0.5 ? 'start' : 'nearest' })
  }, [state.selectedKeyMoment])

  return <>
    <h2 className='text-lg font-semibold tracking-tight px-7'>Sentences</h2>
    <ScrollArea className='px-1 h-full' ref={scrollContainer}>
      <ol className="list-decimal px-2 pb-6 flex flex-col gap-2 [&_li]:ml-8">
        {groups.map(({ keyMomentIndex, sentences }, i) => <>
          <div key={i} className={cn('border-l', keyMomentIndex !== state.selectedKeyMoment && 'text-muted-foreground', keyMomentIndex === -1 && 'text-destructive')}>
            {/* {keyMomentIndex !== -1 && <span className='font-bold uppercase'>{state.keyMoments[keyMomentIndex].title}</span>} */}
            {sentences.map((sentence, j) => <li key={j} ref={i === state.selectedKeyMoment && j === 0 ? scrollAnchor : undefined}>{sentence}</li>)}
          </div>
          {i != groups.length - 1 && <Separator />}
        </>)}
      </ol>
    </ScrollArea>
  </>
}

function KeyMomentsList() {
  const { state, dispatch } = useDashboardItemContext()
  return <ResizablePanelGroup direction='vertical'>
    <div className="flex flex-row justify-between items-center px-6">
      <h2 className='text-lg font-semibold tracking-tight'>Key Moments</h2>
      <Dialog>
        <div className="flex flex-row justify-between items-center">
          <DialogTrigger asChild>
            <Button variant='ghost' size='icon'><PlusIcon /></Button>
          </DialogTrigger>
          <DialogContent>
            <KeyMomentEditor momentIndex={0} isAdding />
          </DialogContent>
        </div>
      </Dialog>
    </div>
    <ResizablePanel defaultSize={25}>
      <ScrollArea className='px-1 h-full'>
        <RadioGroup defaultValue='0' onValueChange={(i) => dispatch({ type: 'SELECT_KEY_MOMENT', payload: parseInt(i) })} className="flex flex-col justify-start items-start max-w-full p-5">
          {state.keyMoments.map((moment, i) => <div className='group flex flex-col'>
            {i === 0 && <div className='flex self-stretch justify-center invisible group-hover:visible'><InsertKeymoment at={0} /></div>}
            <div className='grid grid-cols-[1rem,1rem,auto,1rem] items-center gap-2' >
              {state.completedKeyMomentIndices.includes(i) ? <CheckIcon className='size-4' /> : <div />}
              <RadioGroupItem value={`${i}`} id={`id-${i}`} />
              <Label htmlFor={`id-${i}`}>{moment.title} <span><KeyMomentDuration index={i} /></span></Label>
              <Button className='size-4 hidden group-hover:inline-block' variant='ghost' size='icon' onClick={() => dispatch({ type: 'REMOVE_KEY_MOMENT', payload: i })}><TrashIcon /></Button>
            </div>
            <div className='flex self-stretch justify-center invisible group-hover:visible'><InsertKeymoment at={i + 1} />{i != state.keyMoments.length - 1 && <MergeKeyMoments at={i} />}</div>
          </div>)}
        </RadioGroup>
      </ScrollArea>
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel>
      <KeyMomentEditor momentIndex={state.selectedKeyMoment} />
    </ResizablePanel>
  </ResizablePanelGroup>
}

function KeyMomentDuration({ index }: { index: number }) {
  const { sentences, state } = useDashboardItemContext()

  const activeSentenceRange = state.keyMoments[index].sentenceRange
  const duration = sentences[activeSentenceRange[1]].timeRange[1] - sentences[activeSentenceRange[0]].timeRange[0]

  return <span className='text-xs text-muted-foreground'>{secondsToTimecode(duration)}</span>
}

const keyMomentSchema = z.object({
  index: z.number().default(0),
  title: z.string().default("Title"),
  concept: z.string().default("Concept"),
  keyTakeaway: z.string().default("Key Takeaway"),
  sentenceRange: z.tuple([z.number(), z.number()]).default([0, 0]),
})
const defaultKeyMoment = keyMomentSchema.parse({})
interface KeyMomentEditorProps { momentIndex: number, isAdding?: boolean }
function KeyMomentEditor({ momentIndex, isAdding = false }: KeyMomentEditorProps) {
  const { sentences, origKeyMoments, state, dispatch } = useDashboardItemContext()
  const sentenceCount = sentences.length
  const moment = isAdding ? defaultKeyMoment : state.keyMoments[momentIndex]

  const form = useForm<z.infer<typeof keyMomentSchema>>({ defaultValues: { index: momentIndex, ...moment } })

  useEffect(() => {
    form.reset({ index: momentIndex, ...moment })
  }, [moment, momentIndex, form])


  const handleSubmit: SubmitHandler<z.infer<typeof keyMomentSchema>> = ({ index, ...data }) => {
    if (isAdding) {
      dispatch({ type: 'ADD_KEY_MOMENT', payload: { index, keyMoment: data } })
    } else {
      dispatch({ type: 'MODIFY_KEY_MOMENT', payload: data })
    }
  }

  return <Form {...form}>
    {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
    <form onSubmit={form.handleSubmit(handleSubmit)} className='w-full flex flex-col h-full'>
      <CardHeader>
        <CardTitle>Edit Selected Key Moment</CardTitle>
      </CardHeader>

      <ScrollArea className='h-full'>
        <CardContent className='flex-1 space-y-4'>
          <FormField
            control={form.control}
            name='index'
            render={({ field }) =>
              <FormItem>
                <FormLabel>Index</FormLabel>
                <FormControl>
                  <Input type='number' min='0' max={state.keyMoments.length} {...field} disabled={!isAdding} />
                </FormControl>
                <FormMessage />
              </FormItem>
            } />
          <FormField
            control={form.control}
            name='title'
            render={({ field }) =>
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            } />
          <FormField
            control={form.control}
            name='concept'
            render={({ field }) =>
              <FormItem>
                <FormLabel>Concept</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            } />
          <FormField
            control={form.control}
            name='keyTakeaway'
            render={({ field }) =>
              <FormItem>
                <FormLabel>Key Takeaway</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            } />
          <FormField
            control={form.control}
            name='sentenceRange'
            render={({ field: { value, onChange, onBlur, ref } }) =>
              <FormItem>
                <FormLabel>Sentence Range</FormLabel>
                <FormControl>
                  <div className="flex flex-row items-center space-x-2">
                    <Label htmlFor='start'>Start</Label>
                    <Input id='start' type='number' min='1' max={sentenceCount} value={value[0] + 1} onChange={(e) => onChange([+e.target.value - 1, value[1]])} onBlur={onBlur} ref={ref} />
                    <Label htmlFor='end'>End</Label>
                    <Input id='end' type='number' min='1' max={sentenceCount} value={value[1] + 1} onChange={e => onChange([value[0], +e.target.value - 1])} onBlur={onBlur} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            } />
        </CardContent>
      </ScrollArea>
      <CardFooter className='flex justify-end gap-1 pt-1'>
        {
          isAdding
            ? <Button type='submit' className='relative'>{form.formState.isDirty && <DotFilledIcon className='size-6 absolute -top-2 -right-2' />}Add</Button>
            : <>
              <Button type='button' variant='outline' onClick={() => dispatch({ type: 'MODIFY_KEY_MOMENT', payload: origKeyMoments[momentIndex] })}>Reset</Button>
              <Button type='submit' variant='secondary' className='relative'>{form.formState.isDirty && <DotFilledIcon className='size-6 absolute -top-2 -right-2' />}Update</Button>
              <Button type='button' variant='default' onClick={() => dispatch({ type: 'MARK_KEY_MOMENT_COMPLETED', payload: momentIndex })}>Mark Reviewed</Button>
            </>
        }
      </CardFooter>
    </form>
  </Form>
}

function InsertKeymoment({ at }: { at: number }) {
  const { dispatch } = useDashboardItemContext()

  return <Button variant='ghost' size='icon' className='size-4' onClick={() => dispatch({ type: 'ADD_KEY_MOMENT', payload: { index: at, keyMoment: defaultKeyMoment } })}><PlusIcon /></Button>
}

function MergeKeyMoments({ at }: { at: number }) {
  const { dispatch } = useDashboardItemContext()
  return <Button variant='secondary' size='icon' className='size-4' onClick={() => dispatch({ type: 'MERGE_KEY_MOMENTS', payload: at })}><DoubleArrowUpIcon /></Button>
}
