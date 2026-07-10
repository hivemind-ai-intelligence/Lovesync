import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter your username and password.");
      setShakeKey((k) => k + 1);
      return;
    }

    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (res) => {
          if (res.success && res.token) {
            setToken(res.token);
            setLocation("/");
          } else {
            setErrorMsg("Invalid credentials. Try again.");
            setShakeKey((k) => k + 1);
          }
        },
        onError: (err: unknown) => {
          // 401 from the server → wrong credentials
          const status = (err as { status?: number })?.status;
          if (status === 401) {
            setErrorMsg("Wrong username or password.");
          } else {
            setErrorMsg("Can't reach the server. Please try again.");
          }
          setShakeKey((k) => k + 1);
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,_hsl(280_60%_18%/0.35),_transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_70%,_hsl(220_60%_18%/0.2),_transparent)]" />
      </div>

      {/* Card — shakes on error */}
      <motion.div
        key={shakeKey}
        animate={
          shakeKey > 0
            ? { x: [0, -10, 10, -8, 8, -4, 4, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.45, ease: "easeInOut" }}
        className="z-10 w-full max-w-md mx-4"
      >
        <div className="glass-panel rounded-2xl p-8 border border-white/8">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-display font-light text-foreground mb-2 tracking-tight">
              OURROOM
            </h1>
            <p className="text-sm text-white/30 font-light">
              A private space to listen together.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-widest text-white/35">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg(null);
                }}
                autoComplete="off"
                spellCheck={false}
                className="w-full h-12 px-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-widest text-white/35">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full h-12 px-4 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors text-sm"
              />
            </div>

            {/* Animated inline error */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-sm text-destructive/90 bg-destructive/10 border border-destructive/20 rounded-xl px-3.5 py-2.5 overflow-hidden"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loginMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="w-full h-12 mt-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-primary/40 transition-all font-light tracking-widest text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Enter"
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
