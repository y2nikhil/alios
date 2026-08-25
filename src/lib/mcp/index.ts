import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import updateTaskStatus from "./tools/update-task-status";
import searchFeedPosts from "./tools/search-feed-posts";
import getFocusSummary from "./tools/get-focus-summary";
import createPost from "./tools/create-post";
import createComment from "./tools/create-comment";
import listPostComments from "./tools/list-post-comments";
import votePost from "./tools/vote-post";
import createBlogPost from "./tools/create-blog-post";
import updateBlogPost from "./tools/update-blog-post";
import listBlogPosts from "./tools/list-blog-posts";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "classlab",
  title: "ClassLab",
  version: "0.1.0",
  instructions:
    "Tools for ClassLab, a study campus app. Manage the signed-in student's study tasks (`list_tasks`, `create_task`, `update_task_status`), read and write the community feed (`search_feed_posts`, `create_post`, `list_post_comments`, `create_comment`, `vote_post`), review focus stats (`get_focus_summary`), and author blog articles (`list_blog_posts`, `create_blog_post`, `update_blog_post` — blog writes require an admin account).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listTasks,
    createTask,
    updateTaskStatus,
    searchFeedPosts,
    getFocusSummary,
    createPost,
    createComment,
    listPostComments,
    votePost,
    createBlogPost,
    updateBlogPost,
    listBlogPosts,
  ],
});

