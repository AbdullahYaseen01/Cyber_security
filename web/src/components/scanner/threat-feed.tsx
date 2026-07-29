"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, type Severity } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ThreatEvent {
  id: number | string;
  timestamp?: string;
  url?: string;
  parameter?: string;
  vuln_type?: string;
  type?: string;
  severity?: Severity | string;
  confidence?: number;
  title?: string;
}

interface ThreatFeedProps {
  events: ThreatEvent[];
  paused?: boolean;
  className?: string;
}

export function ThreatFeed({ events, paused = false, className }: ThreatFeedProps) {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && !paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isPaused, paused]);

  return (
    <div
      className={cn("flex flex-col h-full", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Live Threat Feed</h3>
        {isPaused && <span className="text-xs text-amber-400 font-mono">PAUSED</span>}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Awaiting scan events...</p>
          ) : (
            events.map((evt) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge severity={(evt.severity as Severity) ?? "INFO"}>
                    {evt.severity ?? "INFO"}
                  </Badge>
                  {evt.confidence !== undefined && (
                    <span className="text-slate-500">{evt.confidence}% conf</span>
                  )}
                  <span className="text-slate-600 ml-auto">
                    {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ""}
                  </span>
                </div>
                <p className="text-slate-200 truncate">{evt.title ?? evt.vuln_type ?? evt.type}</p>
                {evt.url && <p className="text-cyan-500/70 truncate mt-0.5">{evt.url}</p>}
                {evt.parameter && <p className="text-purple-400/70">param: {evt.parameter}</p>}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
