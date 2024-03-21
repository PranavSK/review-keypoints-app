import Papa from "papaparse";
import srtParser2 from "srt-parser-2";
import { z } from "zod";

export const videoInfoJSONSchema = z
  .object({
    MID: z.string().min(1).default(""),
    "Video Name": z.string().min(1).default(""),
    Grade: z.string().min(1).default(""),
    Subject: z.string().min(1).default(""),
    Chapter: z.string().min(1).default(""),
    "Duration (minute)": z.number().default(0),
    "Video Path": z.string().url().default(""),
    "Sentences Path": z.string().optional(),
    "SRT Path": z.string().optional(),
    "Key Moment": z
      .array(
        z.object({
          Title: z.string(),
          "Start SL": z.number(),
          "End SL": z.number(),
          Concept: z.string(),
          "Key Takeaway": z.string(),
          "Is Reviewed": z.boolean().optional(),
        }),
      )
      .optional()
      .default([]),
  })
  .refine((data) => data["Sentences Path"] || data["SRT Path"], {
    message: "Either 'Sentences Path' or 'SRT Path' must be provided",
    path: ["Sentences Path", "SRT Path"],
  });
export type VideoInfoJSON = z.infer<typeof videoInfoJSONSchema>;
const sentenceJSONSchema = z.object({
  MID: z.string(),
  SL: z.coerce.number(),
  "Start Timecode": z.string(),
  "End Timecode": z.string(),
  Sentence: z.string(),
});
type SentenceJSON = z.infer<typeof sentenceJSONSchema>;
const sentencesJSONSchema = z.array(sentenceJSONSchema);

export const timeRangeSchema = z.tuple([z.number(), z.number()]);
export type TimeRange = z.infer<typeof timeRangeSchema>; // seconds
export const sentenceSchema = z.object({
  timeRange: timeRangeSchema,
  value: z.string(),
});
export type Sentence = z.infer<typeof sentenceSchema>;
export const keyMomentSchema = z.object({
  title: z.string().default("Title"),
  concept: z.string().default("Concept"),
  keyTakeaway: z.string().default("Key Takeaway"),
  sentenceRange: z.tuple([z.number().int(), z.number().int()]).default([0, 0]),
  isReviewed: z.boolean().default(false),
});
export type KeyMoment = z.infer<typeof keyMomentSchema>;
export const videoInfoSchema = z.object({
  mid: z.string().min(1).default(""),
  name: z.string().min(1).default(""),
  grade: z.string().min(1).default(""),
  subject: z.string().min(1).default(""),
  chapter: z.string().min(1).default(""),
  duration: z.number().default(0),
  videoUrl: z.string().min(1).default(""),
  sentences: z.array(sentenceSchema).default([]),
  keyMoments: z.array(keyMomentSchema).default([]),
});
export type VideoInfo = z.infer<typeof videoInfoSchema>;

export async function initDatabaseFromText(text: string) {
  const jsonList = text
    .split("\n")
    .filter(Boolean)
    .map((row) => videoInfoJSONSchema.parse(JSON.parse(row)));
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

export async function parseInfoJSON(json: VideoInfoJSON): Promise<VideoInfo> {
  let sentences: Sentence[];
  if (json["Sentences Path"] == null) {
    if (json["SRT Path"] == null) {
      throw new Error(
        `No sentences path or SRT path for video ${json["Video Name"]}`,
      );
    }
    sentences = await parseSentencesSRT(json["SRT Path"]);
  } else {
    sentences = (await parseSentencesJSON(json["Sentences Path"]))[json.MID];
  }
  return {
    mid: json.MID,
    name: json["Video Name"],
    grade: json.Grade,
    subject: json.Subject,
    chapter: json.Chapter,
    duration: json["Duration (minute)"] * 60,
    videoUrl: json["Video Path"],
    sentences,
    keyMoments: parseKeyMomentsJSON(json["Key Moment"]),
  };
}

const srtParser = new srtParser2();
export async function parseSentencesSRT(url: string): Promise<Sentence[]> {
  const response = await fetch(url);
  const text = await response.text();
  const parsed = srtParser.fromSrt(text);
  return parsed
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))
    .map((s) => {
      return {
        timeRange: [s.startSeconds, s.endSeconds],
        value: s.text,
      };
    });
}

const cachedSentences = new Map<string, Record<string, Sentence[]>>();
export async function parseSentencesJSON(
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
          return;
        }
        let parsed: z.infer<typeof sentencesJSONSchema>;
        try {
          parsed = sentencesJSONSchema.parse(result.data);
        } catch (e) {
          reject(e);
          return;
        }
        const sentences = parsed.reduce(
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
      error: (error) => {
        reject(new Error(`Failed to fetch sentences: ${error}`));
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
  return (
    json?.map((k) => {
      return {
        title: k.Title,
        sentenceRange: [k["Start SL"] - 1, k["End SL"] - 1], // 1-indexed to 0-indexed
        concept: k.Concept,
        keyTakeaway: k["Key Takeaway"],
        isReviewed: k["Is Reviewed"] ?? false,
      };
    }) ?? []
  );
}
