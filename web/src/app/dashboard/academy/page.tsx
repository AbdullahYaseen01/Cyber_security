"use client";

import { DashboardModule } from "@/components/modules/dashboard-module";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COURSES = [
  { title: "Advanced Penetration Testing", level: "Expert", duration: "12h" },
  { title: "Cloud Security Architecture", level: "Advanced", duration: "8h" },
  { title: "API Security Fundamentals", level: "Intermediate", duration: "6h" },
  { title: "SOC 2 Compliance Mastery", level: "Advanced", duration: "10h" },
  { title: "Red Team Operations", level: "Expert", duration: "16h" },
  { title: "Secure Code Review", level: "Intermediate", duration: "8h" },
];

export default function AcademyPage() {
  return (
    <DashboardModule moduleId="academy" title="QuantumShield Academy" description="Enterprise security training and certification">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COURSES.map((course) => (
          <Card key={course.title} className="hover:border-cyan-500/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">{course.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">{course.level} · {course.duration}</p>
              <p className="text-xs text-cyan-400 mt-3">Included with Enterprise plan</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardModule>
  );
}
