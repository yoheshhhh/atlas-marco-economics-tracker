import React, { useState } from "react";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

import DnaParticleBackdrop from "@/components/auth/DnaParticleBackdrop";
import AtlasMark from "@/components/brand/AtlasMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";

const LOGIN_DEFAULTS = {
  email: "",
  password: "",
};

const SIGNUP_DEFAULTS = {
  full_name: "",
  email: "",
  password: "",
};

export default function AuthScreen() {
  const { login, signup, authError } = useAuth();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(LOGIN_DEFAULTS);
  const [signupForm, setSignupForm] = useState(SIGNUP_DEFAULTS);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const runAction = async (action, work) => {
    setBusyAction(action);
    setErrorMessage("");
    try {
      await work();
    } catch (error) {
      setErrorMessage(error?.message || "Authentication failed.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="atlas-app-shell relative min-h-screen overflow-hidden text-zinc-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-26%] left-[-18%] h-[620px] w-[620px] rounded-full bg-white/[0.03] blur-[155px] drift-slow" />
        <div
          className="absolute bottom-[-24%] right-[-16%] h-[560px] w-[560px] rounded-full bg-white/[0.025] blur-[135px] drift-slow"
          style={{ animationDelay: "-7s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_35%,rgba(255,255,255,0.025),transparent_48%)]" />
      </div>

      <DnaParticleBackdrop />

      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-5">
        <AtlasBrandLockup />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-[10vh] sm:px-6">
        <div className="w-full max-w-[380px]">
          <AuthPanel
            mode={mode}
            setMode={setMode}
            loginForm={loginForm}
            setLoginForm={setLoginForm}
            signupForm={signupForm}
            setSignupForm={setSignupForm}
            busyAction={busyAction}
            runAction={runAction}
            login={login}
            signup={signup}
            errorMessage={errorMessage || authError}
          />
        </div>
      </div>
    </div>
  );
}

function AuthPanel({
  mode,
  setMode,
  loginForm,
  setLoginForm,
  signupForm,
  setSignupForm,
  busyAction,
  runAction,
  login,
  signup,
  errorMessage,
}) {
  return (
    <section className="w-full">
      <div className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.04] p-1">
        <ModeButton active={mode === "login"} onClick={() => setMode("login")} icon={LogIn} label="Log In" />
        <ModeButton active={mode === "signup"} onClick={() => setMode("signup")} icon={UserPlus} label="Sign Up" />
      </div>

      <div className="mt-3.5 rounded-[22px] border border-white/10 bg-white/[0.03] p-4 sm:p-[18px]">
        {mode === "login" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              runAction("login", () => login(loginForm));
            }}
          >
            <FieldLabel label="Email" />
            <StyledInput
              type="email"
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@atlasintel.com"
              autoComplete="email"
            />
            <FieldLabel label="Password" />
            <StyledInput
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              className="mt-1.5 h-11 w-full rounded-[18px] bg-zinc-50 text-[15px] font-semibold text-zinc-950 hover:bg-white"
              disabled={busyAction !== ""}
            >
              {busyAction === "login" ? "Signing In..." : "Log In"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              runAction("signup", () => signup(signupForm));
            }}
          >
            <FieldLabel label="Full name" />
            <StyledInput
              type="text"
              value={signupForm.full_name}
              onChange={(event) => setSignupForm((current) => ({ ...current, full_name: event.target.value }))}
              placeholder="Atlas Analyst"
              autoComplete="name"
            />
            <FieldLabel label="Email" />
            <StyledInput
              type="email"
              value={signupForm.email}
              onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@atlasintel.com"
              autoComplete="email"
            />
            <FieldLabel label="Password" />
            <StyledInput
              type="password"
              value={signupForm.password}
              onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            <Button
              type="submit"
              className="mt-1.5 h-11 w-full rounded-[18px] bg-zinc-50 text-[15px] font-semibold text-zinc-950 hover:bg-white"
              disabled={busyAction !== ""}
            >
              {busyAction === "signup" ? "Creating Account..." : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AtlasBrandLockup() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3.5 py-2 backdrop-blur-md">
      <AtlasMark className="h-7 w-7 shrink-0 drop-shadow-[0_0_14px_rgba(255,255,255,0.12)]" />
      <span className="text-[0.95rem] font-semibold tracking-[0.32em] text-zinc-100 sm:text-[1.02rem]">ATLAS</span>
    </div>
  );
}

function ModeButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-[15px] px-3.5 py-2.5 text-sm font-semibold transition ${
        active ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FieldLabel({ label }) {
  return <label className="block text-sm font-medium text-zinc-300">{label}</label>;
}

function StyledInput(props) {
  return (
    <Input
      {...props}
      className="mt-2 h-11 rounded-[18px] border-white/10 bg-black/35 px-4 text-base text-zinc-50 placeholder:text-zinc-500 focus-visible:ring-white/40"
    />
  );
}
