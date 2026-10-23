import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  BookOpen,
  Check,
  CircleAlert,
  Code2,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  Link2,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Square,
  Terminal,
  X,
} from "lucide-react";
import {
  api,
  watchTask,
  type GitInfo,
  type McpConnection,
  type Note,
  type Project,
  type Task,
  type TaskDetail,
} from "./api";
type View =
  | "Dashboard"
  | "Projects"
  | "Agent Workspace"
  | "Tasks"
  | "Knowledge Base"
  | "Git & Changes"
  | "MCP Connections"
  | "Activity Logs"
  | "Settings";
const nav: [View, ReactNode][] = [
  ["Dashboard", <LayoutDashboard />],
  ["Projects", <FolderGit2 />],
  ["Agent Workspace", <Code2 />],
  ["Tasks", <Terminal />],
  ["Knowledge Base", <BookOpen />],
  ["Git & Changes", <GitBranch />],
  ["MCP Connections", <Link2 />],
  ["Activity Logs", <Activity />],
  ["Settings", <Settings2 />],
];
const done = (status: string) =>
  ["completed", "failed", "cancelled"].includes(status);
const when = (date: string) => new Date(date).toLocaleString();

function App() {
  const [view, setView] = useState<View>("Dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState("");
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [git, setGit] = useState<GitInfo | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteQuery, setNoteQuery] = useState("");
  const [notePath, setNotePath] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [proposalId, setProposalId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [projectForm, setProjectForm] = useState({
    name: "",
    type: "software",
    root: "",
    docsRoot: "",
    preferredAgent: "codex" as "codex" | "claude",
  });
  const [taskForm, setTaskForm] = useState({
    request: "",
    provider: "codex" as "codex" | "claude",
    mode: "manual" as "manual" | "assisted",
  });
  const selected = projects.find((p) => p.id === selectedId) || null;
  const active = taskList.filter((t) => !done(t.status));
  const load = useCallback(async () => {
    try {
      const [p, t, s] = await Promise.all([
        api<Project[]>("/projects"),
        api<Task[]>("/tasks"),
        api<Record<string, any>>("/status"),
      ]);
      setProjects(p);
      setTaskList(t);
      setStatus(s);
      setSelectedId((current) => current || p[0]?.id || "");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  const loadTask = useCallback(async (id: string) => {
    try {
      const [d, t] = await Promise.all([
        api<TaskDetail>(`/tasks/${id}`),
        api<Task[]>("/tasks"),
      ]);
      setDetail(d);
      setTaskList(t);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!selectedId) return;
    void api<GitInfo>(`/projects/${selectedId}/git`)
      .then(setGit)
      .catch((e) => setError(e.message));
    void api<Note[]>(
      `/projects/${selectedId}/notes?q=${encodeURIComponent(noteQuery)}`,
    )
      .then(setNotes)
      .catch((e) => setError(e.message));
  }, [selectedId, noteQuery]);
  useEffect(() => {
    if (!taskId) {
      setDetail(null);
      return;
    }
    void loadTask(taskId);
    return watchTask(taskId, () => {
      void loadTask(taskId);
    });
  }, [taskId, loadTask]);
  async function action<T>(run: () => Promise<T>, success?: string) {
    try {
      const value = await run();
      setError("");
      if (success) setNotice(success);
      await load();
      return value;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }
  async function createProject(e: FormEvent) {
    e.preventDefault();
    const created = await action(
      () =>
        api<Project>("/projects", {
          method: "POST",
          body: JSON.stringify({
            ...projectForm,
            docsRoot: projectForm.docsRoot || null,
          }),
        }),
      "Project saved",
    );
    if (created) {
      setSelectedId(created.id);
      setProjectForm({
        name: "",
        type: "software",
        root: "",
        docsRoot: "",
        preferredAgent: "codex",
      });
      setView("Dashboard");
    }
  }
  async function submitTask(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const task = await action(() =>
      api<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({ ...taskForm, projectId: selected.id }),
      }),
    );
    if (task) {
      setTaskId(task.id);
      setTaskForm({ ...taskForm, request: "" });
      setView("Tasks");
    }
  }
  async function openNote(path: string) {
    if (!selected) return;
    try {
      const result = await api<{ content: string }>(
        `/projects/${selected.id}/note?path=${encodeURIComponent(path)}`,
      );
      setNotePath(path);
      setNoteContent(result.content);
      setNoteDraft(result.content);
      setProposalId("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function proposeNote() {
    if (!selected || !notePath) return;
    const result = await action(
      () =>
        api<{ id: string }>(`/projects/${selected.id}/proposals`, {
          method: "POST",
          body: JSON.stringify({
            path: notePath,
            expected: noteContent,
            proposed: noteDraft,
          }),
        }),
      "Proposal saved. Review it before applying.",
    );
    if (result) setProposalId(result.id);
  }
  async function applyNote() {
    if (!proposalId) return;
    const result = await action(
      () =>
        api<{ applied: boolean }>(`/proposals/${proposalId}/apply`, {
          method: "POST",
        }),
      "Markdown note updated",
    );
    if (result) {
      setNoteContent(noteDraft);
      setProposalId("");
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FORGE</strong>
            <span>STUDIO</span>
          </div>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <button className="project-picker" onClick={() => setView("Projects")}>
          <div className="project-avatar">
            {selected?.name[0]?.toUpperCase() || "+"}
          </div>
          <span>
            <strong>{selected?.name || "No project selected"}</strong>
            <small>{selected?.type || "Add a project"}</small>
          </span>
        </button>
        <div className="sidebar-label nav-label">NAVIGATION</div>
        <nav>
          {nav.map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${view === name ? "selected" : ""}`}
              onClick={() => setView(name)}
            >
              {icon}
              <span>{name}</span>
              {name === "Tasks" && active.length > 0 && <b>{active.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="mini-dot ok" /> Local runtime{" "}
          <small>{status ? "Connected" : "Checking…"}</small>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            FORGE STUDIO <span>/</span> {view.toUpperCase()}
          </div>
          <span className="local-badge">
            <ShieldCheck size={14} /> LOCAL FIRST
          </span>
        </header>
        <div className="content">
          {error && (
            <div className="alert error">
              <CircleAlert size={17} />
              {error}
              <button onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success">
              <Check size={17} />
              {notice}
              <button onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {view === "Dashboard" && (
            <>
              <Page
                title={selected?.name || "Welcome to Forge Studio"}
                caption={
                  selected
                    ? "Your local development workspace, activity, and connected tools."
                    : "Add an existing local project to begin."
                }
                action={
                  <button
                    className="primary"
                    onClick={() =>
                      setView(selected ? "Agent Workspace" : "Projects")
                    }
                  >
                    <Plus size={16} />
                    {selected ? "New task" : "Add project"}
                  </button>
                }
              />
              {selected ? (
                <>
                  <div className="stats">
                    <Stat
                      label="ACTIVE TASKS"
                      value={String(
                        active.filter((t) => t.projectId === selected.id)
                          .length,
                      )}
                      sub="In progress or awaiting approval"
                    />
                    <Stat
                      label="PROJECT TASKS"
                      value={String(
                        taskList.filter((t) => t.projectId === selected.id)
                          .length,
                      )}
                      sub="Recorded locally"
                    />
                    <Stat
                      label="KNOWLEDGE"
                      value={selected.docsRoot ? "Connected" : "—"}
                      sub={
                        selected.docsRoot
                          ? "Markdown folder linked"
                          : "Add an Obsidian folder"
                      }
                    />
                    <Stat
                      label="GIT BRANCH"
                      value={git?.branch || "—"}
                      sub={
                        git?.isRepo
                          ? "Repository detected"
                          : "No Git repository"
                      }
                    />
                  </div>
                  <div className="two-cols">
                    <Panel title="Recent tasks">
                      {taskList
                        .filter((t) => t.projectId === selected.id)
                        .slice(0, 5)
                        .map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            click={() => {
                              setTaskId(t.id);
                              setView("Tasks");
                            }}
                          />
                        ))}
                      {!taskList.some((t) => t.projectId === selected.id) && (
                        <Empty text="No tasks yet. Start from Agent Workspace." />
                      )}
                    </Panel>
                    <Panel title="Project context">
                      <Info label="ROOT DIRECTORY" value={selected.root} />
                      <Info
                        label="DOCUMENTATION"
                        value={selected.docsRoot || "Not connected"}
                      />
                      <Info
                        label="PREFERRED AGENT"
                        value={selected.preferredAgent}
                      />
                      <Info
                        label="GIT"
                        value={
                          git?.isRepo
                            ? `${git.branch || "Detached HEAD"} · ${git.status ? "changes present" : "clean"}`
                            : "Not detected"
                        }
                      />
                    </Panel>
                  </div>
                </>
              ) : (
                <div className="empty-card">
                  <FolderGit2 size={30} />
                  <h2>Start with a project</h2>
                  <p>
                    Import an existing directory without modifying its files.
                  </p>
                  <button
                    className="primary"
                    onClick={() => setView("Projects")}
                  >
                    Add project
                  </button>
                </div>
              )}
            </>
          )}
          {view === "Projects" && (
            <>
              <Page
                title="Projects"
                caption="Import and switch between local development workspaces."
              />
              <div className="two-cols">
                <Panel title="Your projects">
                  {projects.map((p) => (
                    <button
                      className={`project-row ${selectedId === p.id ? "active" : ""}`}
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <div className="project-avatar">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.root}</small>
                      </span>
                      {selectedId === p.id && <Check size={17} />}
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <Empty text="No projects imported yet." />
                  )}
                </Panel>
                <Panel title="Add an existing project">
                  <form onSubmit={createProject} className="form">
                    <label>
                      Project name
                      <input
                        required
                        value={projectForm.name}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g. Catch a Slime"
                      />
                    </label>
                    <label>
                      Local root directory
                      <input
                        required
                        value={projectForm.root}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            root: e.target.value,
                          })
                        }
                        placeholder="C:\Projects\my-project"
                      />
                    </label>
                    <label>
                      Obsidian project folder <em>optional</em>
                      <input
                        value={projectForm.docsRoot}
                        onChange={(e) =>
                          setProjectForm({
                            ...projectForm,
                            docsRoot: e.target.value,
                          })
                        }
                        placeholder="C:\Users\…\VAULT\2026 PROJECTS\…"
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        Project type
                        <input
                          value={projectForm.type}
                          onChange={(e) =>
                            setProjectForm({
                              ...projectForm,
                              type: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Preferred agent
                        <select
                          value={projectForm.preferredAgent}
                          onChange={(e) =>
                            setProjectForm({
                              ...projectForm,
                              preferredAgent: e.target.value as
                                "codex" | "claude",
                            })
                          }
                        >
                          <option value="codex">Codex</option>
                          <option value="claude">Claude</option>
                        </select>
                      </label>
                    </div>
                    <p className="helper">
                      Import stores paths and settings only. It does not install
                      or edit files.
                    </p>
                    <button className="primary">
                      <Plus size={16} /> Add project
                    </button>
                  </form>
                </Panel>
              </div>
            </>
          )}
          {view === "Agent Workspace" && (
            <>
              <Page
                title="Agent Workspace"
                caption="Send a scoped task to a supported agent runtime."
              />
              {selected ? (
                <div className="two-cols">
                  <Panel title="New task">
                    <form onSubmit={submitTask} className="form">
                      <label>
                        What should the agent do?
                        <textarea
                          required
                          rows={8}
                          value={taskForm.request}
                          onChange={(e) =>
                            setTaskForm({
                              ...taskForm,
                              request: e.target.value,
                            })
                          }
                          placeholder="Describe the change, relevant files, and how to verify it…"
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          Agent
                          <select
                            value={taskForm.provider}
                            onChange={(e) =>
                              setTaskForm({
                                ...taskForm,
                                provider: e.target.value as "codex" | "claude",
                              })
                            }
                          >
                            <option value="codex">Codex</option>
                            <option value="claude">Claude</option>
                          </select>
                        </label>
                        <label>
                          Workflow
                          <select
                            value={taskForm.mode}
                            onChange={(e) =>
                              setTaskForm({
                                ...taskForm,
                                mode: e.target.value as "manual" | "assisted",
                              })
                            }
                          >
                            <option value="manual">
                              Manual · execute task
                            </option>
                            <option value="assisted">
                              Assisted · plan then approve
                            </option>
                          </select>
                        </label>
                      </div>
                      <p className="helper">
                        {taskForm.mode === "assisted"
                          ? "A read-only plan is reviewed before execution."
                          : "Tool operations may request approval while the agent runs."}
                      </p>
                      <button className="primary">
                        <Send size={16} /> Start task
                      </button>
                    </form>
                  </Panel>
                  <Panel title="Agent availability">
                    <Connection
                      name="Codex App Server"
                      ok={!!status?.codex?.installed}
                      detail={
                        status?.codex?.installed
                          ? "Installed locally · uses Codex sign-in"
                          : "Install Codex CLI and sign in"
                      }
                    />
                    <Connection
                      name="Claude Agent SDK"
                      ok={!!status?.claude?.apiKeyConfigured}
                      detail={
                        status?.claude?.apiKeyConfigured
                          ? "API key configured"
                          : "Set ANTHROPIC_API_KEY · separate API billing"
                      }
                    />
                    <div className="callout">
                      <ShieldCheck size={18} /> Tasks run from {selected.root}.
                      Approvals appear in task detail.
                    </div>
                  </Panel>
                </div>
              ) : (
                <Empty text="Add a project before starting a task." />
              )}
            </>
          )}
          {view === "Tasks" && (
            <>
              <Page
                title="Tasks"
                caption="Track execution, approvals, output, and outcomes."
              />
              <div className="task-layout">
                <Panel title="History">
                  {taskList.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      click={() => setTaskId(t.id)}
                    />
                  ))}
                  {taskList.length === 0 && (
                    <Empty text="No tasks recorded yet." />
                  )}
                </Panel>
                <Panel title="Task detail">
                  {detail ? (
                    <>
                      <div className="detail-title">
                        <span className={`pill ${detail.status}`}>
                          {detail.status.replace("_", " ")}
                        </span>
                        <h3>{detail.request}</h3>
                        <p>
                          {detail.provider} · {detail.mode} · {detail.stage}
                        </p>
                        {[
                          "created",
                          "analyzing",
                          "planning",
                          "awaiting_approval",
                          "executing",
                          "paused",
                        ].includes(detail.status) && (
                          <button
                            className="danger-button"
                            onClick={() =>
                              void action(() =>
                                api(`/tasks/${detail.id}/cancel`, {
                                  method: "POST",
                                }),
                              )
                            }
                          >
                            <Square size={14} /> Stop task
                          </button>
                        )}
                      </div>
                      {detail.status === "awaiting_review" && (
                        <div className="approval">
                          <strong>Review the agent result</strong>
                          <p>
                            The provider finished its turn. Check the response
                            and project changes before accepting this task.
                          </p>
                          <div>
                            <button
                              onClick={() =>
                                void action(() =>
                                  api(`/tasks/${detail.id}/review`, {
                                    method: "POST",
                                    body: JSON.stringify({ accepted: false }),
                                  }),
                                )
                              }
                            >
                              Mark unsuccessful
                            </button>
                            <button
                              className="primary"
                              onClick={() =>
                                void action(() =>
                                  api(`/tasks/${detail.id}/review`, {
                                    method: "POST",
                                    body: JSON.stringify({ accepted: true }),
                                  }),
                                )
                              }
                            >
                              Accept result
                            </button>
                          </div>
                        </div>
                      )}
                      {detail.approvals
                        .filter((a) => a.status === "pending")
                        .map((a) => (
                          <div className="approval" key={a.id}>
                            <strong>Approval required · {a.method}</strong>
                            <pre>{a.description}</pre>
                            <div>
                              <button
                                onClick={() =>
                                  void action(() =>
                                    api(`/approvals/${a.id}/decision`, {
                                      method: "POST",
                                      body: JSON.stringify({ approved: false }),
                                    }),
                                  )
                                }
                              >
                                Reject
                              </button>
                              <button
                                className="primary"
                                onClick={() =>
                                  void action(() =>
                                    api(`/approvals/${a.id}/decision`, {
                                      method: "POST",
                                      body: JSON.stringify({ approved: true }),
                                    }),
                                  )
                                }
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ))}
                      <h4>AGENT OUTPUT</h4>
                      <pre className="output">
                        {detail.summary ||
                          detail.events
                            .filter((e) => e.kind === "text")
                            .map((e) => String(e.payload.delta || ""))
                            .join("") ||
                          "Waiting for agent output…"}
                      </pre>
                      {detail.events.findLast(
                        (e) => e.kind === "git_snapshot",
                      ) && (
                        <>
                          <h4>GIT AT PROVIDER FINISH</h4>
                          <pre className="output">
                            {String(
                              detail.events.findLast(
                                (e) => e.kind === "git_snapshot",
                              )?.payload.status || "No working tree changes.",
                            )}
                          </pre>
                        </>
                      )}
                      <h4>ACTIVITY</h4>
                      <div className="activity-list">
                        {detail.events
                          .filter(
                            (e) => e.kind !== "text" && e.kind !== "message",
                          )
                          .map((e) => (
                            <div key={e.id}>
                              <small>
                                {new Date(e.createdAt).toLocaleTimeString()}
                              </small>
                              <span>
                                {e.kind === "state"
                                  ? String(e.payload.stage)
                                  : e.kind === "error"
                                    ? String(e.payload.message)
                                    : e.kind === "tool"
                                      ? `${e.payload.type}: ${e.payload.status || e.payload.name || ""}`
                                      : e.kind.replace("_", " ")}
                              </span>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <Empty text="Select a task to inspect progress." />
                  )}
                </Panel>
              </div>
            </>
          )}
          {view === "Knowledge Base" && (
            <>
              <Page
                title="Knowledge Base"
                caption="Browse and make reviewed edits to project Markdown notes."
              />
              {selected?.docsRoot ? (
                <div className="knowledge-layout">
                  <Panel title={`Notes · ${notes.length}`}>
                    <input
                      className="search"
                      value={noteQuery}
                      onChange={(e) => setNoteQuery(e.target.value)}
                      placeholder="Search titles and contents…"
                    />
                    {notes.map((n) => (
                      <button
                        className={`note-row ${notePath === n.path ? "active" : ""}`}
                        key={n.path}
                        onClick={() => void openNote(n.path)}
                      >
                        <BookOpen size={16} />
                        <span>
                          <strong>{n.title}</strong>
                          <small>{n.path}</small>
                        </span>
                      </button>
                    ))}
                  </Panel>
                  <Panel title={notePath || "Select a note"}>
                    {notePath ? (
                      <>
                        <textarea
                          className="markdown-editor"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          spellCheck={false}
                        />
                        {noteDraft !== noteContent && (
                          <div className="note-actions">
                            <span>Unsaved proposal</span>
                            <button
                              className="primary"
                              onClick={() => void proposeNote()}
                            >
                              Review change
                            </button>
                          </div>
                        )}
                        {proposalId && (
                          <div className="proposal-review">
                            <h3>Review proposed change</h3>
                            <div className="diff-columns">
                              <div>
                                <strong>Current</strong>
                                <pre>{noteContent}</pre>
                              </div>
                              <div>
                                <strong>Proposed</strong>
                                <pre>{noteDraft}</pre>
                              </div>
                            </div>
                            <button
                              className="primary"
                              onClick={() => void applyNote()}
                            >
                              Apply approved edit
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <Empty text="Choose a note to read it. Editing creates a reviewable proposal." />
                    )}
                  </Panel>
                </div>
              ) : (
                <div className="empty-card">
                  <BookOpen size={28} />
                  <h2>No documentation folder connected</h2>
                  <p>Add the project's Obsidian Markdown folder in Settings.</p>
                  <button
                    className="primary"
                    onClick={() => setView("Settings")}
                  >
                    Open settings
                  </button>
                </div>
              )}
            </>
          )}
          {view === "Git & Changes" && (
            <>
              <Page
                title="Git & Changes"
                caption="Inspect the selected project's working tree."
              />
              {selected ? (
                <>
                  <div className="stats">
                    <Stat
                      label="REPOSITORY"
                      value={git?.isRepo ? "Detected" : "—"}
                      sub={selected.root}
                    />
                    <Stat
                      label="BRANCH"
                      value={git?.branch || "—"}
                      sub="Current branch"
                    />
                    <Stat
                      label="CHANGED FILES"
                      value={String(
                        git?.status ? git.status.split("\n").length : 0,
                      )}
                      sub="Working tree"
                    />
                  </div>
                  <div className="two-cols">
                    <Panel title="Working tree">
                      <pre className="code-output">
                        {git?.status || "No uncommitted changes."}
                      </pre>
                    </Panel>
                    <Panel title="Diff">
                      <pre className="code-output">
                        {git?.diff || "No unstaged diff."}
                      </pre>
                    </Panel>
                  </div>
                </>
              ) : (
                <Empty text="Select a project to inspect Git changes." />
              )}
            </>
          )}
          {view === "MCP Connections" && (
            <>
              <Page
                title="MCP Connections"
                caption="Connect trusted local MCP servers and choose which tools each project may use."
              />
              <McpPanel projectId={selectedId} />
              <Panel title="Connections">
                <Connection
                  name="Codex App Server"
                  ok={!!status?.codex?.installed}
                  detail="Installed Codex CLI"
                />
                <Connection
                  name="Claude Agent SDK"
                  ok={!!status?.claude?.apiKeyConfigured}
                  detail="Anthropic API key"
                />
                <Connection
                  name="Obsidian Markdown"
                  ok={!!selected?.docsRoot}
                  detail={selected?.docsRoot || "Connect in project settings"}
                />
                <Connection
                  name="Git"
                  ok={!!git?.isRepo}
                  detail={git?.branch || "No repository detected"}
                />
                <Connection
                  name="Roblox Studio MCP"
                  ok={false}
                  detail="Add a server above when available"
                />
                <Connection
                  name="Blender"
                  ok={false}
                  detail="Add a server above when available"
                />
                <Connection
                  name="VS Code"
                  ok={!!status?.vscode?.installed}
                  detail="Official command-line interface"
                />
              </Panel>
            </>
          )}
          {view === "Activity Logs" && (
            <>
              <Page
                title="Activity Logs"
                caption="Recorded task activity for this local installation."
              />
              <Panel title="Recent activity">
                {taskList.slice(0, 30).map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    click={() => {
                      setTaskId(t.id);
                      setView("Tasks");
                    }}
                  />
                ))}
                {taskList.length === 0 && <Empty text="No activity yet." />}
              </Panel>
            </>
          )}
          {view === "Settings" && (
            <>
              <Page
                title="Settings"
                caption="Local project configuration and provider setup."
              />
              {selected ? (
                <div className="two-cols">
                  <Panel title="Project settings">
                    <div className="form">
                      <label>
                        Project name
                        <input
                          value={selected.name}
                          onChange={(e) =>
                            setProjects(
                              projects.map((p) =>
                                p.id === selected.id
                                  ? { ...p, name: e.target.value }
                                  : p,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Documentation folder
                        <input
                          value={selected.docsRoot || ""}
                          onChange={(e) =>
                            setProjects(
                              projects.map((p) =>
                                p.id === selected.id
                                  ? { ...p, docsRoot: e.target.value }
                                  : p,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Preferred agent
                        <select
                          value={selected.preferredAgent}
                          onChange={(e) =>
                            setProjects(
                              projects.map((p) =>
                                p.id === selected.id
                                  ? {
                                      ...p,
                                      preferredAgent: e.target.value as
                                        "codex" | "claude",
                                    }
                                  : p,
                              ),
                            )
                          }
                        >
                          <option value="codex">Codex</option>
                          <option value="claude">Claude</option>
                        </select>
                      </label>
                      <p className="helper">Root directory: {selected.root}</p>
                      <button
                        className="primary"
                        onClick={() =>
                          void action(
                            () =>
                              api(`/projects/${selected.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  name: selected.name,
                                  docsRoot: selected.docsRoot,
                                  preferredAgent: selected.preferredAgent,
                                }),
                              }),
                            "Settings saved",
                          )
                        }
                      >
                        Save settings
                      </button>
                    </div>
                  </Panel>
                  <Panel title="Provider setup">
                    <Info
                      label="CODEX"
                      value="Run codex login. Forge Studio uses Codex App Server."
                    />
                    <Info
                      label="CLAUDE"
                      value="Set ANTHROPIC_API_KEY before launching. Separate Anthropic API billing applies."
                    />
                    <Info
                      label="LOCAL DATA"
                      value="SQLite is stored under %APPDATA%\Forge Studio by default."
                    />
                  </Panel>
                </div>
              ) : (
                <Empty text="Select a project to edit its settings." />
              )}
            </>
          )}
        </div>
      </main>
      <aside className="context-sidebar">
        <div className="context-head">CONTEXT</div>
        <section>
          <span>ACTIVE PROJECT</span>
          <strong>{selected?.name || "None selected"}</strong>
          <small>{selected?.root || "Add a project to begin"}</small>
        </section>
        <section>
          <span>AGENTS</span>
          <div>
            <i className={`mini-dot ${status?.codex?.installed ? "ok" : ""}`} />{" "}
            Codex{" "}
            <small>{status?.codex?.installed ? "Installed" : "Offline"}</small>
          </div>
          <div>
            <i
              className={`mini-dot ${status?.claude?.apiKeyConfigured ? "ok" : ""}`}
            />{" "}
            Claude{" "}
            <small>
              {status?.claude?.apiKeyConfigured ? "Configured" : "Setup needed"}
            </small>
          </div>
        </section>
        <section>
          <span>CURRENT TASK</span>
          <strong>{detail?.request || "No task selected"}</strong>
          <small>{detail?.stage || ""}</small>
        </section>
        <section>
          <span>CONNECTED FILES</span>
          <div>
            <BookOpen size={15} /> Markdown{" "}
            <small>{selected?.docsRoot ? "Linked" : "—"}</small>
          </div>
          <div>
            <GitBranch size={15} /> Git{" "}
            <small>{git?.isRepo ? "Linked" : "—"}</small>
          </div>
        </section>
        <footer>
          Forge Studio v0.1.0
          <br />
          Local development build
        </footer>
      </aside>
    </div>
  );
}
function Page({
  title,
  caption,
  action,
}: {
  title: string;
  caption: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">WORKSPACE</p>
        <h1>{title}</h1>
        <p>{caption}</p>
      </div>
      {action}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Connection({
  name,
  ok,
  detail,
}: {
  name: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="connection">
      <span className={`connection-icon ${ok ? "ok" : ""}`}>
        {ok ? <Check size={16} /> : <CircleAlert size={16} />}
      </span>
      <span>
        <strong>{name}</strong>
        <small>{detail}</small>
      </span>
      <b className={ok ? "ok" : ""}>{ok ? "AVAILABLE" : "SETUP"}</b>
    </div>
  );
}
function McpPanel({ projectId }: { projectId: string }) {
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const list = await api<McpConnection[]>("/mcp/connections");
    setConnections(list);
    if (projectId) {
      const entries = await Promise.all(
        list.map(
          async (c) =>
            [
              c.id,
              await api<Record<string, boolean>>(
                `/mcp/connections/${c.id}/permissions?projectId=${projectId}`,
              ),
            ] as const,
        ),
      );
      setPermissions(Object.fromEntries(entries));
    }
  }, [projectId]);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [refresh]);
  async function run(operation: () => Promise<unknown>) {
    try {
      await operation();
      setError("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Panel title="Local MCP servers">
      <p className="hint">
        Adding a server saves its command. Connect launches that command locally
        and inspects advertised tools. Only add servers you trust. Tools are
        disabled for every project until enabled here; Forge Studio does not
        call them yet.
      </p>
      {error && <div className="alert error">{error}</div>}
      <form
        className="mcp-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api("/mcp/connections", {
              method: "POST",
              body: JSON.stringify({
                name,
                command,
                args: args.trim() ? JSON.parse(args) : [],
              }),
            });
            setName("");
            setCommand("");
            setArgs("");
          });
        }}
      >
        <input
          aria-label="Server name"
          placeholder="Server name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          aria-label="Executable"
          placeholder="Executable path or command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          required
        />
        <input
          aria-label="Arguments JSON"
          placeholder='Arguments JSON, e.g. ["server.js"]'
          value={args}
          onChange={(e) => setArgs(e.target.value)}
        />
        <button className="primary" type="submit">
          Add server
        </button>
      </form>
      {connections.map((c) => (
        <div className="mcp-server" key={c.id}>
          <div className="mcp-server-head">
            <strong>{c.name}</strong>
            <span className={`pill ${c.status}`}>{c.status}</span>
          </div>
          <small>
            {c.transport} · {c.tools.length} tools · Last attempt:{" "}
            {c.lastAttemptAt ? when(c.lastAttemptAt) : "never"}
          </small>
          {c.error && <p className="mcp-error">{c.error}</p>}
          <div className="mcp-actions">
            {c.status === "connected" ? (
              <button
                onClick={() =>
                  void run(() =>
                    api(`/mcp/connections/${c.id}/disconnect`, {
                      method: "POST",
                    }),
                  )
                }
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() =>
                  void run(() =>
                    api(`/mcp/connections/${c.id}/connect`, { method: "POST" }),
                  )
                }
              >
                Connect & inspect
              </button>
            )}
            <button
              onClick={() => {
                const nextName = window.prompt("Server name", c.name);
                if (nextName === null) return;
                const nextCommand = window.prompt("Executable", c.command);
                if (nextCommand === null) return;
                const nextArgs = window.prompt(
                  "Arguments JSON",
                  JSON.stringify(c.args),
                );
                if (nextArgs === null) return;
                void run(() =>
                  api(`/mcp/connections/${c.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      name: nextName,
                      command: nextCommand,
                      args: JSON.parse(nextArgs),
                    }),
                  }),
                );
              }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Remove ${c.name}?`))
                  void run(() =>
                    api(`/mcp/connections/${c.id}`, { method: "DELETE" }),
                  );
              }}
            >
              Remove
            </button>
          </div>
          {c.tools.map((tool) => (
            <div className="mcp-tool" key={tool.name}>
              <div>
                <strong>{tool.name}</strong>
                <small>{tool.description || "No description supplied"}</small>
              </div>
              <label>
                <input
                  type="checkbox"
                  disabled={!projectId}
                  checked={!!permissions[c.id]?.[tool.name]}
                  onChange={(e) =>
                    void run(() =>
                      api(`/mcp/connections/${c.id}/permissions`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          projectId,
                          toolName: tool.name,
                          enabled: e.target.checked,
                        }),
                      }),
                    )
                  }
                />{" "}
                Enable for project
              </label>
            </div>
          ))}
        </div>
      ))}
      {connections.length === 0 && (
        <Empty text="No local MCP servers configured." />
      )}
    </Panel>
  );
}
function TaskRow({ task, click }: { task: Task; click: () => void }) {
  return (
    <button className="task-row" onClick={click}>
      <span className={`status-dot ${task.status}`} />
      <span>
        <strong>{task.request}</strong>
        <small>
          {task.provider} · {when(task.createdAt)}
        </small>
      </span>
      <span className={`pill ${task.status}`}>
        {task.status.replace("_", " ")}
      </span>
    </button>
  );
}
export default App;
