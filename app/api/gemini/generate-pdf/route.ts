import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { verifyIdToken } from "@/lib/auth";

const execFilePromise = promisify(execFile);

export async function POST(req: NextRequest) {
  const user = await verifyIdToken(req);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const { jobState } = await req.json();

    if (jobState) {
      const statePath = path.join(process.cwd(), "job_state.json");
      fs.writeFileSync(statePath, JSON.stringify(jobState, null, 2), "utf-8");
    }

    // Execute Python proposal compiler using execFile for container safety
    const scriptPath = path.join(process.cwd(), "compile_proposal.py");
    let stdout = "";
    let stderr = "";

    try {
      const res = await execFilePromise("python3", [scriptPath]);
      stdout = res.stdout;
      stderr = res.stderr;
    } catch (err: any) {
      // Fallback to "python" only if "python3" was not found (e.g. on Windows)
      if (err.code === "ENOENT" || err.syscall?.includes("spawn python3")) {
        const res = await execFilePromise("python", [scriptPath]);
        stdout = res.stdout;
        stderr = res.stderr;
      } else {
        throw err;
      }
    }

    console.log("Compile proposal output:", stdout);
    if (stderr) console.warn("Compile proposal stderr:", stderr);

    return NextResponse.json({
      success: true,
      stdout: stdout,
      message: "Proposal PDF compiled successfully",
    });
  } catch (error: any) {
    console.error("PDF generation route error:", error);
    return NextResponse.json({ error: error.message || "Failed compiling PDF" }, { status: 500 });
  }
}
