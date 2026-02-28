import { execSync } from "node:child_process";

const run = (cmd) => {
  execSync(cmd, { stdio: "inherit" });
};

run("npx prisma migrate deploy");
run("npx prisma generate");
