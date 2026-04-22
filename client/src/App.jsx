import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import SlotMachine from './components/SlotMachine';
import { apiRequest } from './api';
import './App.css';

const storageKey = 'solarwaves-session';
const themeStorageKey = 'solarwaves-theme';

const emptySession = {
  token: '',
  user: null,
};

const loadStoredSession = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : emptySession;
  } catch {
    return emptySession;
  }
};

const loadStoredTheme = () => {
  try {
    return localStorage.getItem(themeStorageKey) || 'dark';
  } catch {
    return 'dark';
  }
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Never';

const formatTransactionLabel = (type) =>
  type
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');

function AuthPanel({ mode, onAuthenticated }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      onAuthenticated(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-card">
      <div>
        <p className="eyebrow">Victory Gaming</p>
        <h2>{mode === 'admin' ? 'Admin Access' : 'Player Access'}</h2>
      </div>

      <div className="pill-row">
        {mode === 'player' ? (
          <span className="pill active">Player Login</span>
        ) : (
          <span className="pill active">Admin Login</span>
        )}
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder={mode === 'admin' ? 'admin@solarwaves.com' : 'player@solarwaves.com'}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Minimum 6 characters"
            required
          />
        </label>
        {error ? <p className="error-banner">{error}</p> : null}
        <button className="primary-button large" type="submit" disabled={loading}>
          {loading ? 'Working...' : 'Continue'}
        </button>
      </form>
    </section>
  );
}

function LandingPreview() {
  return (
    <section className="auth-card preview-card">
      <div>
        <p className="eyebrow">Solar Waves</p>
        <h2>Victory Gaming</h2>
      </div>
      <SlotMachine preview />
    </section>
  );
}

function PlayerView({ session, onLogout, onSessionUpdate }) {
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState('');
  const balance = dashboard?.user.pointsBalance ?? session.user.pointsBalance;
  const balancePercent = Math.max(10, Math.min(100, Math.round((balance / 500) * 100)));
  const vipTier =
    balance >= 400 ? 'Solar Black' : balance >= 250 ? 'Aurora Gold' : balance >= 100 ? 'Wave Silver' : 'Starter';
  const recentWins =
    dashboard?.transactions?.filter((item) => item.amount > 0).slice(0, 5) ?? [];

  const refreshDashboard = useCallback(async () => {
    const data = await apiRequest('/api/game/dashboard', {}, session.token);
    startTransition(() => {
      setDashboard(data);
      onSessionUpdate((current) => {
        if (current.token !== session.token || !current.user) {
          return current;
        }

        return {
          ...current,
          user: {
            ...current.user,
            pointsBalance: data.user.pointsBalance,
          },
        };
      });
    });
  }, [onSessionUpdate, session]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await refreshDashboard();
      } catch (error) {
        if (active) {
          startTransition(() => setMessage(error.message));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshDashboard]);

  const handleSpinComplete = async (result) => {
    setMessage(
      result.payout > 0
        ? `Spin settled. Payout ${result.payout} points, balance ${result.balance}.`
        : `Spin settled. ${result.spinCost} points deducted, no payout this round.`,
    );
    await refreshDashboard();
  };

  return (
    <div className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Victory Gaming</p>
          <h1>Solar Waves by Victory Gaming</h1>
        </div>
        <div className="hero-actions">
          <div className="balance-card premium-balance">
            <span>Wallet balance</span>
            <strong>{balance} pts</strong>
            <div className="balance-meter" aria-hidden="true">
              <div className="balance-meter-fill" style={{ width: `${balancePercent}%` }} />
            </div>
            <small>{vipTier} tier progression</small>
          </div>
          <button className="ghost-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className="jackpot-strip" aria-label="Live casino highlights">
        <div className="jackpot-badge">Live Meter</div>
        <div className="jackpot-ticker">
          <div className="jackpot-track">
            <span>Grand Jackpot x{dashboard?.slotConfig?.payoutMultipliers?.jackpot ?? '--'}</span>
            <span>Triple Match x{dashboard?.slotConfig?.payoutMultipliers?.threeMatch ?? '--'}</span>
            <span>Double Match x{dashboard?.slotConfig?.payoutMultipliers?.twoMatch ?? '--'}</span>
            <span>Spin Ticket {dashboard?.slotConfig?.spinCost ?? '--'} pts</span>
            <span>Win Rate {dashboard?.slotConfig?.winChancePercent ?? '--'}%</span>
            <span>Grand Jackpot x{dashboard?.slotConfig?.payoutMultipliers?.jackpot ?? '--'}</span>
            <span>Triple Match x{dashboard?.slotConfig?.payoutMultipliers?.threeMatch ?? '--'}</span>
            <span>Double Match x{dashboard?.slotConfig?.payoutMultipliers?.twoMatch ?? '--'}</span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <SlotMachine
          token={session.token}
          config={dashboard?.slotConfig}
          onSpinComplete={handleSpinComplete}
        />

        <aside className="side-column">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Floor Rules</p>
                <h3>Current slot settings</h3>
              </div>
            </div>
            <div className="detail-stack">
              <div>
                <small>Win percentage</small>
                <strong>{dashboard?.slotConfig?.winChancePercent ?? '--'}%</strong>
              </div>
              <div>
                <small>Spin cost</small>
                <strong>{dashboard?.slotConfig?.spinCost ?? '--'} pts</strong>
              </div>
              <div>
                <small>Two-match payout</small>
                <strong>x{dashboard?.slotConfig?.payoutMultipliers?.twoMatch ?? '--'}</strong>
              </div>
              <div>
                <small>Three-match payout</small>
                <strong>x{dashboard?.slotConfig?.payoutMultipliers?.threeMatch ?? '--'}</strong>
              </div>
              <div>
                <small>Jackpot payout</small>
                <strong>x{dashboard?.slotConfig?.payoutMultipliers?.jackpot ?? '--'}</strong>
              </div>
            </div>
            {message ? <p className="status-banner">{message}</p> : null}
          </div>

          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Player Card</p>
                <h3>{session.user.name}</h3>
              </div>
            </div>
            <div className="detail-stack">
              <div>
                <small>Email</small>
                <strong>{session.user.email}</strong>
              </div>
              <div>
                <small>Status</small>
                <strong>{dashboard?.user.status || session.user.status}</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="player-showcase">
        <div className="showcase-card primary">
          <p className="eyebrow">Featured Cabinet</p>
          <h3>Solar Waves Cabinet</h3>
        </div>
        <div className="showcase-card">
          <p className="eyebrow">Win Rate</p>
          <strong>{dashboard?.slotConfig?.winChancePercent ?? '--'}%</strong>
          <small>Current setting</small>
        </div>
        <div className="showcase-card">
          <p className="eyebrow">Base Spin</p>
          <strong>{dashboard?.slotConfig?.spinCost ?? '--'} pts</strong>
          <small>Default cost</small>
        </div>
        <div className="showcase-card accent">
          <p className="eyebrow">Account</p>
          <strong>{dashboard?.user.status || session.user.status}</strong>
          <small>{session.user.email}</small>
        </div>
      </section>

      <section className="vip-grid">
        <div className="vip-card">
          <div>
            <p className="eyebrow">Victory Tier</p>
            <h3>{vipTier}</h3>
          </div>
        </div>
        <div className="wins-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent Wins</p>
              <h3>Victory Board</h3>
            </div>
          </div>
          <div className="wins-row">
            {recentWins.length ? (
              recentWins.map((item) => (
                <div key={item._id} className="win-pill">
                  <strong>+{item.amount}</strong>
                  <small>{formatTransactionLabel(item.type)}</small>
                </div>
              ))
            ) : (
              <p className="muted-copy">No recent wins.</p>
            )}
          </div>
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Point History</p>
              <h3>Recent transactions</h3>
            </div>
          </div>
          <div className="list-stack">
            {dashboard?.transactions?.length ? (
              dashboard.transactions.map((item) => (
                <div key={item._id} className="list-row">
                  <div>
                    <strong>{formatTransactionLabel(item.type)}</strong>
                    <small>{formatDate(item.createdAt)}</small>
                  </div>
                  <div className="list-row-right">
                    <strong>{item.amount > 0 ? `+${item.amount}` : item.amount}</strong>
                    <small>Balance {item.balanceAfter}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted-copy">No activity.</p>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Activity Trail</p>
              <h3>Account events</h3>
            </div>
          </div>
          <div className="list-stack">
            {dashboard?.activities?.length ? (
              dashboard.activities.map((item) => (
                <div key={item._id} className="list-row">
                  <div>
                    <strong>{item.action}</strong>
                    <small>{formatDate(item.createdAt)}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted-copy">No events.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminView({ session, onLogout }) {
  const [adminPage, setAdminPage] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [pointForm, setPointForm] = useState({
    amount: 50,
    note: '',
  });
  const [settingsForm, setSettingsForm] = useState({
    winChancePercent: 28,
    spinCost: 10,
    twoMatchMultiplier: 1.5,
    threeMatchMultiplier: 4,
    jackpotMultiplier: 12,
  });

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || users[0] || null,
    [users, selectedUserId],
  );

  const refresh = useCallback(async () => {
    const [overviewData, usersData, activityData] = await Promise.all([
      apiRequest('/api/admin/overview', {}, session.token),
      apiRequest(`/api/admin/users?search=${encodeURIComponent(deferredSearch)}`, {}, session.token),
      apiRequest('/api/admin/activities', {}, session.token),
    ]);

    startTransition(() => {
      setOverview(overviewData);
      setUsers(usersData.users);
      setActivityFeed(activityData.activities);
      setSettingsForm({
        winChancePercent: overviewData.slotConfig.winChancePercent,
        spinCost: overviewData.slotConfig.spinCost,
        twoMatchMultiplier: overviewData.slotConfig.payoutMultipliers.twoMatch,
        threeMatchMultiplier: overviewData.slotConfig.payoutMultipliers.threeMatch,
        jackpotMultiplier: overviewData.slotConfig.payoutMultipliers.jackpot,
      });

      if (!selectedUserId && usersData.users[0]) {
        setSelectedUserId(usersData.users[0].id);
      }
    });
  }, [deferredSearch, selectedUserId, session.token]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await refresh();
      } catch (error) {
        if (active) {
          startTransition(() => setActionMessage(error.message));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [refresh]);

  const createUser = async (event) => {
    event.preventDefault();
    setActionMessage('');

    try {
      await apiRequest(
        '/api/admin/users',
        {
          method: 'POST',
          body: JSON.stringify(createForm),
        },
        session.token,
      );
      setCreateForm({ name: '', email: '', password: '' });
      setActionMessage('Player account created.');
      await refresh();
    } catch (error) {
      setActionMessage(error.message);
    }
  };

  const runPointAction = async (type) => {
    if (!selectedUser) {
      return;
    }

    setActionMessage('');

    try {
      await apiRequest(
        `/api/admin/users/${selectedUser.id}/${type}`,
        {
          method: 'POST',
          body: JSON.stringify(pointForm),
        },
        session.token,
      );
      setPointForm((current) => ({ ...current, note: '' }));
      setActionMessage(
        type === 'load' ? 'Points loaded successfully.' : 'Points redeemed successfully.',
      );
      await refresh();
    } catch (error) {
      setActionMessage(error.message);
    }
  };

  const toggleStatus = async () => {
    if (!selectedUser) {
      return;
    }

    const nextStatus = selectedUser.status === 'active' ? 'blocked' : 'active';

    try {
      await apiRequest(
        `/api/admin/users/${selectedUser.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        },
        session.token,
      );
      setActionMessage(`User status updated to ${nextStatus}.`);
      await refresh();
    } catch (error) {
      setActionMessage(error.message);
    }
  };

  const saveSlotSettings = async (event) => {
    event.preventDefault();
    setActionMessage('');

    try {
      await apiRequest(
        '/api/admin/slot-settings',
        {
          method: 'PATCH',
          body: JSON.stringify(settingsForm),
        },
        session.token,
      );
      setActionMessage('Slot settings updated.');
      await refresh();
    } catch (error) {
      setActionMessage(error.message);
    }
  };

  const adminPages = [
    ['overview', 'Overview'],
    ['create', 'Create User'],
    ['wallet', 'Wallet Tools'],
    ['slots', 'Slot Controls'],
    ['activity', 'Activity'],
  ];

  return (
    <div className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Victory Gaming</p>
          <h1>Solar Waves Admin</h1>
        </div>
        <div className="hero-actions">
          <div className="balance-card">
            <span>Signed in as</span>
            <strong>{session.user.name}</strong>
          </div>
          <button className="ghost-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </section>
      <section className="admin-nav">
        {adminPages.map(([value, label]) => (
          <button
            key={value}
            className={adminPage === value ? 'admin-nav-button active' : 'admin-nav-button'}
            onClick={() => setAdminPage(value)}
          >
            {label}
          </button>
        ))}
      </section>

      {actionMessage ? <section className="admin-message"><p className="status-banner">{actionMessage}</p></section> : null}

      {adminPage === 'overview' ? (
        <>
          <section className="metrics-grid">
            {[
              ['Players', overview?.metrics.players || 0],
              ['Active', overview?.metrics.activePlayers || 0],
              ['Blocked', overview?.metrics.blockedPlayers || 0],
              ['Points Live', overview?.metrics.totalPointsInCirculation || 0],
            ].map(([label, value]) => (
              <div key={label} className="metric-card">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </section>

          <section className="lower-grid">
            <div className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recent System Activity</p>
                  <h3>Operations feed</h3>
                </div>
              </div>
              <div className="list-stack">
                {activityFeed.length ? (
                  activityFeed.slice(0, 14).map((item) => (
                    <div key={item._id} className="list-row">
                      <div>
                        <strong>{item.action}</strong>
                        <small>
                          {(item.actor?.name || 'System')} {item.targetUser ? `-> ${item.targetUser.name}` : ''}
                        </small>
                      </div>
                      <small>{formatDate(item.createdAt)}</small>
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">No activity.</p>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recent Admin Snapshot</p>
                  <h3>Health at a glance</h3>
                </div>
              </div>
              <div className="list-stack">
                {overview?.recentActivity?.length ? (
                  overview.recentActivity.map((item) => (
                    <div key={item._id} className="list-row">
                      <div>
                        <strong>{item.action}</strong>
                        <small>{item.targetUser?.email || item.actor?.email || 'system'}</small>
                      </div>
                      <small>{formatDate(item.createdAt)}</small>
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">No activity.</p>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {adminPage === 'create' ? (
        <section className="admin-single">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Provisioning</p>
                <h3>Create a new player</h3>
              </div>
            </div>
            <form className="auth-form compact" onSubmit={createUser}>
              <label>
                Name
                <input
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                Create player
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {adminPage === 'wallet' ? (
        <section className="admin-single">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">User Ledger</p>
                <h3>Load, redeem, and manage users</h3>
              </div>
            </div>
            <label className="search-field">
              Search users
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="name or email" />
            </label>
            <div className="user-list">
              {users.map((user) => (
                <button
                  key={user.id}
                  className={selectedUser?.id === user.id ? 'user-pill active' : 'user-pill'}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <strong>{user.name}</strong>
                  <span>{user.pointsBalance} pts</span>
                </button>
              ))}
            </div>
            {selectedUser ? (
              <div className="selected-user-card">
                <div className="mini-grid">
                  <div>
                    <small>Email</small>
                    <strong>{selectedUser.email}</strong>
                  </div>
                  <div>
                    <small>Status</small>
                    <strong>{selectedUser.status}</strong>
                  </div>
                </div>
                <label>
                  Amount
                  <input
                    type="number"
                    min="1"
                    value={pointForm.amount}
                    onChange={(event) => setPointForm((current) => ({ ...current, amount: Number(event.target.value) }))}
                  />
                </label>
                <label>
                  Note
                  <input
                    value={pointForm.note}
                    onChange={(event) => setPointForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Optional reason"
                  />
                </label>
                <div className="button-row">
                  <button className="primary-button" onClick={() => runPointAction('load')}>
                    Load points
                  </button>
                  <button className="ghost-button danger" onClick={() => runPointAction('redeem')}>
                    Redeem points
                  </button>
                  <button className="ghost-button" onClick={toggleStatus}>
                    {selectedUser.status === 'active' ? 'Block user' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted-copy">No user selected.</p>
            )}
          </div>
        </section>
      ) : null}

      {adminPage === 'slots' ? (
        <section className="admin-single">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Slot Controls</p>
                <h3>Win percentage and payouts</h3>
              </div>
            </div>
            <form className="auth-form compact" onSubmit={saveSlotSettings}>
              <label>
                Win percentage
                <input
                  type="number"
                  min="1"
                  max="95"
                  value={settingsForm.winChancePercent}
                  onChange={(event) => setSettingsForm((current) => ({
                    ...current,
                    winChancePercent: Number(event.target.value),
                  }))}
                  required
                />
              </label>
              <label>
                Spin cost
                <input
                  type="number"
                  min="1"
                  value={settingsForm.spinCost}
                  onChange={(event) => setSettingsForm((current) => ({
                    ...current,
                    spinCost: Number(event.target.value),
                  }))}
                  required
                />
              </label>
              <label>
                Two-match multiplier
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={settingsForm.twoMatchMultiplier}
                  onChange={(event) => setSettingsForm((current) => ({
                    ...current,
                    twoMatchMultiplier: Number(event.target.value),
                  }))}
                  required
                />
              </label>
              <label>
                Three-match multiplier
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={settingsForm.threeMatchMultiplier}
                  onChange={(event) => setSettingsForm((current) => ({
                    ...current,
                    threeMatchMultiplier: Number(event.target.value),
                  }))}
                  required
                />
              </label>
              <label>
                Jackpot multiplier
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={settingsForm.jackpotMultiplier}
                  onChange={(event) => setSettingsForm((current) => ({
                    ...current,
                    jackpotMultiplier: Number(event.target.value),
                  }))}
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                Save slot settings
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {adminPage === 'activity' ? (
        <section className="admin-single">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent System Activity</p>
                <h3>Operations feed</h3>
              </div>
            </div>
            <div className="list-stack">
              {activityFeed.length ? (
                activityFeed.map((item) => (
                  <div key={item._id} className="list-row">
                    <div>
                      <strong>{item.action}</strong>
                      <small>
                        {(item.actor?.name || 'System')} {item.targetUser ? `-> ${item.targetUser.name}` : ''}
                      </small>
                    </div>
                    <small>{formatDate(item.createdAt)}</small>
                  </div>
                ))
              ) : (
                <p className="muted-copy">No activity.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState('player');
  const [session, setSession] = useState(loadStoredSession);
  const [theme, setTheme] = useState(loadStoredTheme);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem(themeStorageKey, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleAuthenticated = (data) => {
    setSession({
      token: data.token,
      user: data.user,
    });
    setMode(data.user.role === 'admin' ? 'admin' : 'player');
  };

  const logout = () => {
    localStorage.removeItem(storageKey);
    setSession(emptySession);
  };

  return (
    <main className={`page-shell theme-${theme}`}>
      <section className="topbar">
        <div>
          <p className="eyebrow">Victory Gaming</p>
          <strong>Solar Waves by Victory Gaming</strong>
        </div>
        <div className="topbar-actions">
          <label className="theme-switch" aria-label="Toggle light and dark mode">
            <span>Light</span>
            <button
              type="button"
              className={`theme-slider ${theme === 'light' ? 'light' : 'dark'}`}
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              aria-pressed={theme === 'light'}
            >
              <span className="theme-slider-track" />
              <span className="theme-slider-thumb" />
            </button>
            <span>Dark</span>
          </label>
        {!session.user ? (
          <div className="pill-row">
            <button className={mode === 'player' ? 'pill active' : 'pill'} onClick={() => setMode('player')}>
              Player
            </button>
            <button className={mode === 'admin' ? 'pill active' : 'pill'} onClick={() => setMode('admin')}>
              Admin
            </button>
          </div>
        ) : null}
        </div>
      </section>

      {session.user ? (
        session.user.role === 'admin' ? (
          <AdminView session={session} onLogout={logout} />
        ) : (
          <PlayerView session={session} onLogout={logout} onSessionUpdate={setSession} />
        )
      ) : (
        <div className="landing-grid">
          <AuthPanel key={mode} mode={mode} onAuthenticated={handleAuthenticated} />
          <LandingPreview />
        </div>
      )}
    </main>
  );
}

export default App;
