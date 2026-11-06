import { getCollection } from "astro:content";

export const topics = {
  desktop: "桌面开发",
  database: "数据工程",
  control: "工业通信",
};

export async function getEntries(collection: "posts" | "projects") {
  const entries = await getCollection(collection);
  return entries.sort((a, b) => a.data.order - b.data.order);
}
