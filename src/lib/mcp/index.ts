import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import updateTaskStatus from "./tools/update-task-status";
import searchFeedPosts from "./tools/search-feed-posts";
import getFocusSummary from "./tools/get-focus-summary";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "classlab",
  title: "ClassLab",
  version: "0.1.0",
  instructions:
    "Tools for ClassLab, a study campus app. Use `list_tasks`, `create_task` and `update_task_status` to manage the signed-in student's study tasks, `search_feed_posts` to find community posts, and `get_focus_summary` for their recent focus/study time stats.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasks, createTask, updateTaskStatus, searchFeedPosts, getFocusSummary],
});
