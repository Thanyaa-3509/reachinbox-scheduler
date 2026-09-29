import { useEffect, useState } from "react";

type Email = {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  body: string;
  scheduled_at: string;
  sent_at: string | null;
  status: string;
};

const API = "http://localhost:4000";

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [showCompose, setShowCompose] = useState(false);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [delay, setDelay] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  const loadEmails = async () => {
    const res = await fetch(`${API}/api/emails`);
    const data = await res.json();
    setEmails(data);
  };

  useEffect(() => {
    loadEmails();

    const interval = setInterval(loadEmails, 3000);
    return () => clearInterval(interval);
  }, []);

  const parseFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();

    const found = text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    );

    const uniqueEmails = [...new Set(found || [])];

    setRecipients(uniqueEmails);
  };

  const scheduleEmails = async () => {
    if (!recipients.length) {
      alert("Upload a CSV or TXT file first.");
      return;
    }

    if (!subject || !body || !scheduledAt) {
      alert("Fill subject, body and start time.");
      return;
    }

    setLoading(true);

    try {
      const start = new Date(scheduledAt).getTime();

      for (let i = 0; i < recipients.length; i++) {
        const hour = Math.floor(i / hourlyLimit);
        const position = i % hourlyLimit;

        const sendTime =
          start +
          hour * 60 * 60 * 1000 +
          position * delay * 1000;

        await fetch(`${API}/api/emails/schedule`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: recipients[i],
            sender: "madisen.hegmann35@ethereal.email",
            subject,
            body,
            scheduledAt: new Date(sendTime).toISOString(),
          }),
        });
      }

      alert(`${recipients.length} emails scheduled!`);

      setRecipients([]);
      setSubject("");
      setBody("");
      setScheduledAt("");
      setShowCompose(false);

      await loadEmails();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const visibleEmails = emails.filter((email) =>
    tab === "sent"
      ? email.status === "sent" || email.status === "failed"
      : email.status !== "sent" && email.status !== "failed"
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>ReachInbox</h1>
          <p style={styles.subtitle}>Email Scheduler</p>
        </div>

        <button
          style={styles.primaryButton}
          onClick={() => setShowCompose(true)}
        >
          + Compose New Email
        </button>
      </header>

      <main style={styles.main}>
        <div style={styles.tabs}>
          <button
            style={tab === "scheduled" ? styles.activeTab : styles.tab}
            onClick={() => setTab("scheduled")}
          >
            Scheduled Emails
          </button>

          <button
            style={tab === "sent" ? styles.activeTab : styles.tab}
            onClick={() => setTab("sent")}
          >
            Sent Emails
          </button>
        </div>

        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>
                  {tab === "sent" ? "Sent Time" : "Scheduled Time"}
                </th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>

            <tbody>
              {visibleEmails.map((email) => (
                <tr key={email.id}>
                  <td style={styles.td}>{email.recipient}</td>
                  <td style={styles.td}>{email.subject}</td>

                  <td style={styles.td}>
                    {new Date(
                      tab === "sent"
                        ? email.sent_at || email.scheduled_at
                        : email.scheduled_at
                    ).toLocaleString()}
                  </td>

                  <td style={styles.td}>
                    <span style={styles.status}>
                      {email.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleEmails.length === 0 && (
            <div style={styles.empty}>
              No {tab} emails.
            </div>
          )}
        </div>
      </main>

      {showCompose && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2>Compose New Email</h2>

            <label>Email Leads</label>

            <input
              type="file"
              accept=".csv,.txt"
              onChange={parseFile}
            />

            <p>
              {recipients.length > 0
                ? `✓ ${recipients.length} email addresses detected`
                : "Upload a CSV or TXT file"}
            </p>

            <label>Subject</label>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              style={styles.input}
            />

            <label>Body</label>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email..."
              style={styles.textarea}
            />

            <label>Start Time</label>

            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={styles.input}
            />

            <label>Delay Between Emails (seconds)</label>

            <input
              type="number"
              min="1"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              style={styles.input}
            />

            <label>Hourly Limit</label>

            <input
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(e) =>
                setHourlyLimit(Number(e.target.value))
              }
              style={styles.input}
            />

            <div style={styles.actions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowCompose(false)}
              >
                Cancel
              </button>

              <button
                style={styles.primaryButton}
                onClick={scheduleEmails}
                disabled={loading}
              >
                {loading ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    background: "white",
    borderBottom: "1px solid #e5e7eb",
    padding: "20px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    margin: 0,
    fontSize: "24px",
  },

  subtitle: {
    margin: "4px 0 0",
    color: "#64748b",
  },

  main: {
    padding: "40px",
  },

  tabs: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
  },

  activeTab: {
    border: "none",
    background: "transparent",
    fontWeight: "bold",
    fontSize: "16px",
    borderBottom: "2px solid black",
    padding: "10px",
    cursor: "pointer",
  },

  tab: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "16px",
    padding: "10px",
    cursor: "pointer",
  },

  card: {
    background: "white",
    borderRadius: "12px",
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  },

  table: {
    width: "100%",
    minWidth: "700px",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "16px",
    background: "#f8fafc",
  },

  td: {
    padding: "16px",
    borderTop: "1px solid #e5e7eb",
  },

  status: {
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#f1f5f9",
    fontSize: "12px",
    fontWeight: "bold",
  },

  empty: {
    padding: "50px",
    textAlign: "center",
    color: "#64748b",
  },

  primaryButton: {
    background: "#111827",
    color: "white",
    border: "none",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    background: "white",
    width: "500px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "30px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  input: {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
  },

  textarea: {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    minHeight: "120px",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "15px",
  },

  cancelButton: {
    padding: "11px 18px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
  },
};

export default App;