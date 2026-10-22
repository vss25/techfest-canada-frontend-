import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./lib/store";
import { auth, loadAccount } from "./lib/auth";
import { cms, refreshCMS, roomOf } from "./lib/cms";
import { refreshContent } from "./lib/content";
import { refreshOrganisations } from "./lib/orgs";
import { bookmarks, social, startSocial, stopSocial, chatsHasNew } from "./lib/social";
import TabBar from "./components/TabBar";
import { FEATURES } from "./lib/config";
import { ToastHost, Spinner } from "./components/ui";
import ShareSheetHost from "./components/ShareSheet";
import PassesSheet from "./components/PassesSheet";
import { myCard, profileTabDot } from "./lib/myCard";
import { InstallNudges, OfflineBar, UpdatePrompt } from "./components/AppNotices";
import LivePollPill from "./components/LivePollPill";
import { showAlert } from "./lib/ui";
import { onScreenChange } from "./lib/pwa";
import { listenForNotificationTaps, syncNotifications } from "./lib/webpush";

/* =========================================================
   The TTFC attendee app at /app/ (installable PWA).
   Five tabs like the iOS app: Home · Network · Chats ·
   Schedule · Profile. Signed out → the sign-in screen (guests
   can browse the agenda and speakers).
========================================================= */

const Login = lazy(() => import("./screens/Login"));
const Home = lazy(() => import("./screens/Home"));
const Notifications = lazy(() => import("./screens/Notifications"));
const Schedule = lazy(() => import("./screens/Schedule"));
const SessionDetail = lazy(() => import("./screens/SessionDetail"));
const SessionLive = lazy(() => import("./screens/SessionLive"));
const Network = lazy(() => import("./screens/Network"));
const PersonProfile = lazy(() => import("./screens/PersonProfile"));
const SpeakerDetail = lazy(() => import("./screens/SpeakerDetail"));
const Organisations = lazy(() => import("./screens/Organisations"));
const Chats = lazy(() => import("./screens/Chats"));
const ChatThread = lazy(() => import("./screens/ChatThread"));
const GroupDetail = lazy(() => import("./screens/GroupDetail"));
const DiscussionDetail = lazy(() => import("./screens/DiscussionDetail"));
const Profile = lazy(() => import("./screens/Profile"));
const EditProfile = lazy(() => import("./screens/EditProfile"));
const Availability = lazy(() => import("./screens/Availability"));
const NotificationSettings = lazy(() => import("./screens/NotificationSettings"));
const Pass = lazy(() => import("./screens/Pass"));
const Install = lazy(() => import("./screens/Install"));
const Legal = lazy(() => import("./screens/Legal"));
const PostPage = lazy(() => import("./screens/PostPage"));
const Points = lazy(() => import("./screens/Points"));
const Awards = lazy(() => import("./screens/Awards"));
const AwardApplications = lazy(() => import("./screens/AwardApplications"));

