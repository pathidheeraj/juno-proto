import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const emptyUsers = [];

function useUsers() {
  const [users, setUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("juno-users")) || emptyUsers;
    } catch {
      return emptyUsers;
    }
  });

  useEffect(() => {
    localStorage.setItem("juno-users", JSON.stringify(users));
  }, [users]);

  return [users, setUsers];
}

function Layout({ children }) {
  return (
    <>
      <header>
        <Link to="/" className="brand">
          JUNO Attendance
        </Link>

        <nav>
          <Link to="/">Home</Link>
          <Link to="/users">Accounts</Link>
          <Link to="/scan">Attendance</Link>
          <Link to="/history">History</Link>
          <Link to="/demo">Demo QR</Link>
        </nav>
      </header>

      <main>{children}</main>
    </>
  );
}

function Home() {
  return (
    <div className="page hero">
      <div>
        <p className="eyebrow">JUNO ATTENDANCE CLIENT</p>

        <h1>JUNO Attendance</h1>

        <p>
          Lightweight QR attendance client for an
          authorized university/test environment.
        </p>

        <div className="actions">
          <Link className="btn primary" to="/scan">
            Mark Attendance
          </Link>

          <Link className="btn" to="/users">
            Manage Accounts
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>How it works</h2>

        <p>
          Connect authorized JUNO student accounts,
          select the accounts you want to use, and
          scan the attendance QR.
        </p>

        <p>
          The actual JUNO connection must use the
          university-approved authentication/API.
        </p>
      </div>
    </div>
  );
}

/* ---------------- USERS ---------------- */

