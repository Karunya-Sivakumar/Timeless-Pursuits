import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 🔑 Replace with your Supabase project values
const supabase = createClient(
  "https://jvlecrueuntimwykpdlr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bGVjcnVldW50aW13eWtwZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjY4MjcsImV4cCI6MjA5MDcwMjgyN30.Finp6ihsXD7fAg-AN_VELx7e_U8vdgF90-6PgGkqBZk"
);

// 🔧 DEV MODE: set to true to bypass Google login while building UI
const DEV_BYPASS_AUTH = true;

export default function TimelessPursuits() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("map");

  // persist map state at root so navigation doesn't reset
  const [domains, setDomains] = useState([]);
  const [links, setLinks] = useState([]);

  // load saved when logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // local persistence (works dev + signed in)
  useEffect(() => {
    const saved = localStorage.getItem("polymath-map");
    if (saved) {
      const parsed = JSON.parse(saved);
      setDomains(parsed.domains || []);
      setLinks(parsed.links || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "polymath-map",
      JSON.stringify({ domains, links })
    );
  }, [domains, links]);

  if (!session && !DEV_BYPASS_AUTH) return <Auth />;

  return (
    <div className="w-screen h-screen bg-[#fffff4] text-[#c7a36c] flex flex-col">
      <Header page={page} setPage={setPage} />

      <div className="flex-1 overflow-hidden">
        {page === "map" && (
          <Map
            user={session?.user || { id: "dev-user" }}
            domains={domains}
            setDomains={setDomains}
            links={links}
            setLinks={setLinks}
          />
        )}
        {page === "community" && (
          <Community user={session?.user || { email: "anon" }} />
        )}
      </div>
    </div>
  );
}

function Header({ page, setPage }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 py-3 border-b border-[#c7a36c]/20 gap-2">
      <div className="text-lg sm:text-xl font-semibold">Timeless Pursuits</div>

      <div className="flex gap-4">
        <button
          className={page === "map" ? "font-semibold" : "opacity-60"}
          onClick={() => setPage("map")}
        >
          Map
        </button>
        <button
          className={page === "community" ? "font-semibold" : "opacity-60"}
          onClick={() => setPage("community")}
        >
          Community
        </button>
      </div>
    </div>
  );
}

function Auth() {
  const login = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  return (
    <div className="w-screen h-screen bg-[#fffff4] flex items-center justify-center">
      <button
        onClick={login}
        className="border border-[#c7a36c] px-6 py-3 rounded-xl"
      >
        Sign in with Google
      </button>
    </div>
  );
}

