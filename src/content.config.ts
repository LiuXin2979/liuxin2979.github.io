// Adapted from AstroPaper's Markdown content collections.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const common = {
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  order: z.number().int(),
};

const posts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/posts" }),
  schema: z.object({
    ...common,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    minutes: z.number().int().positive(),
    topic: z.enum(["desktop", "database", "control"]),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: z.object({
    ...common,
    status: z.string(),
    topic: z.enum(["desktop", "database", "control"]),
  }),
});

export const collections = { posts, projects };
