const BASE_URL = 'http://localhost:2123/files'

export function getVideoURL(mid: string) {
  return `${BASE_URL}/${mid}/video.mp4`
}

export interface VideoInfo {
  mid: string
  name: string
  grade: string
  subject: string
  chapter: string
  duration: number
}

interface VideoInfoJSON {
  "MID": string
  "Video Name": string
  "Grade": string
  "Subject": string
  "Chapter": string
  "Duration (minute)": number
}

export async function getVideoInfo(mid: string) {
  const res = await fetch(`${BASE_URL}/${mid}/index.json`)
  const json = await res.json() as VideoInfoJSON
  return parseInfoJSON(json)
}

function parseInfoJSON(json: VideoInfoJSON): VideoInfo {
  return {
    mid: json.MID,
    name: json["Video Name"],
    grade: json.Grade,
    subject: json.Subject,
    chapter: json.Chapter,
    duration: json["Duration (minute)"] * 60
  }
}

type TimeRange = [number, number] // seconds
export interface Sentence {
  timeRange: TimeRange
  value: string
}
type SentencesJSON = Array<{
  'SL': number,
  "Start Timecode": string,
  "End Timecode": string, "Sentence": string
}>

export async function getSentences(mid: string) {
  const res = await fetch(`${BASE_URL}/${mid}/sentences.json`)
  const json = await res.json() as SentencesJSON
  return parseSentencesJSON(json)
}

function parseSentencesJSON(json: SentencesJSON): Sentence[] {
  return json.sort((a, b) => a.SL - b.SL).map(s => {
    const start = parseTimecode(s["Start Timecode"])
    const end = parseTimecode(s["End Timecode"])
    return {
      timeRange: [start, end],
      value: s.Sentence
    }
  })
}

function parseTimecode(code: string) {
  // Time is of the format "hh:mm:ss,ms" (e.g. "00:01:23,456")
  const [hh, mm, ssms] = code.split(':')
  const [ss, ms] = ssms.split(',')
  return parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss) + parseInt(ms) / 1000
}

export interface KeyMoment {
  title: string,
  sentenceRange: [number, number],
  concept: string,
  keyTakeaway: string
}

type KeyMomentsJSON = Array<{
  "Title": string,
  "Start SL": number,
  "End SL": number,
  "Concept": string,
  "Key Takeaway": string,
  "Examples": string[]
}>

export async function getKeyMoments(mid: string) {
  const res = await fetch(`${BASE_URL}/${mid}/key-moments.json`)
  const json = await res.json() as KeyMomentsJSON
  return parseKeyMomentsJSON(json)
}

function parseKeyMomentsJSON(json: KeyMomentsJSON): KeyMoment[] {
  return json.map(k => {
    return {
      title: k.Title,
      sentenceRange: [k["Start SL"] - 1, k["End SL"] - 1], // 1-indexed to 0-indexed
      concept: k.Concept,
      keyTakeaway: k["Key Takeaway"],
    }
  })
}