/** Pages that fill the screen with their own composer: no tab bar. */
const NO_TABS = [/^\/chat\//, /^\/group\//, /^\/discussion\//, /^\/session\/[^/]+\/live/, /^\/install/, /^\/login/];

function Boot() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useStore(auth);

  // Agenda, speakers, attending organisations, app switches: for everyone, guests included.
  useEffect(() => {
    refreshCMS();
    refreshContent();
    const onVisible = () => { if (document.visibilityState === "visible") { refreshCMS(); refreshContent(); refreshOrganisations(); } };
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(() => refreshCMS(), 5 * 60 * 1000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(t); };
  }, []);

  // Signed in: account + the social layer (feed, people, chats…) and, when they're on, message notifications.
  // The organisations list differs in the demo (lib/orgs.js): read it again when the mode changes.
  useEffect(() => { refreshOrganisations({ force: true }); }, [mode]);

  useEffect(() => {
    if (mode === "user" || mode === "demo") {
      loadAccount();
      startSocial();
      syncNotifications();
      return () => stopSocial();
    }
    return undefined;
  }, [mode]);

  // A tap on a message notification while the app is open: straight to that chat.
  useEffect(() => listenForNotificationTaps(navigate), [navigate]);

  // /app/?install=1 (from the website's prompt) → the guide.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("install") === "1" && !location.pathname.startsWith("/install")) {
      navigate(`/install?from=${encodeURIComponent(q.get("from") || "link")}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  // New times from the admin panel (iOS MainTabView.agendaTimesChanged): tell people about their saved sessions.
  const { timesVersion, lastMoved } = useStore(cms);
  useEffect(() => {
    if (!timesVersion) return;
    const saved = bookmarks(social.get());
    const mine = cms.get().sessions.filter((x) => lastMoved.includes(x.id) && saved.includes(x.id) && x.start > Date.now()).slice(0, 3);
    for (const x of mine) { const room = roomOf(x.stage); showAlert(`New time: ${x.title}`, `Now ${x.startTime} to ${x.endTime}${room ? ` · ${room}` : ""}`, { ms: 8000 }); }
  }, [timesVersion, lastMoved]);

  // Scroll to top on page changes (not on tab-internal state); a quiet moment for a waiting update.
  useEffect(() => { window.scrollTo(0, 0); onScreenChange(); }, [location.pathname]);
  return null;
}

/** Fades out the launch screen from app/index.html once a real screen has rendered. */
function hideSplash() {
  const el = document.getElementById("boot-splash");
  if (!el || el.classList.contains("is-done")) return;
  el.classList.add("is-done");
  setTimeout(() => { el.remove(); if (!document.querySelector(".login")) document.documentElement.classList.remove("dark-ground"); }, 300);
}
function SplashDone() {
  useEffect(() => { requestAnimationFrame(hideSplash); }, []);
  return null;
}

function Shell() {
  const { mode } = useStore(auth);
  const s = useStore(social);
  const mc = useStore(myCard);
  const { pathname } = useLocation();
  const signedOut = mode === "out";
  const publicPage = /^\/(install|legal|login)/.test(pathname);

  if (signedOut && !publicPage) {
    return (
      <Suspense fallback={<Spinner />}>
        <Login />
        <SplashDone />
      </Suspense>
    );
  }

  const showTabs = !signedOut && !NO_TABS.some((re) => re.test(pathname));
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="backdrop" aria-hidden="true" />
      <OfflineBar />
      <Suspense fallback={<div className="page"><Spinner /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/session/:id" element={<SessionDetail />} />
          <Route path="/session/:id/live" element={<SessionLive />} />
          <Route path="/network" element={<Network />} />
          <Route path="/network/:section" element={<Network />} />
          <Route path="/people/:id" element={<PersonProfile />} />
          <Route path="/speakers/:id" element={<SpeakerDetail />} />
          <Route path="/organisations" element={<Organisations />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/chats/:section" element={<Chats />} />
          <Route path="/chat/:userId" element={<ChatThread />} />
          <Route path="/group/:id" element={<GroupDetail />} />
          <Route path="/discussion/:id" element={<DiscussionDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/profile/availability" element={<Availability />} />
          <Route path="/profile/notifications" element={<NotificationSettings />} />
          <Route path="/profile/pass" element={<Pass />} />
          <Route path="/points" element={<Points />} />
          <Route path="/awards" element={<Awards />} />
          <Route path="/awards/applications" element={<AwardApplications />} />
          <Route path="/install" element={<Install />} />
          <Route path="/legal/:doc" element={<Legal />} />
          <Route path="/login" element={signedOut ? <Login /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SplashDone />
      </Suspense>
      {showTabs && <TabBar chatsDot={FEATURES.chats && chatsHasNew(s)} profileDot={(mode === "user" || mode === "demo") && profileTabDot(mc)} />}
      {!signedOut && <InstallNudges />}
      <UpdatePrompt />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/app/">
      <Boot />
      <Shell />
      <ShareSheetHost />
      <PassesSheet />
      <ToastHost />
    </BrowserRouter>
  );
}
