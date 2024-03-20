import Papa from "papaparse";

interface VideoInfoJSON {
  MID: string;
  "Video Name": string;
  Grade: string;
  Subject: string;
  Chapter: string;
  "Duration (minute)": number;
  "Video Path": string;
  "Sentences Path": string;
  "Key Moment":
  | {
    Title: string;
    "Start SL": number;
    "End SL": number;
    Concept: string;
    "Key Takeaway": string;
    "Is Reviewed"?: boolean;
  }[]
  | undefined;
}

interface SentenceJSON {
  MID: string;
  SL: number;
  "Start Timecode": string;
  "End Timecode": string;
  Sentence: string;
}

type TimeRange = [number, number]; // seconds
export interface Sentence {
  timeRange: TimeRange;
  value: string;
}
export interface KeyMoment {
  title: string;
  sentenceRange: [number, number];
  concept: string;
  keyTakeaway: string;
  isReviewed: boolean;
}
export interface VideoInfo {
  mid: string;
  name: string;
  grade: string;
  subject: string;
  chapter: string;
  duration: number;
  videoUrl: string;
  sentences: Sentence[];
  keyMoments: KeyMoment[];
}

export async function initDatabaseFromText(text: string) {
  const jsonList = text
    .split("\n")
    .filter(Boolean)
    .map((row) => JSON.parse(row) as VideoInfoJSON);
  const database = {} as Record<string, VideoInfo>;
  for (const json of jsonList) {
    const info = await parseInfoJSON(json);
    database[info.mid] = info;
  }

  return database;
}

export function unparseInfoJSON(
  originalJsonText: string,
  keyMoments: Record<string, KeyMoment[]>,
) {
  return originalJsonText
    .split("\n")
    .filter(Boolean)
    .map((row) => JSON.parse(row) as VideoInfoJSON)
    .map((json) => {
      const newJson = {
        ...json,
        "Key Moment": keyMoments[json.MID].map(unparseKeyMomentJSON),
      };
      return newJson;
    })
    .map((s) => JSON.stringify(s))
    .join("\n");
}

function unparseKeyMomentJSON(keyMoment: KeyMoment) {
  return {
    Title: keyMoment.title,
    "Start SL": keyMoment.sentenceRange[0] + 1, // 0-indexed to 1-indexed
    "End SL": keyMoment.sentenceRange[1] + 1, // 0-indexed to 1-indexed
    Concept: keyMoment.concept,
    "Key Takeaway": keyMoment.keyTakeaway,
    "Is Reviewed": keyMoment.isReviewed,
  };
}

async function parseInfoJSON(json: VideoInfoJSON): Promise<VideoInfo> {
  const sentences = await parseSentencesJSON(json["Sentences Path"]);
  return {
    mid: json.MID,
    name: json["Video Name"],
    grade: json.Grade,
    subject: json.Subject,
    chapter: json.Chapter,
    duration: json["Duration (minute)"] * 60,
    videoUrl: json["Video Path"],
    sentences: sentences[json.MID],
    keyMoments: parseKeyMomentsJSON(json["Key Moment"]),
  };
}

const cachedSentences = new Map<string, Record<string, Sentence[]>>();
async function parseSentencesJSON(
  url: string,
): Promise<Record<string, Sentence[]>> {
  return new Promise((resolve, reject) => {
    if (cachedSentences.has(url)) {
      return resolve(cachedSentences.get(url)!);
    }
    Papa.parse<SentenceJSON>(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          reject(new Error(result.errors.join("\n")));
        }
        const sentences = result.data.reduce(
          (acc, s) => {
            if (acc[s.MID] == null) {
              acc[s.MID] = [];
            }
            const start = parseTimecode(s["Start Timecode"]);
            const end = parseTimecode(s["End Timecode"]);
            acc[s.MID].push({
              timeRange: [start, end],
              value: s.Sentence,
            });
            return acc;
          },
          {} as Record<string, Sentence[]>,
        );
        cachedSentences.set(url, sentences);
        resolve(sentences);
      },
    });
  });
}

function parseTimecode(code: string) {
  // Time is of the format "hh:mm:ss,ms" (e.g. "00:01:23,456")
  const [hh, mm, ssms] = code.split(":");
  const [ss, ms] = ssms.split(",");
  return (
    parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss) + parseInt(ms) / 1000
  );
}

function parseKeyMomentsJSON(json: VideoInfoJSON["Key Moment"]): KeyMoment[] {
  return json?.map((k) => {
    return {
      title: k.Title,
      sentenceRange: [k["Start SL"] - 1, k["End SL"] - 1], // 1-indexed to 0-indexed
      concept: k.Concept,
      keyTakeaway: k["Key Takeaway"],
      isReviewed: k["Is Reviewed"] ?? false,
    };
  }) ?? [];
}
