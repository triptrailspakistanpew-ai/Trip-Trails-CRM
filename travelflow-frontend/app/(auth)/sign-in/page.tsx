"use client";

import { Eye, EyeOff, Plane } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--tf-bg)] p-4 text-tf-text-primary">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(var(--tf-text-primary) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="z-10 w-full max-w-[480px] rounded-2xl bg-tf-surface p-8 sm:p-10 shadow-[var(--shadow-xl)] border border-tf-border">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-tf-primary text-white shadow-md">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="tf-h2 mb-2 text-tf-text-primary">TravelFlow</h1>
          <p className="tf-body text-tf-text-secondary">
            The Operating System for Modern Travel Agencies
          </p>
        </div>

        {/* Form */}
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="email"
              className="tf-caption font-semibold text-tf-text-primary normal-case tracking-normal"
            >
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@agency.com"
              className="rounded-md border-tf-border bg-tf-surface focus-visible:ring-[var(--tf-primary)] placeholder:text-tf-text-muted normal-case tracking-normal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="tf-caption font-semibold text-tf-text-primary normal-case tracking-normal"
              >
                Password
              </Label>
              <Link
                href="#"
                className="tf-caption text-tf-primary hover:text-[var(--tf-primary-hover)]"
              >
                Forgot password?
              </Link>
            </div>
            <InputGroup className="rounded-md border border-tf-border bg-tf-surface focus-within:ring-1 focus-within:ring-[var(--tf-primary)]">
              <InputGroupInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="normal-case tracking-normal placeholder:text-tf-text-muted"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Checkbox id="remember" />
            <Label
              htmlFor="remember"
              className="tf-body-sm text-tf-text-secondary font-normal normal-case tracking-normal"
            >
              Remember me for 30 days
            </Label>
          </div>

          <Button
            type="submit"
            className="mt-2 w-full bg-tf-primary py-3 text-white hover:bg-tf-primary-hover normal-case tracking-normal"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="tf-body-sm text-tf-text-secondary">
            Don&apos;t have an account?{" "}
            <Link
              href="#"
              className="font-semibold text-tf-primary hover:text-[var(--tf-primary-hover)]"
            >
              Contact your agency admin
            </Link>
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 text-center">
        <p className="tf-caption text-tf-text-muted">
          © 2026 TravelFlow · thekhubaib.me
        </p>
      </div>
    </div>
  );
}
