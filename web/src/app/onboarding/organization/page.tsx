"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Building2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { slugify } from "@/lib/utils";

const orgSchema = z.object({
  name: z.string().min(3, "Name must be 3-50 characters").max(50),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});

type OrgForm = z.infer<typeof orgSchema>;

export default function OrganizationOnboardingPage() {
  const router = useRouter();
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: "", slug: "" },
  });

  const name = watch("name");
  const slug = watch("slug");

  useEffect(() => {
    if (name && !slug) {
      setValue("slug", slugify(name));
    }
  }, [name, slug, setValue]);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const res = await fetch(`/api/organizations?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugAvailable(data.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  async function onSubmit(data: OrgForm) {
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error ?? "Failed to create organization");
      return;
    }

    toast.success("Organization created!");
    router.push("/onboarding/subscription");
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Step 1 of 2</p>
                <CardTitle>Create Your Organization</CardTitle>
              </div>
            </div>
            <CardDescription>
              Set up your workspace. You can invite team members after subscribing.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Acme Security Corp"
                  className="mt-1"
                />
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    quantumshield.io/
                  </span>
                  <Input
                    id="slug"
                    {...register("slug")}
                    className="pl-[130px] pr-10"
                    placeholder="acme-security"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingSlug ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : slugAvailable === true ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : slugAvailable === false ? (
                      <X className="w-4 h-4 text-red-400" />
                    ) : null}
                  </div>
                </div>
                {errors.slug && (
                  <p className="text-xs text-red-400 mt-1">{errors.slug.message}</p>
                )}
                {slugAvailable === false && (
                  <p className="text-xs text-red-400 mt-1">This slug is already taken</p>
                )}
              </div>

              <Button
                type="submit"
                variant="glow"
                className="w-full"
                disabled={isSubmitting || slugAvailable === false}
              >
                {isSubmitting ? "Creating..." : "Continue to Subscription"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
