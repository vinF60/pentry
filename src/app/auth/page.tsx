"use client";
import React, { useState } from "react";
import styles from "./auth.module.css";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
// import SHA256 from "crypto-js/sha256";

interface formData {
  email: string;
  password: string;
}

function shuffleString(input: string): string {
  const chars = input.split("");
  let seed = 0;
  for (const ch of input) {
    seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  }
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const AuthPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<formData>({
    email: "",
    password: "",
  });
  const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, name } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


const handleFormSignin = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();

  const systemEmail = process.env.NEXT_PUBLIC_API_EMAIL!;
  const systemPassword = process.env.NEXT_PUBLIC_API_PASSWORD!;

  if (
    formData.email === systemEmail &&
    formData.password === systemPassword
  ) {
    const emailHash =  shuffleString(systemEmail);
    const passwordHash =  shuffleString(systemPassword);

    Cookies.set("email", emailHash, {
      expires: 1,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    });

    Cookies.set("password", passwordHash, {
      expires: 1,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    });

    router.push("/");
  } else {
    alert("Invalid credentials");
  }
};

  return (
    <div className={styles.authPageContainer}>
      {/* Branding Header Logo */}
      <div className={styles.logoHeader}>
        <h2 className={styles.logoText}>
          Pipex<span className={styles.logoHighlight}>.pentry</span>
        </h2>
      </div>

      {/* Main Container Card split in two halves */}
      <div className={styles.authFormContainer}>
        {/* Left Side: interactive Login Form */}
        <form className={styles.formSection} onSubmit={handleFormSignin}>
          <h1 className={styles.title}>Sign in to your account</h1>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              Email Address
            </label>
            <input
              className={styles.input}
              type="email"
              name="email"
              id="email"
              value={formData.email}
              placeholder="name@company.com"
              required
              onChange={inputHandler}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              className={styles.input}
              type="password"
              name="password"
              value={formData.password}
              id="password"
              placeholder="Enter your password"
              required
              onChange={inputHandler}
            />
          </div>

          <button type="submit" className={styles.signinBtn}>
            Sign In Securely
          </button>
        </form>

        {/* Right Side: Modern Minimal Dashboard Preview widget */}
        <div className={styles.previewSection}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>System Status</div>
            <div className={styles.previewRow}>
              <span>Pentry Node</span>
              <div className={styles.statusIndicator}>
                <span className={styles.dot}></span>
                <span style={{ color: "#10b981" }}>Active</span>
              </div>
            </div>
            <div className={styles.previewRow}>
              <span>Pipeline Health</span>
              <span style={{ color: "#3b82f6" }}>Optimal</span>
            </div>
            <div className={styles.previewRow}>
              <span style={{ color: "#475569" }}>Last Check-in: Just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
