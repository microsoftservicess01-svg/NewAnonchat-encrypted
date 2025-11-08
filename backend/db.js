import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import fs from "fs";
import crypto from "crypto";
import process from "process";

let db;
const ENC_FILE = './users.db.enc';
const RAW_FILE = './users.db';
const ALGO = 'aes-256-gcm';

function getKey() {
  const k = process.env.DB_KEY || 'default_test_key_please_change';
  // derive 32 bytes key
  return crypto.createHash('sha256').update(k).digest();
}

export async function initDB(){
  // if encrypted file exists, decrypt to RAW_FILE
  if(fs.existsSync(ENC_FILE)){
    const data = fs.readFileSync(ENC_FILE);
    const iv = data.slice(0,12);
    const tag = data.slice(12,28);
    const cipherText = data.slice(28);
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    fs.writeFileSync(RAW_FILE, plain);
  }
  db = await open({ filename: RAW_FILE, driver: sqlite3.Database });
  await db.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)');
}

export async function registerUser(username, password){
  const hashed = await bcrypt.hash(password, 10);
  await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);
  return { username };
}

export async function authenticateUser(username, password){
  const user = await db.get('SELECT * FROM users WHERE username = ?', username);
  if(!user) return false;
  return await bcrypt.compare(password, user.password);
}

export async function closeAndEncryptDB(){
  if(!db) return;
  await db.close();
  // read raw file and encrypt to ENC_FILE
  const data = fs.readFileSync(RAW_FILE);
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, tag, ct]);
  fs.writeFileSync(ENC_FILE, out);
  fs.unlinkSync(RAW_FILE);
}
