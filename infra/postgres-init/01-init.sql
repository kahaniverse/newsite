-- Runs once when the postgres volume is first created.
-- Creates the test database and ensures the pgcrypto extension is available
-- in both databases (it provides gen_random_uuid() on older PG; built-in on PG 13+).

CREATE DATABASE kahaniverse_test;

\c kahaniverse_dev
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\c kahaniverse_test
CREATE EXTENSION IF NOT EXISTS pgcrypto;