function Users() {
  const [users, setUsers] = useUsers();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const selectedCount = users.filter((u) => u.enabled).length;

  function addUser(e) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Enter your JUNO student email.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (users.some((u) => u.email === cleanEmail)) {
      setMessage("This account is already added.");
      return;
    }

    if (users.length >= 4) {
      setMessage("Maximum of 4 accounts.");
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      connected: false,
      enabled: false
    };

    setUsers([...users, newUser]);

    setEmail("");

    setMessage(
      "Account added. Connect it to JUNO before using attendance."
    );
  }

  function removeUser(id) {
    setUsers(users.filter((u) => u.id !== id));
  }

  function toggleUser(id) {
    const currentlySelected = users.find((u) => u.id === id);

    if (!currentlySelected) return;

    if (!currentlySelected.connected) {
      setMessage(
        "Connect this JUNO account before selecting it."
      );
      return;
    }

    if (!currentlySelected.enabled && selectedCount >= 4) {
      setMessage("You can select a maximum of 4 accounts.");
      return;
    }

    setUsers(
      users.map((u) =>
        u.id === id
          ? { ...u, enabled: !u.enabled }
          : u
      )
    );
  }

  /*
   * IMPORTANT:
   * This is intentionally an integration point.
   *
   * Your professor/university should provide the
   * official authentication URL/API.
   *
   * Do NOT put JUNO passwords in this React app.
   */
  async function connectJuno(user) {
    setMessage(`Starting JUNO connection for ${user.email}...`);

    try {
      const response = await fetch(
        `${API}/api/juno/connect/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: user.email
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start JUNO connection."
        );
      }

      /*
       * The authorized backend should return an
       * official JUNO authentication URL.
       */
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      setMessage(
        "JUNO authentication endpoint is not configured yet."
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="page narrow">
      <p className="eyebrow">ACCOUNT MANAGEMENT</p>

      <h1>JUNO Accounts</h1>

      <p>
        Add the student email associated with an
        authorized JUNO account.
      </p>

      <div className="card">
        {users.length === 0 && (
          <p>No JUNO accounts connected yet.</p>
        )}

        {users.map((user) => (
          <div className="row" key={user.id}>
            <div>
              <b>{user.email}</b>

              <small>
                {user.connected
                  ? "✓ Connected to JUNO"
                  : "Not connected"}
              </small>
            </div>

            <div className="account-actions">
              <button
                className={
                  user.connected
                    ? "selected"
                    : "primary"
                }
                onClick={() => connectJuno(user)}
              >
                {user.connected
                  ? "Reconnect"
                  : "Connect JUNO"}
              </button>

              <button
                className={
                  user.enabled ? "selected" : ""
                }
                onClick={() => toggleUser(user.id)}
              >
                {user.enabled
                  ? "Selected"
                  : "Select"}
              </button>

              <button
                className="danger"
                onClick={() => removeUser(user.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="card add" onSubmit={addUser}>
        <h2>Add JUNO Account</h2>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@university.edu"
        />

        <button className="btn primary">
          + Add Account
        </button>
      </form>

      {message && (
        <div className="notice">
          {message}
        </div>
      )}

      <p>
        {selectedCount}/4 accounts selected
      </p>
    </div>
  );
}

/* ---------------- SCANNER ---------------- */

function Scan() {
  const [users] = useUsers();

  const selected = users
    .filter((u) => u.enabled && u.connected)
    .slice(0, 4);

  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  async function startScanner() {
    if (selected.length === 0) {
      setMessage(
        "Connect and select at least one JUNO account first."
      );
      return;
    }

    setMessage("");
    setResult(null);
    setRunning(true);

    const scanner = new Html5Qrcode("reader");

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250
          }
        },

        async (decodedText) => {
          await scanner.stop().catch(() => {});
          await scanner.clear().catch(() => {});

          setRunning(false);

          await submitAttendance(decodedText);
        },

        () => {}
      );
    } catch (error) {
      setRunning(false);

      setMessage(
        "Camera could not start. Make sure the site is HTTPS and camera permission is allowed."
      );
    }
  }

  async function submitAttendance(qrPayload) {
    setMessage("Submitting attendance...");

    try {
      /*
       * This endpoint must be implemented against
       * your professor-approved JUNO/test API.
       */
      const response = await fetch(
        `${API}/api/juno/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            qrPayload,
            users: selected.map((u) => ({
              id: u.id,
              email: u.email
            }))
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Attendance request failed."
        );
      }

      setResult(data);

      setMessage(
        "Attendance request completed."
      );

      const history = JSON.parse(
        localStorage.getItem("juno-history") || "[]"
      );

      localStorage.setItem(
        "juno-history",
        JSON.stringify([
          data,
          ...history
        ].slice(0, 50))
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="page narrow">
      <p className="eyebrow">ATTENDANCE</p>

      <h1>Mark Attendance</h1>

      <div className="card">
        <h3>Connected accounts</h3>

        <div className="chips">
          {selected.map((user) => (
            <span key={user.id}>
              {user.email}
            </span>
          ))}

          {selected.length === 0 && (
            <p>No connected accounts selected.</p>
          )}
        </div>
      </div>

      <div className="scanner">
        <div id="reader"></div>

        {!running && !result && (
          <button
            className="btn primary big"
            onClick={startScanner}
          >
            Scan JUNO QR
          </button>
        )}
      </div>

      {message && (
        <div className="notice">
          {message}
        </div>
      )}

      {result && (
        <div className="card">
          <h2>Attendance Result</h2>

          {result.records?.map((record) => (
            <div
              className="row"
              key={record.email}
            >
              <span>{record.email}</span>

              <b className="ok">
                {record.status}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- DEMO QR ---------------- */

function Demo() {
  const [img, setImg] = useState("");

  const [payload, setPayload] =
    useState("");

  async function generate() {
    const response = await fetch(
      `${API}/api/demo/qr`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          seconds: 4
        })
      }
    );

    const data = await response.json();

    setPayload(data.payload);

    const QRCode =
      await import("qrcode");

    setImg(
      await QRCode.toDataURL(
        data.payload,
        {
          width: 350,
          margin: 2
        }
      )
    );
  }

  return (
    <div className="page narrow center">
      <p className="eyebrow">
        TEST ENVIRONMENT
      </p>

      <h1>Demo QR</h1>

      <p>
        This generates a QR for your local/test
        attendance server. It is not a JUNO QR.
      </p>

      <button
        className="btn primary big"
        onClick={generate}
      >
        Generate 4-second QR
      </button>

      {img && (
        <>
          <img
            className="qr"
            src={img}
            alt="Demo QR"
          />

          <code>{payload}</code>
        </>
      )}
    </div>
  );
}

/* ---------------- HISTORY ---------------- */

function History() {
  const [items] = useState(() =>
    JSON.parse(
      localStorage.getItem("juno-history") || "[]"
    )
  );

  return (
    <div className="page narrow">
      <p className="eyebrow">
        RECORDS
      </p>

      <h1>History</h1>

      {!items.length && (
        <div className="card">
          No attendance records yet.
        </div>
      )}

      {items.map((item, index) => (
        <div
          className="card"
          key={index}
        >
          <b>
            {item.timestamp
              ? new Date(
                  item.timestamp
                ).toLocaleString()
              : "Attendance"}
          </b>

          {item.records?.map(
            (record) => (
              <div
                className="row"
                key={
                  record.email ||
                  record.id
                }
              >
                <span>
                  {record.email ||
                    record.name}
                </span>

                <span className="ok">
                  {record.status}
                </span>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- APP ---------------- */

function App() {
  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/users"
          element={<Users />}
        />

        <Route
          path="/scan"
          element={<Scan />}
        />

        <Route
          path="/demo"
          element={<Demo />}
        />

        <Route
          path="/history"
          element={<History />}
        />
      </Routes>
    </Layout>
  );
}

createRoot(
  document.getElementById("root")
).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