function Map({ user, domains, setDomains, links, setLinks }) {
  const [mode, setMode] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const dragRef = useRef(null);

  const addDomain = () => {
    if (!name) return;
    const id = Date.now().toString();
    setDomains([
      ...domains,
      {
        id,
        name,
        x: Math.random() * 70 + 10,
        y: Math.random() * 70 + 10,
        notes: [],
      },
    ]);
    setName("");
    setMode(null);
  };

  const addLink = () => {
    if (!a || !b || a === b) return;
    setLinks([...links, { id: Date.now().toString(), a, b, notes: [] }]);
    setMode(null);
    setA("");
    setB("");
  };

  const startDrag = (e, d) => {
    e.stopPropagation();
    dragRef.current = { id: d.id };
  };

  const onMove = (e) => {
    if (!dragRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setDomains((ds) =>
      ds.map((d) => (d.id === dragRef.current.id ? { ...d, x, y } : d))
    );
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  const getDomain = (id) => domains.find((d) => d.id === id);

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      onMouseMove={onMove}
      onMouseUp={stopDrag}
    >
      {/* more visible grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(#c7a36c55 1px, transparent 1px), linear-gradient(90deg, #c7a36c55 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {links.map((l) => {
          const d1 = getDomain(l.a);
          const d2 = getDomain(l.b);
          if (!d1 || !d2) return null;
          return (
            <line
              key={l.id}
              x1={`${d1.x}%`}
              y1={`${d1.y}%`}
              x2={`${d2.x}%`}
              y2={`${d2.y}%`}
              stroke="#c7a36c"
              strokeWidth="2"
            />
          );
        })}
      </svg>

      {domains.map((d) => (
        <div
          key={d.id}
          onMouseDown={(e) => startDrag(e, d)}
          onDoubleClick={() => setSelectedDomain(d)}
          className="absolute w-20 h-20 sm:w-28 sm:h-28 text-xs sm:text-sm rounded-full border border-[#c7a36c] flex items-center justify-center cursor-move bg-[#fffff4] select-none text-center p-2"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            transform: "translate(-50%,-50%)",
          }}
        >
          {d.name}
        </div>
      ))}

      {/* FAB responsive */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex gap-2">
        <button
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[#c7a36c]"
          onClick={() => setMode("link")}
        >
          ↔
        </button>
        <button
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#c7a36c] text-white"
          onClick={() => setMode("domain")}
        >
          +
        </button>
      </div>

      {mode === "domain" && (
        <Modal onClose={() => setMode(null)}>
          <input
            className="border border-[#c7a36c] p-2 w-full bg-[#fffff4]"
            placeholder="Domain"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={addDomain}
            className="border border-[#c7a36c] p-2 mt-2 w-full"
          >
            Add
          </button>
        </Modal>
      )}

      {selectedDomain && (
        <Modal onClose={() => setSelectedDomain(null)}>
          <h2 className="text-lg mb-2">{selectedDomain.name}</h2>

          <input
            className="border border-[#c7a36c] p-2 bg-[#fffff4] w-full"
            placeholder="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button
            className="border border-[#c7a36c] p-2 mt-2 w-full"
            onClick={() => {
              if (!note) return;
              setDomains((ds) =>
                ds.map((d) =>
                  d.id === selectedDomain.id
                    ? { ...d, notes: [...d.notes, note] }
                    : d
                )
              );
              setNote("");
            }}
          >
            Add
          </button>

          <div className="flex flex-col gap-1 max-h-40 overflow-auto mt-2">
            {domains
              .find((d) => d.id === selectedDomain.id)
              ?.notes.map((n, i) => (
                <div key={i} className="border border-[#c7a36c]/30 p-2">
                  {n}
                </div>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Community({ user }) {
  const [threads, setThreads] = useState(() => {
    const saved = localStorage.getItem("community-threads");
    return saved ? JSON.parse(saved) : [];
  });

  const [text, setText] = useState("");

  useEffect(() => {
    localStorage.setItem("community-threads", JSON.stringify(threads));
  }, [threads]);

  const post = () => {
    if (!text) return;
    setThreads([
      {
        id: Date.now().toString(),
        user: user.email || "anon",
        text,
        likes: 0,
        comments: [],
      },
      ...threads,
    ]);
    setText("");
  };

  const like = (id) => {
    setThreads((t) =>
      t.map((th) => (th.id === id ? { ...th, likes: th.likes + 1 } : th))
    );
  };

  const comment = (id, c) => {
    setThreads((t) =>
      t.map((th) =>
        th.id === id
          ? { ...th, comments: [...th.comments, { text: c, user: user.email }] }
          : th
      )
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 overflow-auto h-full">
      <div className="flex gap-2">
        <input
          className="flex-1 border border-[#c7a36c] p-2 bg-[#fffff4]"
          placeholder="Share an idea..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={post}
          className="border border-[#c7a36c] px-4"
        >
          Post
        </button>
      </div>

      {threads.map((t) => (
        <Thread key={t.id} data={t} like={like} comment={comment} />
      ))}
    </div>
  );
}

function Thread({ data, like, comment }) {
  const [reply, setReply] = useState("");

  return (
    <div className="border border-[#c7a36c]/30 p-3 rounded-xl">
      <div className="text-xs opacity-60">{data.user}</div>
      <div className="my-2">{data.text}</div>

      <div className="flex gap-4 text-sm mb-2">
        <button onClick={() => like(data.id)}>♥ {data.likes}</button>
      </div>

      <div className="space-y-1 mb-2">
        {data.comments.map((c, i) => (
          <div key={i} className="text-sm opacity-80">
            <b>{c.user}</b>: {c.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-[#c7a36c] p-1 text-sm bg-[#fffff4]"
          placeholder="Reply..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button
          onClick={() => {
            if (!reply) return;
            comment(data.id, reply);
            setReply("");
          }}
        >
          reply
        </button>
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center p-4">
      <div className="bg-[#fffff4] border border-[#c7a36c] rounded-xl p-4 w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-2 right-2">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
