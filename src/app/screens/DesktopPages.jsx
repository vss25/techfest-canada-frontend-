import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

/* =========================================================
   /app on a computer (lib/desktopGate.js decides): the "made for
   your phone" page (DesktopGate), except /app/install, the install
   page (batch 7), which works on a computer too: it opens on
   "On a computer?" with the QR code to the page on the phone (the
   emails' "Get the app" buttons are often clicked on a computer).
========================================================= */

const DesktopGate = lazy(() => import("./DesktopGate"));
const Install = lazy(() => import("./Install"));

export default function DesktopPages() {
  useEffect(() => {
    const el = document.getElementById("boot-splash");
    if (el) { el.classList.add("is-done"); setTimeout(() => el.remove(), 300); }
  }, []);
  return (
    <BrowserRouter basename="/app/">
      <Suspense fallback={null}>
        <Routes>
          <Route path="/install" element={<Install />} />
          <Route path="*" element={<DesktopGate />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
