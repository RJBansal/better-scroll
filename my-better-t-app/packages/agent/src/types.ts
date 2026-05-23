export interface UserProfile {
  name: string;
  goals: string[];
  hobbies: string[];
  youtube_history?: string[];
  bookmarks?: string[];
  notes?: string;
}

export interface ReelSeed {
  reel_id: string;
  /** e.g. "Goal Motivation", "Hobby News", "Exploratory Discovery" */
  category: string;
  topic_focus: string;
  core_narrative_arc: {
    hook_angle: string;
    /** 2-4 beats the body of the reel should cover */
    body_points: string[];
    call_to_action: string;
  };
  metadata: {
    tone: string;
    pacing: string;
    source_references: string[];
  };
  visual_direction_notes: string;
}

export interface ResearchResult {
  readUpMarkdown: string;
  sources: { title: string; uri: string }[];
  searchQueries: string[];
}
