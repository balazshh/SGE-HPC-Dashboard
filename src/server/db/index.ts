import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import { env } from "../config/env";
import * as schema from "./schema";

const pool = mysql.createPool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  connectionLimit: 5,
});

const db = drizzle(pool, { schema, mode: "default" });

export function createDb() {
  return db;
}
