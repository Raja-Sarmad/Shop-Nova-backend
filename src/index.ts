import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

export default app;
