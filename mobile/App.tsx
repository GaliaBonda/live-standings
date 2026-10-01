import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { io, type Socket } from "socket.io-client";
import { api, apiUrl, type AuthUser, type Contest, type RankedEntry } from "./src/api";

const DEMOS = [
  { email: "nia@demo.local", label: "Nia · host" },
  { email: "kai@demo.local", label: "Kai · player" },
  { email: "remi@demo.local", label: "Remi · player" },
  { email: "sol@demo.local", label: "Sol · player" },
];

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.safe}>
          <Text style={styles.errorPad}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function Screen({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.backgroundColor = "#0b1220";
    const root = document.getElementById("root");
    if (root) {
      root.style.display = "flex";
      root.style.flex = "1";
      root.style.height = "100%";
      root.style.minHeight = "100vh";
    }
  }, []);

  const Root = Platform.OS === "web" ? View : SafeAreaView;
  return <Root style={styles.safe}>{children}</Root>;
}

function AppInner() {
  const [email, setEmail] = useState("nia@demo.local");
  const [password, setPassword] = useState("demo1234");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [ranks, setRanks] = useState<RankedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !contest) return;
    const socket: Socket = io(apiUrl(), {
      auth: { token },
      transports: ["websocket"],
    });
    socket.on("connect", () => socket.emit("join", contest.id));
    socket.on("standings", (payload: { ranks: RankedEntry[] }) => {
      setRanks(payload.ranks);
    });
    socket.on("connect_error", (err) => setError(err.message));
    return () => {
      socket.disconnect();
    };
  }, [token, contest]);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ token: string; user: AuthUser }>(
        "/api/auth/login",
        null,
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      setToken(data.token);
      setUser(data.user);
      const contests = await api<Contest[]>("/api/contests", data.token);
      const live = contests[0];
      setContest(live ?? null);
      if (live) {
        const board = await api<{ ranks: RankedEntry[] }>(
          `/api/contests/${live.id}/standings`,
          data.token,
        );
        setRanks(board.ranks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function award(userId: string, delta: number) {
    if (!token || !contest) return;
    setError(null);
    try {
      await api(`/api/contests/${contest.id}/scores`, token, {
        method: "POST",
        body: JSON.stringify({
          userId,
          delta,
          reason: delta > 0 ? "Correct answer" : "Penalty",
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Score update failed");
    }
  }

  const subtitle = useMemo(() => {
    if (!user || !contest) return "Sanitized live scores. Not fantasy sports.";
    return `${contest.name} · ${user.role}`;
  }, [user, contest]);

  if (!token || !user) {
    return (
      <Screen>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.login}>
          <Text style={styles.kicker}>Live standings</Text>
          <Text style={styles.title}>Trivia Night</Text>
          <Text style={styles.copy}>
            Express + Socket.IO + Redis sorted sets. Password for every demo
            user is demo1234.
          </Text>
          <View style={styles.chips}>
            {DEMOS.map((demo) => (
          <Pressable
            key={demo.email}
            accessibilityRole="button"
            onPress={() => setEmail(demo.email)}
                style={[
                  styles.chip,
                  email === demo.email && styles.chipOn,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    email === demo.email && styles.chipTextOn,
                  ]}
                >
                  {demo.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => void signIn()}
            disabled={busy}
            style={styles.button}
          >
            {busy ? (
              <ActivityIndicator color="#0b1220" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{user.name}</Text>
          <Text style={styles.title}>{subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setToken(null);
            setUser(null);
            setRanks([]);
          }}
        >
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.errorPad}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.list}>
        {ranks.map((row) => (
          <View key={row.userId} style={styles.row}>
            <View style={styles.rank}>
              <Text style={styles.rankText}>{row.rank}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.name}>{row.name}</Text>
              <Text style={styles.score}>{row.score} pts</Text>
            </View>
            {user.role === "host" ? (
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void award(row.userId, -5)}
                  style={styles.delta}
                >
                  <Text style={styles.deltaText}>−5</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void award(row.userId, 10)}
                  style={[styles.delta, styles.deltaUp]}
                >
                  <Text style={styles.deltaText}>+10</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1220" },
  login: { padding: 24, gap: 12, paddingTop: 72 },
  kicker: {
    color: "#e8c547",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: { color: "#f8f4ea", fontSize: 28, fontWeight: "700" },
  copy: { color: "#b7c0d3", fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: "#e8c547", borderColor: "#e8c547" },
  chipText: { color: "#e2e8f0", fontSize: 12 },
  chipTextOn: { color: "#0b1220", fontWeight: "700" },
  input: {
    backgroundColor: "#151d2e",
    color: "#f8f4ea",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#243049",
  },
  button: {
    backgroundColor: "#e8c547",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#0b1220", fontWeight: "700", fontSize: 16 },
  error: { color: "#fca5a5", fontSize: 13 },
  errorPad: { color: "#fca5a5", fontSize: 13, paddingHorizontal: 20 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  link: { color: "#94a3b8", fontSize: 13 },
  list: { padding: 16, gap: 10 },
  row: {
    backgroundColor: "#151d2e",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#243049",
  },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e8c547",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: "#0b1220", fontWeight: "800" },
  meta: { flex: 1 },
  name: { color: "#f8f4ea", fontSize: 16, fontWeight: "600" },
  score: { color: "#94a3b8", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  delta: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deltaUp: { backgroundColor: "#1f3d2b", borderColor: "#2f6b45" },
  deltaText: { color: "#f8f4ea", fontWeight: "700" },
});
